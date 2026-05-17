/*
GET /api/team-reports/export — собирает данные команды и проксирует их
во внешний report_service (Python) для рендера в DOCX.

Параметры:
    teamId      (обязательный)
    sprintId    (один спринт; обязательный, если sprintIds не задан)
    sprintIds   (CSV: «1,2,3»; перебивает sprintId — выгружает один DOCX
                со всеми спринтами подряд, page break между ними)
    kind=team|student   default=team
    studentId   (обязательный при kind=student; для multi не поддерживается)

Аутентификация: mentor + coordinator.

Если REPORT_SERVICE_URL не задан — отдаём 503 (фронт покажет «отчётный
сервис недоступен»).
*/
package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/hsse/project-service/internal/auth"
	"github.com/hsse/project-service/internal/httputil"
	"github.com/hsse/project-service/internal/models"
	"github.com/hsse/project-service/internal/repository"
)

type TeamReportExportHandler struct {
	teams        repository.TeamRepositoryInterface
	projects     repository.ProjectRepositoryInterface
	users        repository.UserRepositoryInterface
	sprints      repository.SprintRepositoryInterface
	tasks        repository.TaskRepositoryInterface
	teamReports  repository.TeamReportRepositoryInterface
	sprintScores repository.SprintScoreRepositoryInterface
	meetings     repository.MeetingRepositoryInterface

	rendererURL string // empty → 503
	httpClient  *http.Client
}

func NewTeamReportExportHandler(
	teams repository.TeamRepositoryInterface,
	projects repository.ProjectRepositoryInterface,
	users repository.UserRepositoryInterface,
	sprints repository.SprintRepositoryInterface,
	tasks repository.TaskRepositoryInterface,
	teamReports repository.TeamReportRepositoryInterface,
	sprintScores repository.SprintScoreRepositoryInterface,
	meetings repository.MeetingRepositoryInterface,
	rendererURL string,
) *TeamReportExportHandler {
	return &TeamReportExportHandler{
		teams:        teams,
		projects:     projects,
		users:        users,
		sprints:      sprints,
		tasks:        tasks,
		teamReports:  teamReports,
		sprintScores: sprintScores,
		meetings:     meetings,
		rendererURL:  strings.TrimRight(rendererURL, "/"),
		httpClient:   &http.Client{Timeout: 30 * time.Second},
	}
}

func (h *TeamReportExportHandler) Export(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	if !user.HasAnyRole(auth.RoleMentor, auth.RoleCoordinator) {
		httputil.RespondError(w, http.StatusForbidden, "forbidden")
		return
	}
	if h.rendererURL == "" {
		httputil.RespondError(w, http.StatusServiceUnavailable, "report renderer not configured")
		return
	}

	teamID := httputil.ParseQueryInt(r, "teamId", 0)
	if teamID <= 0 {
		httputil.RespondError(w, http.StatusBadRequest, "teamId is required")
		return
	}
	kind := httputil.ParseQueryString(r, "kind")
	if kind == "" {
		kind = "team"
	}
	if kind != "team" && kind != "student" {
		httputil.RespondError(w, http.StatusBadRequest, "kind must be team or student")
		return
	}
	studentID := httputil.ParseQueryInt(r, "studentId", 0)
	if kind == "student" && studentID <= 0 {
		httputil.RespondError(w, http.StatusBadRequest, "studentId is required for kind=student")
		return
	}

	sprintIDs, err := parseSprintIDs(r)
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	if len(sprintIDs) == 0 {
		httputil.RespondError(w, http.StatusBadRequest, "sprintId or sprintIds is required")
		return
	}
	if kind == "student" && len(sprintIDs) > 1 {
		httputil.RespondError(w, http.StatusBadRequest, "multi-sprint export not supported for kind=student")
		return
	}

	// Один спринт → /render/team или /render/student.
	// Несколько спринтов → /render/team/multi (один файл, page break между).
	var (
		blob     []byte
		filename string
	)
	if len(sprintIDs) == 1 {
		data, members, aggErr := h.aggregate(r.Context(), teamID, sprintIDs[0])
		if aggErr != nil {
			respondServiceError(w, aggErr)
			return
		}
		rendererPath := "/render/team"
		if kind == "student" {
			idx := -1
			for i, m := range members {
				if m.UserID == studentID {
					idx = i
					break
				}
			}
			if idx < 0 {
				httputil.RespondError(w, http.StatusBadRequest, "studentId not in team")
				return
			}
			rendererPath = fmt.Sprintf("/render/student?studentIndex=%d", idx)
		}
		blob, err = h.callRenderer(r.Context(), rendererPath, data)
		if err != nil {
			httputil.RespondError(w, http.StatusBadGateway, "report renderer error: "+err.Error())
			return
		}
		sprintNum := sprintNumberFromData(data)
		if kind == "student" {
			filename = fmt.Sprintf("sprint_report_%d_student%d.docx", sprintNum, studentID)
		} else {
			filename = fmt.Sprintf("sprint_report_%d_team%d.docx", sprintNum, teamID)
		}
	} else {
		sprints := make([]map[string]any, 0, len(sprintIDs))
		for _, sid := range sprintIDs {
			data, _, aggErr := h.aggregate(r.Context(), teamID, sid)
			if aggErr != nil {
				respondServiceError(w, aggErr)
				return
			}
			sprints = append(sprints, data)
		}
		blob, err = h.callRenderer(r.Context(), "/render/team/multi", map[string]any{
			"sprints": sprints,
		})
		if err != nil {
			httputil.RespondError(w, http.StatusBadGateway, "report renderer error: "+err.Error())
			return
		}
		filename = fmt.Sprintf("sprint_report_team%d_all.docx", teamID)
	}

	w.Header().Set("Content-Type",
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document")
	w.Header().Set("Content-Disposition", `attachment; filename="`+filename+`"`)
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(blob)))
	if _, err := w.Write(blob); err != nil {
		// клиент уже отвалился — логировать смысла нет
		return
	}
}

