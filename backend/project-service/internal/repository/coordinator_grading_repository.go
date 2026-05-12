package repository

import (
	"context"
	"fmt"

	"github.com/hsse/project-service/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

// CoordinatorGradingRepository — агрегат оценок для view-grading tab
// «Текущие оценки». На MVP считаем только MentorAvg (среднее по
// sprint_scores). KTU/Tracker/Defense/Peer пока не имеют отдельных
// источников — оставляем NULL. Frontend показывает «—».
type CoordinatorGradingRepository struct {
	db *pgxpool.Pool
}

func NewCoordinatorGradingRepository(db *pgxpool.Pool) *CoordinatorGradingRepository {
	return &CoordinatorGradingRepository{db: db}
}

// Rows возвращает по одной строке на студента, который состоит в команде
// (есть запись в team_members). Студенты вне команд не показываются.
func (r *CoordinatorGradingRepository) Rows(ctx context.Context) ([]models.CoordinatorGradingRow, error) {
	const q = `
		SELECT
		    u.id AS student_id,
		    TRIM(CONCAT(u.last_name, ' ', LEFT(u.first_name, 1), '.')) AS student_name,
		    p.title AS project_title,
		    t.name AS team_name,
		    AVG(ss.score)::float8 AS mentor_avg
		FROM team_members tm
		JOIN users u   ON u.id = tm.user_id
		JOIN teams t   ON t.id = tm.team_id
		JOIN projects p ON p.id = t.project_id
		LEFT JOIN sprint_scores ss
		    ON ss.student_id = u.id AND ss.team_id = t.id
		GROUP BY u.id, u.last_name, u.first_name, p.title, t.name
		ORDER BY u.last_name ASC, u.first_name ASC
	`
	rows, err := r.db.Query(ctx, q)
	if err != nil {
		return nil, fmt.Errorf("coord grading: query: %w", err)
	}
	defer rows.Close()

	var out []models.CoordinatorGradingRow
	for rows.Next() {
		var (
			row       models.CoordinatorGradingRow
			mentorAvg *float64
		)
		if err := rows.Scan(
			&row.StudentID, &row.StudentName, &row.ProjectTitle, &row.TeamName,
			&mentorAvg,
		); err != nil {
			return nil, fmt.Errorf("coord grading: scan: %w", err)
		}
		row.MentorAvg = mentorAvg
		// Итого по формуле = 0.4*mentor + 0.3*tracker + 0.2*defense + 0.1*peer.
		// Считаем только если есть хоть одна оценка (тот же подход что в
		// прототипе: «—» если нет полной картины).
		if mentorAvg != nil {
			total := 0.4 * (*mentorAvg)
			row.Total = &total
		}
		out = append(out, row)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if out == nil {
		out = []models.CoordinatorGradingRow{}
	}
	return out, nil
}
