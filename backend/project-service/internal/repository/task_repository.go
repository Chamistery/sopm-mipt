package repository

import (
	"context"
	"fmt"

	"github.com/hsse/project-service/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type TaskRepository struct {
	db *pgxpool.Pool
}

func NewTaskRepository(db *pgxpool.Pool) *TaskRepository {
	return &TaskRepository{db: db}
}

func (r *TaskRepository) Create(ctx context.Context, task *models.Task) error {
	query := `
		INSERT INTO tasks (
			sprint_id, team_id, assignee_id, created_by_id, name, description, status,
			hours_estimate, start_date, end_date, mr_link, work_description, mentor_comments, history
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::date,$10::date,$11,$12,$13,$14)
		RETURNING id, status_changed_at, created_at, updated_at
	`
	return r.db.QueryRow(
		ctx,
		query,
		task.SprintID, task.TeamID, task.AssigneeID, task.CreatedByID, task.Name, task.Description, task.Status,
		task.HoursEstimate, task.StartDate, task.EndDate, task.MRLink, task.WorkDescription, task.MentorComments, task.History,
	).Scan(&task.ID, &task.StatusChangedAt, &task.CreatedAt, &task.UpdatedAt)
}

func (r *TaskRepository) GetByID(ctx context.Context, id int) (*models.Task, error) {
	query := `
		SELECT t.id, t.sprint_id, t.team_id, t.assignee_id, COALESCE(u.first_name || ' ' || u.last_name, ''),
		       t.created_by_id, t.name, COALESCE(t.description, ''), t.status, t.status_changed_at,
		       t.was_overdue, t.hours_estimate, to_char(t.start_date, 'YYYY-MM-DD'), to_char(t.end_date, 'YYYY-MM-DD'),
		       COALESCE(t.mr_link, ''), COALESCE(t.work_description, ''), t.mentor_comments, t.history,
		       t.deleted_at, t.deleted_by_id, t.created_at, t.updated_at
		FROM tasks t
		LEFT JOIN users u ON u.id = t.assignee_id
		WHERE t.id = $1
	`
	task := &models.Task{}
	scanFunc := func(s Scanner) error {
		return s.Scan(
			&task.ID, &task.SprintID, &task.TeamID, &task.AssigneeID, &task.AssigneeName, &task.CreatedByID,
			&task.Name, &task.Description, &task.Status, &task.StatusChangedAt, &task.WasOverdue, &task.HoursEstimate,
			&task.StartDate, &task.EndDate, &task.MRLink, &task.WorkDescription, &task.MentorComments, &task.History,
			&task.DeletedAt, &task.DeletedByID, &task.CreatedAt, &task.UpdatedAt,
		)
	}
	if err := ScanOne(r.db.QueryRow(ctx, query, id), scanFunc, "task"); err != nil {
		return nil, err
	}
	return task, nil
}

func (r *TaskRepository) GetList(ctx context.Context, filters TaskFilters) ([]models.Task, error) {
	where := "WHERE t.deleted_at IS NULL"
	args := []interface{}{}
	argPos := 1
	if filters.SprintID > 0 {
		where += fmt.Sprintf(" AND t.sprint_id = $%d", argPos)
		args = append(args, filters.SprintID)
		argPos++
	}
	if filters.TeamID > 0 {
		where += fmt.Sprintf(" AND t.team_id = $%d", argPos)
		args = append(args, filters.TeamID)
		argPos++
	}
	if filters.AssigneeID > 0 {
		where += fmt.Sprintf(" AND t.assignee_id = $%d", argPos)
		args = append(args, filters.AssigneeID)
	}

	query := `
		SELECT t.id, t.sprint_id, t.team_id, t.assignee_id, COALESCE(u.first_name || ' ' || u.last_name, ''),
		       t.created_by_id, t.name, COALESCE(t.description, ''), t.status, t.status_changed_at,
		       t.was_overdue, t.hours_estimate, to_char(t.start_date, 'YYYY-MM-DD'), to_char(t.end_date, 'YYYY-MM-DD'),
		       COALESCE(t.mr_link, ''), COALESCE(t.work_description, ''), t.mentor_comments, t.history,
		       t.deleted_at, t.deleted_by_id, t.created_at, t.updated_at
		FROM tasks t
		LEFT JOIN users u ON u.id = t.assignee_id
	` + where + `
		ORDER BY t.start_date, t.id
	`

	scanFunc := func(s Scanner) (models.Task, error) {
		var task models.Task
		err := s.Scan(
			&task.ID, &task.SprintID, &task.TeamID, &task.AssigneeID, &task.AssigneeName, &task.CreatedByID,
			&task.Name, &task.Description, &task.Status, &task.StatusChangedAt, &task.WasOverdue, &task.HoursEstimate,
			&task.StartDate, &task.EndDate, &task.MRLink, &task.WorkDescription, &task.MentorComments, &task.History,
			&task.DeletedAt, &task.DeletedByID, &task.CreatedAt, &task.UpdatedAt,
		)
		return task, err
	}

	return ScanAll(ctx, r.db, query, args, scanFunc)
}

func (r *TaskRepository) Update(ctx context.Context, task *models.Task) error {
	result, err := r.db.Exec(
		ctx,
		`UPDATE tasks
		 SET assignee_id = $2, name = $3, description = $4, status = $5, was_overdue = $6,
		     hours_estimate = $7, start_date = $8::date, end_date = $9::date, mr_link = $10,
		     work_description = $11, mentor_comments = $12, history = $13
		 WHERE id = $1`,
		task.ID, task.AssigneeID, task.Name, task.Description, task.Status, task.WasOverdue,
		task.HoursEstimate, task.StartDate, task.EndDate, task.MRLink, task.WorkDescription, task.MentorComments, task.History,
	)
	if err != nil {
		return err
	}
	return CheckRowsAffected(result, "task")
}

func (r *TaskRepository) SoftDelete(ctx context.Context, id int, deletedBy int) error {
	result, err := r.db.Exec(
		ctx,
		`UPDATE tasks SET deleted_at = CURRENT_TIMESTAMP, deleted_by_id = $2 WHERE id = $1 AND deleted_at IS NULL`,
		id,
		deletedBy,
	)
	if err != nil {
		return err
	}
	return CheckRowsAffected(result, "task")
}

func (r *TaskRepository) AutoAdvanceAssigned(ctx context.Context) error {
	_, err := r.db.Exec(
		ctx,
		`UPDATE tasks SET status = $1 WHERE status = $2 AND start_date <= CURRENT_DATE AND deleted_at IS NULL`,
		models.TaskStatusInProgress,
		models.TaskStatusAssigned,
	)
	return err
}

func (r *TaskRepository) MarkOverdue(ctx context.Context) error {
	_, err := r.db.Exec(
		ctx,
		`UPDATE tasks SET was_overdue = TRUE
		 WHERE end_date < CURRENT_DATE
		   AND status NOT IN ($1, $2, $3)
		   AND deleted_at IS NULL`,
		models.TaskStatusInReview,
		models.TaskStatusDone,
		models.TaskStatusRejected,
	)
	return err
}
