package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/hsse/project-service/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

// MentorDashboardRepository assembles the read-only aggregate that powers
// GET /api/mentor/dashboard. Lives separately from ProjectRepository so the
// big GetList query stays focused on filter/pagination and the aggregate
// stays focused on multi-table fanout.
type MentorDashboardRepository struct {
	db *pgxpool.Pool
}

func NewMentorDashboardRepository(db *pgxpool.Pool) *MentorDashboardRepository {
	return &MentorDashboardRepository{db: db}
}

// GetForMentor returns one card per active project (Активный, Опубликован,
// Утверждён, Черновик) belonging to the mentor. Completed/archived projects
// are excluded — those live in /api/mentor/projects/archive.
//
// Sprint statuses per team are computed from team_reports + sprint
// chronology (see deriveSprintStatuses below). Implementation does N+1
// queries by design — the dashboard is small (≤ 10 projects) and per-team
// queries stay O(1) on indexed (sprint_id, team_id).
func (r *MentorDashboardRepository) GetForMentor(ctx context.Context, mentorID int) ([]models.MentorDashboardProject, error) {
	const projectsQuery = `
		SELECT p.id, p.title, p.status, COALESCE(p.company, ''),
		       p.predecessor_project_id,
		       p.duration_semesters,
		       p.created_at
		FROM projects p
		WHERE p.mentor_id = $1
		  AND p.status NOT IN ('Завершён', 'Архивный')
		ORDER BY p.created_at DESC
	`

	type projectRow struct {
		ID                int
		Title             string
		Status            models.ProjectStatus
		Company           string
		PredecessorID     *int
		DurationSemesters int
		CreatedAt         time.Time
	}

	rows, err := r.db.Query(ctx, projectsQuery, mentorID)
	if err != nil {
		return nil, fmt.Errorf("dashboard: query projects: %w", err)
	}
	defer rows.Close()

	var projects []projectRow
	for rows.Next() {
		var pr projectRow
		if err := rows.Scan(
			&pr.ID, &pr.Title, &pr.Status, &pr.Company,
			&pr.PredecessorID, &pr.DurationSemesters, &pr.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("dashboard: scan project: %w", err)
		}
		projects = append(projects, pr)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("dashboard: iterate projects: %w", err)
	}

	out := make([]models.MentorDashboardProject, 0, len(projects))
	for _, pr := range projects {
		sprints, err := r.loadSprints(ctx, pr.ID)
		if err != nil {
			return nil, err
		}
		teams, err := r.loadTeams(ctx, pr.ID, sprints)
		if err != nil {
			return nil, err
		}

		// Continuation projects span multiple semesters; the prototype
		// surfaces (currentSemester / durationSemesters). We default to
		// 1 — projects that aren't continuations live in a single
		// semester and the UI suppresses the «N-й из M» suffix when the
		// numbers match `currentSemester == durationSemesters == 1`.
		currentSemester := 1
		if pr.PredecessorID != nil && pr.DurationSemesters > 1 {
			currentSemester = pr.DurationSemesters
		}

		out = append(out, models.MentorDashboardProject{
			ID:                pr.ID,
			Title:             pr.Title,
			Status:            pr.Status,
			Company:           pr.Company,
			PredecessorID:     pr.PredecessorID,
			DurationSemesters: pr.DurationSemesters,
			CurrentSemester:   currentSemester,
			StartedAt:         pr.CreatedAt.Format("2006-01-02"),
			Sprints:           sprints,
			Teams:             teams,
		})
	}

	return out, nil
}

func (r *MentorDashboardRepository) loadSprints(ctx context.Context, projectID int) ([]models.DashboardSprint, error) {
	const q = `
		SELECT id, number, start_date::text, end_date::text, status
		FROM sprints
		WHERE project_id = $1
		ORDER BY number ASC
	`
	rows, err := r.db.Query(ctx, q, projectID)
	if err != nil {
		return nil, fmt.Errorf("dashboard: query sprints: %w", err)
	}
	defer rows.Close()

	var sprints []models.DashboardSprint
	for rows.Next() {
		var s models.DashboardSprint
		if err := rows.Scan(&s.ID, &s.Number, &s.StartDate, &s.EndDate, &s.Status); err != nil {
			return nil, fmt.Errorf("dashboard: scan sprint: %w", err)
		}
		sprints = append(sprints, s)
	}
	return sprints, rows.Err()
}

