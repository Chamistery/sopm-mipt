package repository

import (
	"context"
	"fmt"

	"github.com/doug-martin/goqu/v9"
	_ "github.com/doug-martin/goqu/v9/dialect/postgres"
	"github.com/hsse/project-service/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ProjectRepository struct {
	db      *pgxpool.Pool
	dialect goqu.DialectWrapper
}

func NewProjectRepository(db *pgxpool.Pool) *ProjectRepository {
	return &ProjectRepository{
		db:      db,
		dialect: goqu.Dialect("postgres"),
	}
}

func (r *ProjectRepository) Create(ctx context.Context, project *models.Project) error {
	sql, args, err := r.dialect.Insert("projects").
		Rows(goqu.Record{
			"title":        project.Title,
			"template_id":  project.TemplateID,
			"field_values": project.FieldValues,
			"status":       project.Status,
			"mentor_id":    project.MentorID,
			"creator_id":   project.CreatorID,
			"max_slots":    project.MaxSlots,
			"company":      project.Company,
			"course":       project.Course,
			"created_at":   project.CreatedAt,
			"updated_at":   project.UpdatedAt,
		}).
		Returning("id").
		ToSQL()
	if err != nil {
		return fmt.Errorf("failed to build insert query: %w", err)
	}

	return r.db.QueryRow(ctx, sql, args...).Scan(&project.ID)
}

func (r *ProjectRepository) GetByID(ctx context.Context, id int) (*models.Project, error) {
	sql, args, err := r.dialect.From("projects").
		Select(
			"id", "title", "template_id", "field_values", "status",
			"mentor_id", "creator_id", "max_slots", "company", "course",
			"created_at", "updated_at",
		).
		Where(goqu.C("id").Eq(id)).
		ToSQL()
	if err != nil {
		return nil, fmt.Errorf("failed to build select query: %w", err)
	}

	project := &models.Project{}

	scanFunc := func(s Scanner) error {
		return s.Scan(
			&project.ID,
			&project.Title,
			&project.TemplateID,
			&project.FieldValues,
			&project.Status,
			&project.MentorID,
			&project.CreatorID,
			&project.MaxSlots,
			&project.Company,
			&project.Course,
			&project.CreatedAt,
			&project.UpdatedAt,
		)
	}

	if err := ScanOne(r.db.QueryRow(ctx, sql, args...), scanFunc, "project"); err != nil {
		return nil, err
	}

	return project, nil
}

type ProjectListFilters struct {
	Company string
	Course  string
	Status  string
	Limit   int
	Offset  int
}

func (r *ProjectRepository) buildProjectListQuery(filters ProjectListFilters) *goqu.SelectDataset {
	ds := r.dialect.From("projects")
	if filters.Company != "" {
		ds = ds.Where(goqu.C("company").Eq(filters.Company))
	}

	if filters.Course != "" {
		ds = ds.Where(goqu.C("course").Eq(filters.Course))
	}

	if filters.Status != "" {
		ds = ds.Where(goqu.C("status").Eq(filters.Status))
	}

	return ds
}

func (r *ProjectRepository) countProjects(ctx context.Context, ds *goqu.SelectDataset) (int, error) {
	countSQL, countArgs, err := ds.Select(goqu.COUNT("*")).ToSQL()
	if err != nil {
		return 0, fmt.Errorf("failed to build count query: %w", err)
	}

	var total int
	err = r.db.QueryRow(ctx, countSQL, countArgs...).Scan(&total)

	return total, err
}

func toUintSafe(val int) uint {
	if val < 0 {
		return 0
	}

	return uint(val)
}

func (r *ProjectRepository) fetchProjectList(
	ctx context.Context,
	ds *goqu.SelectDataset,
	limit, offset int,
) ([]models.ProjectListItem, error) {
	listSQL, listArgs, err := ds.
		Select(
			"id",
			"title",
			"status",
			"mentor_id",
			"company",
			"course",
			"max_slots",
			goqu.L(
				"COALESCE((SELECT COUNT(*) FROM applications WHERE project_id = projects.id AND status = 'Принято'), 0)",
			).As("filled_slots"),
			"created_at",
		).
		Order(goqu.C("created_at").Desc()).
		Limit(toUintSafe(limit)).
		Offset(toUintSafe(offset)).
		ToSQL()
	if err != nil {
		return nil, fmt.Errorf("failed to build select query: %w", err)
	}

	scanFunc := func(s Scanner) (models.ProjectListItem, error) {
		var project models.ProjectListItem
		err := s.Scan(
			&project.ID,
			&project.Title,
			&project.Status,
			&project.MentorID,
			&project.Company,
			&project.Course,
			&project.MaxSlots,
			&project.FilledSlots,
			&project.CreatedAt,
		)
		return project, err
	}

	return ScanAll(ctx, r.db, listSQL, listArgs, scanFunc)
}

func (r *ProjectRepository) GetList(ctx context.Context, filters ProjectListFilters) ([]models.ProjectListItem, int, error) {
	ds := r.buildProjectListQuery(filters)

	total, err := r.countProjects(ctx, ds)
	if err != nil {
		return nil, 0, err
	}

	projects, err := r.fetchProjectList(ctx, ds, filters.Limit, filters.Offset)
	if err != nil {
		return nil, 0, err
	}

	return projects, total, nil
}

func (r *ProjectRepository) Update(ctx context.Context, project *models.Project) error {
	sql, args, err := r.dialect.Update("projects").
		Set(goqu.Record{
			"title":        project.Title,
			"field_values": project.FieldValues,
			"status":       project.Status,
			"max_slots":    project.MaxSlots,
			"company":      project.Company,
			"course":       project.Course,
		}).
		Where(goqu.C("id").Eq(project.ID)).
		ToSQL()
	if err != nil {
		return fmt.Errorf("failed to build update query: %w", err)
	}

	result, err := r.db.Exec(ctx, sql, args...)
	if err != nil {
		return err
	}

	return CheckRowsAffected(result, "project")
}

func (r *ProjectRepository) Delete(ctx context.Context, id int) error {
	sql, args, err := r.dialect.Delete("projects").
		Where(goqu.C("id").Eq(id)).
		ToSQL()
	if err != nil {
		return fmt.Errorf("failed to build delete query: %w", err)
	}

	result, err := r.db.Exec(ctx, sql, args...)
	if err != nil {
		return err
	}

	return CheckRowsAffected(result, "project")
}
