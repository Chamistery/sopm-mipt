package repository

import (
	"context"
	"fmt"

	"github.com/doug-martin/goqu/v9"
	_ "github.com/doug-martin/goqu/v9/dialect/postgres"
	"github.com/hsse/project-service/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type TemplateRepository struct {
	db      *pgxpool.Pool
	dialect goqu.DialectWrapper
}

func NewTemplateRepository(db *pgxpool.Pool) *TemplateRepository {
	return &TemplateRepository{db: db, dialect: goqu.Dialect("postgres")}
}

func (r *TemplateRepository) Create(ctx context.Context, template *models.Template) error {
	sql, args, err := r.dialect.Insert("templates").Rows(
		goqu.Record{
			"id":         template.ID,
			"name":       template.Name,
			"fields":     template.Fields,
			"created_at": template.CreatedAt,
			"updated_at": template.UpdatedAt,
		},
	).ToSQL()
	if err != nil {
		return fmt.Errorf("failed to build insert query: %w", err)
	}

	_, err = r.db.Exec(ctx, sql, args...)

	return err
}

func (r *TemplateRepository) GetByID(ctx context.Context, id string) (*models.Template, error) {
	sql, args, err := r.dialect.From("templates").Where(goqu.C("id").Eq(id)).ToSQL()
	if err != nil {
		return nil, fmt.Errorf("failed to build select query: %w", err)
	}

	template := &models.Template{}

	scanFunc := func(s Scanner) error {
		return s.Scan(
			&template.ID,
			&template.Name,
			&template.Fields,
			&template.CreatedAt,
			&template.UpdatedAt,
		)
	}

	if err := ScanOne(r.db.QueryRow(ctx, sql, args...), scanFunc, "template"); err != nil {
		return nil, err
	}

	return template, nil
}

func (r *TemplateRepository) GetAll(ctx context.Context) ([]models.Template, error) {
	sql, args, err := r.dialect.From("templates").Order(goqu.C("created_at").Desc()).ToSQL()
	if err != nil {
		return nil, fmt.Errorf("failed to build select query: %w", err)
	}

	scanFunc := func(s Scanner) (models.Template, error) {
		var template models.Template
		err := s.Scan(
			&template.ID,
			&template.Name,
			&template.Fields,
			&template.CreatedAt,
			&template.UpdatedAt,
		)
		return template, err
	}

	return ScanAll(ctx, r.db, sql, args, scanFunc)
}

func (r *TemplateRepository) Update(ctx context.Context, template *models.Template) error {
	sql, args, err := r.dialect.Update("templates").Set(
		goqu.Record{
			"name":   template.Name,
			"fields": template.Fields,
		},
	).Where(goqu.C("id").Eq(template.ID)).ToSQL()
	if err != nil {
		return fmt.Errorf("failed to build update query: %w", err)
	}

	result, err := r.db.Exec(ctx, sql, args...)
	if err != nil {
		return err
	}

	return CheckRowsAffected(result, "template")
}

func (r *TemplateRepository) Delete(ctx context.Context, id string) error {
	sql, args, err := r.dialect.Delete("templates").Where(goqu.C("id").Eq(id)).ToSQL()
	if err != nil {
		return fmt.Errorf("failed to build delete query: %w", err)
	}

	result, err := r.db.Exec(ctx, sql, args...)
	if err != nil {
		return err
	}

	return CheckRowsAffected(result, "template")
}