// aggregate собирает словарь, совместимый с EXAMPLE_DATA в build_sprint_report.py.
// Второй возвращаемый параметр — упорядоченный список членов команды (для
// маппинга studentId → studentIndex при рендере индивидуального отчёта).
func (h *TeamReportExportHandler) aggregate(
	ctx context.Context, teamID, sprintID int,
) (map[string]any, []models.TeamMember, error) {
	team, err := h.teams.GetByID(ctx, teamID)
	if err != nil {
		return nil, nil, err
	}
	project, err := h.projects.GetByID(ctx, team.ProjectID)
	if err != nil {
		return nil, nil, err
	}
	mentor, err := h.users.GetByID(ctx, project.MentorID)
	if err != nil {
		return nil, nil, err
	}
	sprint, err := h.sprints.GetByID(ctx, sprintID)
	if err != nil {
		return nil, nil, err
	}

	tasks, err := h.tasks.GetList(ctx, repository.TaskFilters{
		TeamID:   teamID,
		SprintID: sprintID,
	})
	if err != nil {
		return nil, nil, err
	}
	allMeetings, err := h.meetings.GetByTeamID(ctx, teamID, false)
	if err != nil {
		return nil, nil, err
	}
	// фильтр встреч по датам спринта (включительно)
	meetings := make([]models.Meeting, 0, len(allMeetings))
	for _, m := range allMeetings {
		if m.MeetingDate >= sprint.StartDate && m.MeetingDate <= sprint.EndDate {
			meetings = append(meetings, m)
		}
	}
	scores, err := h.sprintScores.GetBySprintAndTeam(ctx, sprintID, teamID)
	if err != nil {
		return nil, nil, err
	}
	// одна оценка ментора на студента (приоритет: category=mentor)
	scoreByStudent := map[int]models.SprintScore{}
	for _, s := range scores {
		if s.Category == models.SprintScoreCategoryMentor {
			scoreByStudent[s.StudentID] = s
		}
	}
	for _, s := range scores {
		if _, ok := scoreByStudent[s.StudentID]; !ok {
			scoreByStudent[s.StudentID] = s
		}
	}

	teamReport, err := h.teamReports.GetByTeamAndSprint(ctx, teamID, sprintID)
	if err != nil && !strings.Contains(err.Error(), "not found") {
		return nil, nil, err
	}

	leaderName := "—"
	if team.Leader != nil {
		leaderName = formatFullName(team.Leader.LastName, team.Leader.FirstName, "")
	}

	teamMembersOrdered := make([]models.TeamMember, len(team.Members))
	copy(teamMembersOrdered, team.Members)
	sort.SliceStable(teamMembersOrdered, func(i, j int) bool {
		// тимлид первым, затем по фамилии
		if teamMembersOrdered[i].IsLeader != teamMembersOrdered[j].IsLeader {
			return teamMembersOrdered[i].IsLeader
		}
		return teamMembersOrdered[i].User.LastName < teamMembersOrdered[j].User.LastName
	})

	membersDict := make([]map[string]any, 0, len(teamMembersOrdered))
	for _, m := range teamMembersOrdered {
		full := formatFullName(m.User.LastName, m.User.FirstName, "")
		role := m.RoleInTeam
		if m.IsLeader {
			if role != "" {
				role += ", тимлид"
			} else {
				role = "Тимлид"
			}
		}
		membersDict = append(membersDict, map[string]any{
			"full_name":    full,
			"role_in_team": role,
		})
	}

	// members_with_tasks
	tasksByAssignee := map[int][]models.Task{}
	for _, t := range tasks {
		tasksByAssignee[t.AssigneeID] = append(tasksByAssignee[t.AssigneeID], t)
	}
	mwt := make([]map[string]any, 0, len(teamMembersOrdered))
	for _, m := range teamMembersOrdered {
		role := m.RoleInTeam
		if m.IsLeader {
			if role != "" {
				role += ", тимлид"
			} else {
				role = "Тимлид"
			}
		}
		full := formatFullName(m.User.LastName, m.User.FirstName, "")

		memberTasks := make([]map[string]any, 0)
		for _, t := range tasksByAssignee[m.UserID] {
			memberTasks = append(memberTasks, map[string]any{
				"name":             t.Name,
				"status":           string(t.Status),
				"hours_estimate":   t.HoursEstimate,
				"start_date":       formatDateShort(t.StartDate),
				"end_date":         formatDateShort(t.EndDate),
				"mr_link":          t.MRLink,
				"work_description": t.WorkDescription,
			})
		}

		score := scoreByStudent[m.UserID]
		mwt = append(mwt, map[string]any{
			"full_name":    full,
			"role_in_team": role,
			"tasks":        memberTasks,
			"sprint_score": map[string]any{
				"score":   score.Score,
				"comment": score.Comment,
			},
		})
	}

	// meetings dict
	meetingsDict := make([]map[string]any, 0, len(meetings))
	for _, mt := range meetings {
		meetingsDict = append(meetingsDict, map[string]any{
			"meeting_date":     formatDateLongRu(mt.MeetingDate),
			"start_time":       mt.StartTime,
			"title":            mt.Title,
			"duration_minutes": mt.DurationMinutes,
			"summary":          mt.Summary,
		})
	}

	tr := map[string]any{
		"summary":        "",
		"problems":       "",
		"next_plan":      "",
		"mentor_comment": "",
	}
	if teamReport != nil {
		tr["summary"] = teamReport.Summary
		tr["problems"] = teamReport.Problems
		tr["next_plan"] = teamReport.NextPlan
		tr["mentor_comment"] = teamReport.MentorComment
	}

	data := map[string]any{
		"project": map[string]any{
			"title":   project.Title,
			"company": project.Company,
			"mentor":  formatFullName(mentor.LastName, mentor.FirstName, mentor.MiddleName),
		},
		"team": map[string]any{
			"name":    team.Name,
			"leader":  leaderName,
			"members": membersDict,
		},
		"sprint": map[string]any{
			"number":     sprint.Number,
			"start_date": formatDateLongRu(sprint.StartDate),
			"end_date":   formatDateLongRu(sprint.EndDate),
		},
		"report": map[string]any{
			"generated_at": time.Now().Format("02.01.2006"),
		},
		"team_report":         tr,
		"members_with_tasks":  mwt,
		"meetings":            meetingsDict,
	}
	return data, teamMembersOrdered, nil
}

