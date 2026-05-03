package repository

import (
	"context"

	"github.com/hsse/project-service/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SprintRepository struct {
	db *pgxpool.Pool
}

func NewSprintRepository(db *pgxpool.Pool) *SprintRepository {
	return &SprintRepository{db: db}
}

func (r *SprintRepository) Create(ctx context.Context, sprint *models.Sprint) error {
	query := `
		INSERT INTO sprints (project_id, number, start_date, end_date, status)
		VALUES ($1, $2, $3::date, $4::date, $5)
		RETURNING id, created_at, updated_at
	`
	return r.db.QueryRow(ctx, query, sprint.ProjectID, sprint.Number, sprint.StartDate, sprint.EndDate, sprint.Status).
		Scan(&sprint.ID, &sprint.CreatedAt, &sprint.UpdatedAt)
}

func (r *SprintRepository) CreateBatch(ctx context.Context, projectID int, sprints []models.Sprint) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	for _, sprint := range sprints {
		if _, err := tx.Exec(
			ctx,
			`INSERT INTO sprints (project_id, number, start_date, end_date, status) VALUES ($1,$2,$3::date,$4::date,$5)`,
			projectID,
			sprint.Number,
			sprint.StartDate,
			sprint.EndDate,
			sprint.Status,
		); err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func (r *SprintRepository) GetByID(ctx context.Context, id int) (*models.Sprint, error) {
	query := `
		SELECT id, project_id, number, to_char(start_date, 'YYYY-MM-DD'), to_char(end_date, 'YYYY-MM-DD'), status, created_at, updated_at
		FROM sprints WHERE id = $1
	`
	sprint := &models.Sprint{}
	scanFunc := func(s Scanner) error {
		return s.Scan(&sprint.ID, &sprint.ProjectID, &sprint.Number, &sprint.StartDate, &sprint.EndDate, &sprint.Status, &sprint.CreatedAt, &sprint.UpdatedAt)
	}
	if err := ScanOne(r.db.QueryRow(ctx, query, id), scanFunc, "sprint"); err != nil {
		return nil, err
	}
	return sprint, nil
}

func (r *SprintRepository) GetByProjectID(ctx context.Context, projectID int) ([]models.Sprint, error) {
	query := `
		SELECT id, project_id, number, to_char(start_date, 'YYYY-MM-DD'), to_char(end_date, 'YYYY-MM-DD'), status, created_at, updated_at
		FROM sprints WHERE project_id = $1 ORDER BY number
	`
	scanFunc := func(s Scanner) (models.Sprint, error) {
		var sprint models.Sprint
		err := s.Scan(&sprint.ID, &sprint.ProjectID, &sprint.Number, &sprint.StartDate, &sprint.EndDate, &sprint.Status, &sprint.CreatedAt, &sprint.UpdatedAt)
		return sprint, err
	}
	return ScanAll(ctx, r.db, query, []interface{}{projectID}, scanFunc)
}

func (r *SprintRepository) GetCurrentByProjectID(ctx context.Context, projectID int) (*models.Sprint, error) {
	query := `
		SELECT id, project_id, number, to_char(start_date, 'YYYY-MM-DD'), to_char(end_date, 'YYYY-MM-DD'), status, created_at, updated_at
		FROM sprints
		WHERE project_id = $1
		  AND CURRENT_DATE BETWEEN start_date AND end_date
		ORDER BY number
		LIMIT 1
	`
	sprint := &models.Sprint{}
	scanFunc := func(s Scanner) error {
		return s.Scan(&sprint.ID, &sprint.ProjectID, &sprint.Number, &sprint.StartDate, &sprint.EndDate, &sprint.Status, &sprint.CreatedAt, &sprint.UpdatedAt)
	}
	if err := ScanOne(r.db.QueryRow(ctx, query, projectID), scanFunc, "sprint"); err == nil {
		return sprint, nil
	}

	list, err := r.GetByProjectID(ctx, projectID)
	if err != nil || len(list) == 0 {
		return nil, err
	}
	return &list[len(list)-1], nil
}

func (r *SprintRepository) Update(ctx context.Context, sprint *models.Sprint) error {
	result, err := r.db.Exec(
		ctx,
		`UPDATE sprints SET number = $2, start_date = $3::date, end_date = $4::date, status = $5 WHERE id = $1`,
		sprint.ID,
		sprint.Number,
		sprint.StartDate,
		sprint.EndDate,
		sprint.Status,
	)
	if err != nil {
		return err
	}
	return CheckRowsAffected(result, "sprint")
}
