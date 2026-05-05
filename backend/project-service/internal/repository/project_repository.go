package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strconv"

	"github.com/hsse/project-service/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ProjectRepository struct {
	db *pgxpool.Pool
}

func NewProjectRepository(db *pgxpool.Pool) *ProjectRepository {
	return &ProjectRepository{db: db}
}

func (r *ProjectRepository) Create(ctx context.Context, project *models.Project) error {
	query := `
		INSERT INTO projects (
			title, status, mentor_id, company, courses, description, full_description, technologies,
			team_size_min, team_size_max, num_teams, min_gpa, edu_result, acceptance_criteria,
			goal, expected_result, competencies, resources, duration_semesters, submitted_at,
			proposal_data
		)
		VALUES ($1,$2,$3,$4,$5::int[],$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
		RETURNING id, created_at, updated_at
	`

	return r.db.QueryRow(
		ctx,
		query,
		project.Title,
		project.Status,
		project.MentorID,
		project.Company,
		formatIntArray(project.Courses),
		project.Description,
		project.FullDescription,
		project.Technologies,
		project.TeamSizeMin,
		project.TeamSizeMax,
		project.NumTeams,
		project.MinGPA,
		project.EduResult,
		project.AcceptanceCriteria,
		project.Goal,
		project.ExpectedResult,
		project.Competencies,
		project.Resources,
		project.DurationSemesters,
		project.SubmittedAt,
		proposalDataParam(project.ProposalData),
	).Scan(&project.ID, &project.CreatedAt, &project.UpdatedAt)
}

// proposalDataParam превращает *json.RawMessage в значение, пригодное для
// pgx. Если документ пустой/nil — отдаём nil (NULL в БД), иначе []byte.
func proposalDataParam(raw *json.RawMessage) interface{} {
	if raw == nil || len(*raw) == 0 {
		return nil
	}
	return []byte(*raw)
}

func (r *ProjectRepository) GetByID(ctx context.Context, id int) (*models.Project, error) {
	query := `
		SELECT id, title, status, mentor_id, company,
		       COALESCE(array_to_json(courses)::text, '[]'),
		       COALESCE(description, ''), COALESCE(full_description, ''), technologies,
		       team_size_min, team_size_max, num_teams, COALESCE(min_gpa, 0),
		       COALESCE(edu_result, ''), COALESCE(acceptance_criteria, ''), COALESCE(goal, ''),
		       COALESCE(expected_result, ''), COALESCE(competencies, ''), COALESCE(resources, ''),
		       duration_semesters, submitted_at, proposal_data, created_at, updated_at
		FROM projects
		WHERE id = $1
	`

	project := &models.Project{}
	var courses models.IntList
	var proposalRaw []byte
	scanFunc := func(s Scanner) error {
		return s.Scan(
			&project.ID,
			&project.Title,
			&project.Status,
			&project.MentorID,
			&project.Company,
			&courses,
			&project.Description,
			&project.FullDescription,
			&project.Technologies,
			&project.TeamSizeMin,
			&project.TeamSizeMax,
			&project.NumTeams,
			&project.MinGPA,
			&project.EduResult,
			&project.AcceptanceCriteria,
			&project.Goal,
			&project.ExpectedResult,
			&project.Competencies,
			&project.Resources,
			&project.DurationSemesters,
			&project.SubmittedAt,
			&proposalRaw,
			&project.CreatedAt,
			&project.UpdatedAt,
		)
	}

	if err := ScanOne(r.db.QueryRow(ctx, query, id), scanFunc, "project"); err != nil {
		return nil, err
	}
	project.Courses = []int(courses)
	if len(proposalRaw) > 0 {
		raw := json.RawMessage(append([]byte(nil), proposalRaw...))
		project.ProposalData = &raw
	}

	return project, nil
}

// GetProposal возвращает только proposal_data (или nil, если не задан) +
// id ментора-владельца, чтобы вызывающий мог проверить право доступа.
func (r *ProjectRepository) GetProposal(ctx context.Context, id int) (*json.RawMessage, int, error) {
	var proposalRaw []byte
	var mentorID int
	row := r.db.QueryRow(ctx, "SELECT mentor_id, proposal_data FROM projects WHERE id = $1", id)
	scanFunc := func(s Scanner) error {
		return s.Scan(&mentorID, &proposalRaw)
	}
	if err := ScanOne(row, scanFunc, "project"); err != nil {
		return nil, 0, err
	}
	if len(proposalRaw) == 0 {
		return nil, mentorID, nil
	}
	raw := json.RawMessage(append([]byte(nil), proposalRaw...))
	return &raw, mentorID, nil
}