func (h *TeamReportExportHandler) callRenderer(
	ctx context.Context, path string, data map[string]any,
) ([]byte, error) {
	body, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(
		ctx, http.MethodPost, h.rendererURL+path, bytes.NewReader(body),
	)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := h.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("connect: %w", err)
	}
	defer resp.Body.Close()
	buf, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(buf))
	}
	return buf, nil
}

// parseSprintIDs читает sprintIds (CSV, перебивает sprintId) или sprintId,
// возвращает упорядоченный список с удалёнными дубликатами и нулями.
func parseSprintIDs(r *http.Request) ([]int, error) {
	csv := httputil.ParseQueryString(r, "sprintIds")
	if csv != "" {
		parts := strings.Split(csv, ",")
		seen := make(map[int]bool, len(parts))
		out := make([]int, 0, len(parts))
		for _, p := range parts {
			p = strings.TrimSpace(p)
			if p == "" {
				continue
			}
			n, err := strconv.Atoi(p)
			if err != nil || n <= 0 {
				return nil, fmt.Errorf("invalid sprintIds entry: %q", p)
			}
			if !seen[n] {
				seen[n] = true
				out = append(out, n)
			}
		}
		return out, nil
	}
	if single := httputil.ParseQueryInt(r, "sprintId", 0); single > 0 {
		return []int{single}, nil
	}
	return nil, nil
}

func sprintNumberFromData(data map[string]any) int {
	sprint, _ := data["sprint"].(map[string]any)
	if sprint == nil {
		return 0
	}
	if v, ok := sprint["number"].(int); ok {
		return v
	}
	return 0
}

func formatFullName(last, first, middle string) string {
	parts := make([]string, 0, 3)
	if last != "" {
		parts = append(parts, last)
	}
	if first != "" {
		parts = append(parts, first)
	}
	if middle != "" {
		parts = append(parts, middle)
	}
	if len(parts) == 0 {
		return "—"
	}
	return strings.Join(parts, " ")
}

// formatDateShort: ISO YYYY-MM-DD → "DD.MM" (для таблиц задач).
func formatDateShort(iso string) string {
	t, err := time.Parse("2006-01-02", iso)
	if err != nil {
		return iso
	}
	return t.Format("02.01")
}

// formatDateLongRu: ISO YYYY-MM-DD → "DD.MM.YYYY".
func formatDateLongRu(iso string) string {
	t, err := time.Parse("2006-01-02", iso)
	if err != nil {
		return iso
	}
	return t.Format("02.01.2006")
}
