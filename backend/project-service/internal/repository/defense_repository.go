package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/hsse/project-service/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

// DefenseRepository — CRUD на таблицу defenses + join-таблицы
// defense_projects / defense_experts.
type DefenseRepository struct {
	db *pgxpool.Pool
}

func NewDefenseRepository(db *pgxpool.Pool) *DefenseRepository {
	return &DefenseRepository{db: db}
}

func (r *DefenseRepository) List(ctx context.Context) ([]models.Defense, error) {
	const q = `
		SELECT id, title, starts_at, ends_at, COALESCE(location, ''),
		       COALESCE(description, ''), COALESCE(semester_label, ''),
		       completed, created_at, updated_at
		FROM defenses
		ORDER BY starts_at DESC
	`
	rows, err := r.db.Query(ctx, q)
	if err != nil {
		return nil, fmt.Errorf("defense list: %w", err)
	}
	defer rows.Close()

	var out []models.Defense
	for rows.Next() {
		var d models.Defense
		if err := rows.Scan(
			&d.ID, &d.Title, &d.StartsAt, &d.EndsAt,
			&d.Location, &d.Description, &d.SemesterLabel,
			&d.Completed, &d.CreatedAt, &d.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("defense scan: %w", err)
		}
		out = append(out, d)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Подгружаем проекты и экспертов одним батчем по всем id.
	if len(out) == 0 {
		return out, nil
	}
	ids := make([]int, len(out))
	for i := range out {
		ids[i] = out[i].ID
	}
	projects, err := r.loadProjects(ctx, ids)
	if err != nil {
		return nil, err
	}
	experts, err := r.loadExperts(ctx, ids)
	if err != nil {
		return nil, err
	}
	for i := range out {
		out[i].Projects = projects[out[i].ID]
		out[i].Experts = experts[out[i].ID]
		out[i].ProjectIDs = make([]int, 0, len(projects[out[i].ID]))
		for _, p := range projects[out[i].ID] {
			out[i].ProjectIDs = append(out[i].ProjectIDs, p.ProjectID)
		}
	}
	return out, nil
}

func (r *DefenseRepository) GetByID(ctx context.Context, id int) (*models.Defense, error) {
	const q = `
		SELECT id, title, starts_at, ends_at, COALESCE(location, ''),
		       COALESCE(description, ''), COALESCE(semester_label, ''),
		       completed, created_at, updated_at
		FROM defenses WHERE id = $1
	`
	var d models.Defense
	if err := r.db.QueryRow(ctx, q, id).Scan(
		&d.ID, &d.Title, &d.StartsAt, &d.EndsAt,
		&d.Location, &d.Description, &d.SemesterLabel,
		&d.Completed, &d.CreatedAt, &d.UpdatedAt,
	); err != nil {
		return nil, err
	}
	projects, err := r.loadProjects(ctx, []int{d.ID})
	if err != nil {
		return nil, err
	}
	experts, err := r.loadExperts(ctx, []int{d.ID})
	if err != nil {
		return nil, err
	}
	d.Projects = projects[d.ID]
	d.Experts = experts[d.ID]
	d.ProjectIDs = make([]int, 0, len(d.Projects))
	for _, p := range d.Projects {
		d.ProjectIDs = append(d.ProjectIDs, p.ProjectID)
	}
	return &d, nil
}

type DefenseInput struct {
	Title         string
	StartsAt      time.Time
	EndsAt        *time.Time
	Location      string
	Description   string
	SemesterLabel string
	Completed     bool
	ProjectIDs    []int
	ExpertUserIDs []int
}

func (r *DefenseRepository) Create(ctx context.Context, in DefenseInput, createdByID int) (*models.Defense, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("defense create: begin: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	var id int
	const insertQ = `
		INSERT INTO defenses (title, starts_at, ends_at, location, description,
		                     semester_label, completed, created_by_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id
	`
	if err := tx.QueryRow(ctx, insertQ,
		in.Title, in.StartsAt, in.EndsAt, in.Location, in.Description,
		in.SemesterLabel, in.Completed, createdByID,
	).Scan(&id); err != nil {
		return nil, fmt.Errorf("defense create: insert: %w", err)
	}

	for _, pid := range in.ProjectIDs {
		if _, err := tx.Exec(ctx,
			`INSERT INTO defense_projects (defense_id, project_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
			id, pid,
		); err != nil {
			return nil, fmt.Errorf("defense create: link project: %w", err)
		}
	}
	for _, uid := range in.ExpertUserIDs {
		if _, err := tx.Exec(ctx,
			`INSERT INTO defense_experts (defense_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
			id, uid,
		); err != nil {
			return nil, fmt.Errorf("defense create: link expert: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("defense create: commit: %w", err)
	}
	return r.GetByID(ctx, id)
}

func (r *DefenseRepository) Update(ctx context.Context, id int, in DefenseInput) (*models.Defense, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("defense update: begin: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	const updateQ = `
		UPDATE defenses
		SET title = $2, starts_at = $3, ends_at = $4, location = $5,
		    description = $6, semester_label = $7, completed = $8,
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
	`
	tag, err := tx.Exec(ctx, updateQ,
		id, in.Title, in.StartsAt, in.EndsAt, in.Location,
		in.Description, in.SemesterLabel, in.Completed,
	)
	if err != nil {
		return nil, fmt.Errorf("defense update: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return nil, fmt.Errorf("defense not found")
	}

	if _, err := tx.Exec(ctx, `DELETE FROM defense_projects WHERE defense_id = $1`, id); err != nil {
		return nil, fmt.Errorf("defense update: clear projects: %w", err)
	}
	for _, pid := range in.ProjectIDs {
		if _, err := tx.Exec(ctx,
			`INSERT INTO defense_projects (defense_id, project_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
			id, pid,
		); err != nil {
			return nil, fmt.Errorf("defense update: link project: %w", err)
		}
	}

	if _, err := tx.Exec(ctx, `DELETE FROM defense_experts WHERE defense_id = $1`, id); err != nil {
		return nil, fmt.Errorf("defense update: clear experts: %w", err)
	}
	for _, uid := range in.ExpertUserIDs {
		if _, err := tx.Exec(ctx,
			`INSERT INTO defense_experts (defense_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
			id, uid,
		); err != nil {
			return nil, fmt.Errorf("defense update: link expert: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("defense update: commit: %w", err)
	}
	return r.GetByID(ctx, id)
}

func (r *DefenseRepository) Delete(ctx context.Context, id int) error {
	tag, err := r.db.Exec(ctx, `DELETE FROM defenses WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("defense delete: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("defense not found")
	}
	return nil
}

func (r *DefenseRepository) loadProjects(ctx context.Context, defenseIDs []int) (map[int][]models.DefenseProject, error) {
	if len(defenseIDs) == 0 {
		return map[int][]models.DefenseProject{}, nil
	}
	const q = `
		SELECT dp.defense_id, dp.project_id, p.title,
		       (SELECT COUNT(*) FROM teams t WHERE t.project_id = p.id) AS teams_count
		FROM defense_projects dp
		JOIN projects p ON p.id = dp.project_id
		WHERE dp.defense_id = ANY($1)
		ORDER BY dp.project_id ASC
	`
	rows, err := r.db.Query(ctx, q, defenseIDs)
	if err != nil {
		return nil, fmt.Errorf("defense projects: %w", err)
	}
	defer rows.Close()

	out := map[int][]models.DefenseProject{}
	for rows.Next() {
		var defenseID int
		var p models.DefenseProject
		if err := rows.Scan(&defenseID, &p.ProjectID, &p.Title, &p.TeamsCount); err != nil {
			return nil, err
		}
		out[defenseID] = append(out[defenseID], p)
	}
	return out, rows.Err()
}

func (r *DefenseRepository) loadExperts(ctx context.Context, defenseIDs []int) (map[int][]models.DefenseExpert, error) {
	if len(defenseIDs) == 0 {
		return map[int][]models.DefenseExpert{}, nil
	}
	const q = `
		SELECT de.defense_id, u.id, u.first_name, u.last_name
		FROM defense_experts de
		JOIN users u ON u.id = de.user_id
		WHERE de.defense_id = ANY($1)
		ORDER BY u.last_name ASC
	`
	rows, err := r.db.Query(ctx, q, defenseIDs)
	if err != nil {
		return nil, fmt.Errorf("defense experts: %w", err)
	}
	defer rows.Close()

	out := map[int][]models.DefenseExpert{}
	for rows.Next() {
		var defenseID int
		var e models.DefenseExpert
		if err := rows.Scan(&defenseID, &e.UserID, &e.FirstName, &e.LastName); err != nil {
			return nil, err
		}
		out[defenseID] = append(out[defenseID], e)
	}
	return out, rows.Err()
}