type ProjectListFilters struct {
	Company  string
	Course   string
	Status   string
	MentorID int
	Limit    int
	Offset   int
}

func (r *ProjectRepository) GetList(ctx context.Context, filters ProjectListFilters) ([]models.ProjectListItem, int, error) {
	// where строится с префиксом p. для совместимости с SELECT, который
	// JOIN'ит applications a — у applications тоже есть колонка status,
	// без префикса PostgreSQL вернёт «column reference is ambiguous».
	where := "WHERE 1=1"
	args := []interface{}{}
	argPos := 1
	if filters.Company != "" {
		where += fmt.Sprintf(" AND p.company = $%d", argPos)
		args = append(args, filters.Company)
		argPos++
	}
	if filters.Status != "" {
		where += fmt.Sprintf(" AND p.status = $%d", argPos)
		args = append(args, filters.Status)
		argPos++
	}
	if filters.Course != "" {
		where += fmt.Sprintf(" AND $%d::int = ANY(p.courses)", argPos)
		args = append(args, filters.Course)
		argPos++
	}
	if filters.MentorID > 0 {
		where += fmt.Sprintf(" AND p.mentor_id = $%d", argPos)
		args = append(args, filters.MentorID)
		argPos++
	}

	// Префикс p. в countQuery валиден тоже — добавим алиас в FROM.
	countQuery := "SELECT COUNT(*) FROM projects p " + where
	var total int
	if err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := fmt.Sprintf(`
		SELECT p.id, p.title, p.status, p.mentor_id, p.company,
		       COALESCE(array_to_json(p.courses)::text, '[]'),
		       p.team_size_min, p.team_size_max, p.num_teams,
		       COALESCE(COUNT(DISTINCT CASE WHEN a.team_id IS NOT NULL THEN a.team_id END), 0) AS filled_teams,
		       COALESCE(COUNT(*) FILTER (WHERE a.status = 'Принят'), 0) AS accepted_count,
		       p.submitted_at, p.created_at, p.updated_at,
		       COALESCE(p.description, ''), p.technologies, COALESCE(p.min_gpa, 0)
		FROM projects p
		LEFT JOIN applications a ON a.project_id = p.id
		%s
		GROUP BY p.id
		ORDER BY p.created_at DESC
		LIMIT $%d OFFSET $%d
	`, where, argPos, argPos+1)
	args = append(args, filters.Limit, filters.Offset)

	scanFunc := func(s Scanner) (models.ProjectListItem, error) {
		var item models.ProjectListItem
		var courses models.IntList
		err := s.Scan(
			&item.ID,
			&item.Title,
			&item.Status,
			&item.MentorID,
			&item.Company,
			&courses,
			&item.TeamSizeMin,
			&item.TeamSizeMax,
			&item.NumTeams,
			&item.FilledTeams,
			&item.AcceptedCount,
			&item.SubmittedAt,
			&item.CreatedAt,
			&item.UpdatedAt,
			&item.Description,
			&item.Technologies,
			&item.MinGPA,
		)
		item.Courses = []int(courses)
		item.AvailableSlots = item.NumTeams*item.TeamSizeMax - item.AcceptedCount
		if item.AvailableSlots < 0 {
			item.AvailableSlots = 0
		}
		return item, err
	}

	projects, err := ScanAll(ctx, r.db, query, args, scanFunc)
	if err != nil {
		return nil, 0, err
	}

	return projects, total, nil
}

func (r *ProjectRepository) Update(ctx context.Context, project *models.Project) error {
	query := `
		UPDATE projects
		SET title = $2,
		    status = $3,
		    mentor_id = $4,
		    company = $5,
		    courses = $6::int[],
		    description = $7,
		    full_description = $8,
		    technologies = $9,
		    team_size_min = $10,
		    team_size_max = $11,
		    num_teams = $12,
		    min_gpa = $13,
		    edu_result = $14,
		    acceptance_criteria = $15,
		    goal = $16,
		    expected_result = $17,
		    competencies = $18,
		    resources = $19,
		    duration_semesters = $20,
		    submitted_at = $21,
		    proposal_data = COALESCE($22::jsonb, proposal_data)
		WHERE id = $1
	`

	result, err := r.db.Exec(
		ctx,
		query,
		project.ID,
		project.Title,
		project.Status,
		project.MentorID,
		project.Company,
		formatIntArray(project.Courses),
		project.Description,
		project.FullDescription,
		project.Technologies,
		project.TeamSizeMin,
		project.TeamSizeMax,
		project.NumTeams,
		project.MinGPA,
		project.EduResult,
		project.AcceptanceCriteria,
		project.Goal,
		project.ExpectedResult,
		project.Competencies,
		project.Resources,
		project.DurationSemesters,
		project.SubmittedAt,
		proposalDataParam(project.ProposalData),
	)
	if err != nil {
		return err
	}

	return CheckRowsAffected(result, "project")
}