func (r *MentorDashboardRepository) loadTeams(
	ctx context.Context,
	projectID int,
	sprints []models.DashboardSprint,
) ([]models.DashboardTeam, error) {
	const q = `
		SELECT t.id, t.name, t.leader_id,
		       COALESCE(t.launched, TRUE) AS launched,
		       COALESCE(u.first_name, '') AS lead_first_name,
		       COALESCE(u.last_name, '') AS lead_last_name,
		       (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) AS member_count
		FROM teams t
		LEFT JOIN users u ON u.id = t.leader_id
		WHERE t.project_id = $1
		ORDER BY t.id ASC
	`
	rows, err := r.db.Query(ctx, q, projectID)
	if err != nil {
		return nil, fmt.Errorf("dashboard: query teams: %w", err)
	}
	defer rows.Close()

	var teams []models.DashboardTeam
	for rows.Next() {
		var (
			team       models.DashboardTeam
			leaderID   *int
			leadFirst  string
			leadLast   string
			memberCnt  int
		)
		if err := rows.Scan(
			&team.ID, &team.Name, &leaderID, &team.Launched,
			&leadFirst, &leadLast, &memberCnt,
		); err != nil {
			return nil, fmt.Errorf("dashboard: scan team: %w", err)
		}
		team.MemberCount = memberCnt
		if leaderID != nil {
			team.Lead = &models.UserSummary{
				ID:        *leaderID,
				FirstName: leadFirst,
				LastName:  leadLast,
			}
		}
		teams = append(teams, team)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	if len(sprints) == 0 {
		return teams, nil
	}

	for i := range teams {
		statuses, err := r.deriveSprintStatuses(ctx, teams[i].ID, sprints)
		if err != nil {
			return nil, err
		}
		teams[i].SprintStatuses = statuses
	}

	return teams, nil
}

// deriveSprintStatuses computes one DashboardIterState per project sprint
// for a single team. The mapping mirrors what the prototype renders:
//
//   - If team_reports.status = 'Проверен'      → reviewed
//   - If team_reports.status = 'Отправлен'     → pending-review
//   - Else if sprint.status = 'Активный'       → current
//   - Else if sprint.status = 'Завершён'       → missed (no submitted report)
//   - Else                                     → future
func (r *MentorDashboardRepository) deriveSprintStatuses(
	ctx context.Context,
	teamID int,
	sprints []models.DashboardSprint,
) ([]models.DashboardIterState, error) {
	const q = `
		SELECT sprint_id, status
		FROM team_reports
		WHERE team_id = $1
	`
	rows, err := r.db.Query(ctx, q, teamID)
	if err != nil {
		return nil, fmt.Errorf("dashboard: query team_reports: %w", err)
	}
	defer rows.Close()

	reportBySprint := map[int]string{}
	for rows.Next() {
		var sprintID int
		var status string
		if err := rows.Scan(&sprintID, &status); err != nil {
			return nil, fmt.Errorf("dashboard: scan team_report: %w", err)
		}
		reportBySprint[sprintID] = status
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	out := make([]models.DashboardIterState, 0, len(sprints))
	for _, s := range sprints {
		switch reportBySprint[s.ID] {
		case "Проверен":
			out = append(out, models.DashboardIterReviewed)
			continue
		case "Отправлен":
			out = append(out, models.DashboardIterPendingReview)
			continue
		}

		switch s.Status {
		case models.SprintStatusActive:
			out = append(out, models.DashboardIterCurrent)
		case models.SprintStatusFinished:
			out = append(out, models.DashboardIterMissed)
		default:
			out = append(out, models.DashboardIterFuture)
		}
	}
	return out, nil
}
