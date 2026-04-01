package repository

import (
	"context"
	"fmt"

	"github.com/doug-martin/goqu/v9"
	_ "github.com/doug-martin/goqu/v9/dialect/postgres"
	"github.com/hsse/project-service/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ApplicationRepository struct {
	db      *pgxpool.Pool
	dialect goqu.DialectWrapper
}

func NewApplicationRepository(db *pgxpool.Pool) *ApplicationRepository {
	return &ApplicationRepository{
		db:      db,
		dialect: goqu.Dialect("postgres"),
	}
}

func (r *ApplicationRepository) Create(ctx context.Context, app *models.Application) error {
	sql, args, err := r.dialect.Insert("applications").
		Rows(goqu.Record{
			"project_id": app.ProjectID,
			"student_id": app.StudentID,
			"priority":   app.Priority,
			"status":     app.Status,
			"created_at": app.CreatedAt,
			"updated_at": app.UpdatedAt,
		}).
		Returning("id").
		ToSQL()
	if err != nil {
		return fmt.Errorf("failed to build insert query: %w", err)
	}

	return r.db.QueryRow(ctx, sql, args...).Scan(&app.ID)
}

func (r *ApplicationRepository) GetByID(ctx context.Context, id int) (*models.Application, error) {
	sql, args, err := r.dialect.From("applications").
		Select("id", "project_id", "student_id", "priority", "status", "created_at", "updated_at").
		Where(goqu.C("id").Eq(id)).
		ToSQL()
	if err != nil {
		return nil, fmt.Errorf("failed to build select query: %w", err)
	}

	app := &models.Application{}

	scanFunc := func(s Scanner) error {
		return s.Scan(
			&app.ID,
			&app.ProjectID,
			&app.StudentID,
			&app.Priority,
			&app.Status,
			&app.CreatedAt,
			&app.UpdatedAt,
		)
	}

	if err := ScanOne(r.db.QueryRow(ctx, sql, args...), scanFunc, "application"); err != nil {
		return nil, err
	}

	return app, nil
}

func (r *ApplicationRepository) GetByStudentID(ctx context.Context, studentID int) ([]models.ApplicationWithProject, error) {
	sql, args, err := r.dialect.From(goqu.T("applications").As("a")).
		Select(
			goqu.C("id").Table("a"),
			goqu.C("project_id").Table("a"),
			goqu.C("student_id").Table("a"),
			goqu.C("priority").Table("a"),
			goqu.C("status").Table("a"),
			goqu.C("created_at").Table("a"),
			goqu.C("updated_at").Table("a"),
			goqu.C("title").Table("p"),
			goqu.C("company").Table("p"),
		).
		Join(goqu.T("projects").As("p"), goqu.On(goqu.I("a.project_id").Eq(goqu.I("p.id")))).
		Where(goqu.C("student_id").Table("a").Eq(studentID)).
		Order(goqu.C("priority").Table("a").Asc()).
		ToSQL()
	if err != nil {
		return nil, fmt.Errorf("failed to build select query: %w", err)
	}

	scanFunc := func(s Scanner) (models.ApplicationWithProject, error) {
		var app models.ApplicationWithProject
		err := s.Scan(
			&app.ID,
			&app.ProjectID,
			&app.StudentID,
			&app.Priority,
			&app.Status,
			&app.CreatedAt,
			&app.UpdatedAt,
			&app.ProjectTitle,
			&app.Company,
		)
		return app, err
	}

	return ScanAll(ctx, r.db, sql, args, scanFunc)
}

func (r *ApplicationRepository) GetByProjectID(ctx context.Context, projectID int) ([]models.Application, error) {
	sql, args, err := r.dialect.From("applications").
		Select("id", "project_id", "student_id", "priority", "status", "created_at", "updated_at").
		Where(goqu.C("project_id").Eq(projectID)).
		Order(goqu.C("priority").Asc()).
		ToSQL()
	if err != nil {
		return nil, fmt.Errorf("failed to build select query: %w", err)
	}

	scanFunc := func(s Scanner) (models.Application, error) {
		var app models.Application
		err := s.Scan(
			&app.ID,
			&app.ProjectID,
			&app.StudentID,
			&app.Priority,
			&app.Status,
			&app.CreatedAt,
			&app.UpdatedAt,
		)
		return app, err
	}

	return ScanAll(ctx, r.db, sql, args, scanFunc)
}

func (r *ApplicationRepository) Update(ctx context.Context, app *models.Application) error {
	sql, args, err := r.dialect.Update("applications").
		Set(goqu.Record{
			"priority": app.Priority,
			"status":   app.Status,
		}).
		Where(goqu.C("id").Eq(app.ID)).
		ToSQL()
	if err != nil {
		return fmt.Errorf("failed to build update query: %w", err)
	}

	result, err := r.db.Exec(ctx, sql, args...)
	if err != nil {
		return err
	}

	return CheckRowsAffected(result, "application")
}

func (r *ApplicationRepository) Delete(ctx context.Context, id int) error {
	sql, args, err := r.dialect.Delete("applications").
		Where(goqu.C("id").Eq(id)).
		ToSQL()
	if err != nil {
		return fmt.Errorf("failed to build delete query: %w", err)
	}

	result, err := r.db.Exec(ctx, sql, args...)
	if err != nil {
		return err
	}

	return CheckRowsAffected(result, "application")
}

func (r *ApplicationRepository) UpdatePriorities(ctx context.Context, studentID int, applications []models.Application) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback(ctx)
	}()

	for _, app := range applications {
		sql, args, err := r.dialect.Update("applications").
			Set(goqu.Record{"priority": app.Priority}).
			Where(goqu.C("id").Eq(app.ID), goqu.C("student_id").Eq(studentID)).
			ToSQL()
		if err != nil {
			return fmt.Errorf("failed to build update query: %w", err)
		}

		_, err = tx.Exec(ctx, sql, args...)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}