func (r *ProjectRepository) Delete(ctx context.Context, id int) error {
	result, err := r.db.Exec(ctx, "DELETE FROM projects WHERE id = $1", id)
	if err != nil {
		return err
	}

	return CheckRowsAffected(result, "project")
}

// GetPredecessor returns the project referenced by predecessor_project_id of
// the given project. Returns (nil, nil) if the project exists but has no
// predecessor set. Returns (nil, error) with a "project not found" error when
// the project itself does not exist.
func (r *ProjectRepository) GetPredecessor(ctx context.Context, id int) (*models.Project, error) {
	var predecessorID *int
	scanFunc := func(s Scanner) error {
		return s.Scan(&predecessorID)
	}

	row := r.db.QueryRow(ctx, "SELECT predecessor_project_id FROM projects WHERE id = $1", id)
	if err := ScanOne(row, scanFunc, "project"); err != nil {
		return nil, err
	}
	if predecessorID == nil {
		return nil, nil
	}

	return r.GetByID(ctx, *predecessorID)
}

func (r *ProjectRepository) GetFull(ctx context.Context, id int) (*models.ProjectFull, error) {
	project, err := r.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	sprints, err := NewSprintRepository(r.db).GetByProjectID(ctx, id)
	if err != nil {
		return nil, err
	}
	teams, err := NewTeamRepository(r.db).GetByProjectID(ctx, id)
	if err != nil {
		return nil, err
	}

	return &models.ProjectFull{
		Project: *project,
		Sprints: sprints,
		Teams:   teams,
	}, nil
}

func (r *ProjectRepository) GetApplicants(ctx context.Context, id int) (*models.ProjectApplicantsResponse, error) {
	project, err := r.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	apps, err := NewApplicationRepository(r.db).GetByProjectID(ctx, id)
	if err != nil {
		return nil, err
	}
	teams, err := NewTeamRepository(r.db).GetByProjectID(ctx, id)
	if err != nil {
		return nil, err
	}

	minCourse := 0
	if len(project.Courses) > 0 {
		sorted := append([]int(nil), project.Courses...)
		sort.Ints(sorted)
		minCourse = sorted[0]
	}

	resp := &models.ProjectApplicantsResponse{
		ProjectID: id,
		Requirements: models.ApplicantRequirements{
			MinCourse: minCourse,
			MinGPA:    project.MinGPA,
		},
	}

	teamByID := make(map[int]*models.ApplicantTeamBucket, len(teams))
	for _, team := range teams {
		bucket := models.ApplicantTeamBucket{
			TeamID:  team.ID,
			Name:    team.Name,
			MaxSize: project.TeamSizeMax,
		}
		resp.Teams = append(resp.Teams, bucket)
		teamByID[team.ID] = &resp.Teams[len(resp.Teams)-1]
	}

	for _, app := range apps {
		course, _ := strconv.Atoi(app.Student.Course)
		item := models.ApplicantItem{
			ApplicationID: app.ID,
			StudentID:     app.StudentID,
			Name:          app.Student.FirstName + " " + app.Student.LastName,
			Course:        course,
			GPA:           app.Student.GPA,
			Status:        app.Status,
			TeamID:        app.TeamID,
		}
		qualified := containsInt(project.Courses, course) && app.Student.GPA >= project.MinGPA
		if app.Status == models.ApplicationStatusUnqualified {
			qualified = false
		}
		addApplicantByPriority(&resp.Qualified, &resp.Unqualified, qualified, app.Priority, item)

		if app.TeamID != nil {
			if bucket, ok := teamByID[*app.TeamID]; ok {
				bucket.Members = append(bucket.Members, models.ApplicantTeamMember{
					ApplicationID: app.ID,
					StudentID:     app.StudentID,
					Name:          item.Name,
					Status:        app.Status,
				})
			}
		}
	}

	return resp, nil
}

func addApplicantByPriority(qualified, unqualified *models.ApplicantPriorityBuckets, isQualified bool, priority int, item models.ApplicantItem) {
	target := unqualified
	if isQualified {
		target = qualified
	}

	switch priority {
	case 1:
		target.Priority1 = append(target.Priority1, item)
	case 2:
		target.Priority2 = append(target.Priority2, item)
	case 3:
		target.Priority3 = append(target.Priority3, item)
	case 4:
		target.Priority4 = append(target.Priority4, item)
	case 5:
		target.Priority5 = append(target.Priority5, item)
	}
}

func containsInt(values []int, target int) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}
