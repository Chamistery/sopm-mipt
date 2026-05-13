package repository

import (
	"context"
	"fmt"
	"strings"

	"github.com/hsse/project-service/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ApplicationRepository struct {
	db *pgxpool.Pool
}

func NewApplicationRepository(db *pgxpool.Pool) *ApplicationRepository {
	return &ApplicationRepository{db: db}
}

func (r *ApplicationRepository) Create(ctx context.Context, app *models.Application) error {
	query := `
		INSERT INTO applications (project_id, student_id, team_id, priority, status, invited_at, responded_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7)
		RETURNING id, status_changed_at, created_at, updated_at
	`
	return r.db.QueryRow(
		ctx,
		query,
		app.ProjectID,
		app.StudentID,
		app.TeamID,
		app.Priority,
		app.Status,
		app.InvitedAt,
		app.RespondedAt,
	).Scan(&app.ID, &app.StatusChangedAt, &app.CreatedAt, &app.UpdatedAt)
}

func (r *ApplicationRepository) GetByID(ctx context.Context, id int) (*models.Application, error) {
	query := `
		SELECT id, project_id, student_id, team_id, priority, status, status_changed_at, invited_at, responded_at, created_at, updated_at
		FROM applications
		WHERE id = $1
	`
	app := &models.Application{}
	scanFunc := func(s Scanner) error {
		return s.Scan(
			&app.ID,
			&app.ProjectID,
			&app.StudentID,
			&app.TeamID,
			&app.Priority,
			&app.Status,
			&app.StatusChangedAt,
			&app.InvitedAt,
			&app.RespondedAt,
			&app.CreatedAt,
			&app.UpdatedAt,
		)
	}

	if err := ScanOne(r.db.QueryRow(ctx, query, id), scanFunc, "application"); err != nil {
		return nil, err
	}
	return app, nil
}

func (r *ApplicationRepository) GetByStudentID(ctx context.Context, studentID int) ([]models.ApplicationWithProject, error) {
	query := baseApplicationSelect() + `
		WHERE a.student_id = $1
		ORDER BY a.priority ASC, a.id ASC
	`
	return scanApplicationsWithProject(ctx, r.db, query, []interface{}{studentID})
}

func (r *ApplicationRepository) GetByProjectID(ctx context.Context, projectID int) ([]models.ApplicationWithProject, error) {
	query := baseApplicationSelect() + `
		WHERE a.project_id = $1
		ORDER BY a.priority ASC, a.id ASC
	`
	return scanApplicationsWithProject(ctx, r.db, query, []interface{}{projectID})
}

func (r *ApplicationRepository) GetByStudentAndStatus(
	ctx context.Context,
	studentID int,
	statuses ...models.ApplicationStatus,
) ([]models.Application, error) {
	if len(statuses) == 0 {
		return []models.Application{}, nil
	}

	args := []interface{}{studentID}
	placeholders := make([]string, 0, len(statuses))
	for i, status := range statuses {
		placeholders = append(placeholders, fmt.Sprintf("$%d", i+2))
		args = append(args, status)
	}

	query := fmt.Sprintf(`
		SELECT id, project_id, student_id, team_id, priority, status, status_changed_at, invited_at, responded_at, created_at, updated_at
		FROM applications
		WHERE student_id = $1 AND status IN (%s)
	`, strings.Join(placeholders, ","))

	scanFunc := func(s Scanner) (models.Application, error) {
		var app models.Application
		err := s.Scan(
			&app.ID, &app.ProjectID, &app.StudentID, &app.TeamID, &app.Priority, &app.Status,
			&app.StatusChangedAt, &app.InvitedAt, &app.RespondedAt, &app.CreatedAt, &app.UpdatedAt,
		)
		return app, err
	}

	return ScanAll(ctx, r.db, query, args, scanFunc)
}

func (r *ApplicationRepository) Update(ctx context.Context, app *models.Application) error {
	query := `
		UPDATE applications
		SET team_id = $2,
		    priority = $3,
		    status = $4,
		    invited_at = $5,
		    responded_at = $6
		WHERE id = $1
	`
	result, err := r.db.Exec(ctx, query, app.ID, app.TeamID, app.Priority, app.Status, app.InvitedAt, app.RespondedAt)
	if err != nil {
		return err
	}
	return CheckRowsAffected(result, "application")
}

func (r *ApplicationRepository) Delete(ctx context.Context, id int) error {
	result, err := r.db.Exec(ctx, "DELETE FROM applications WHERE id = $1", id)
	if err != nil {
		return err
	}
	return CheckRowsAffected(result, "application")
}

func baseApplicationSelect() string {
	// COALESCE на nullable-полях users и projects — у студентов нет company,
	// иногда нет middle_name / avatar / course / group; у проектов company
	// тоже может быть NULL. Без COALESCE pgx падает на scan NULL→string.
	return `
		SELECT a.id, a.project_id, a.student_id, a.team_id, a.priority, a.status, a.status_changed_at,
		       a.invited_at, a.responded_at, a.created_at, a.updated_at,
		       p.title, COALESCE(p.company, ''), COALESCE(array_to_json(p.courses)::text, '[]'),
		       u.id, u.first_name, u.last_name, COALESCE(u.middle_name, ''), u.email, u.role, COALESCE(u.company, ''),
		       COALESCE(u.course, ''), COALESCE(u."group", ''), COALESCE(u.avatar, ''), COALESCE(u.gpa, 0), COALESCE(u.direction, '')
		FROM applications a
		JOIN projects p ON p.id = a.project_id
		JOIN users u ON u.id = a.student_id
	`
}

func scanApplicationsWithProject(ctx context.Context, db *pgxpool.Pool, query string, args []interface{}) ([]models.ApplicationWithProject, error) {
	scanFunc := func(s Scanner) (models.ApplicationWithProject, error) {
		var app models.ApplicationWithProject
		var courses models.IntList
		err := s.Scan(
			&app.ID, &app.ProjectID, &app.StudentID, &app.TeamID, &app.Priority, &app.Status,
			&app.StatusChangedAt, &app.InvitedAt, &app.RespondedAt, &app.CreatedAt, &app.UpdatedAt,
			&app.ProjectTitle, &app.Company, &courses,
			&app.Student.ID, &app.Student.FirstName, &app.Student.LastName, new(string), new(string), new(string),
			new(string), &app.Student.Course, new(string), new(string), &app.Student.GPA, new(string),
		)
		app.Courses = []int(courses)
		return app, err
	}

	return ScanAll(ctx, db, query, args, scanFunc)
}
