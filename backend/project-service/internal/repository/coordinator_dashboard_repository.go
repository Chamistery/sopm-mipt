package repository

import (
	"context"
	"fmt"

	"github.com/hsse/project-service/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

// CoordinatorDashboardRepository собирает stats + attention для дашборда
// координатора. Полный список проектов берётся через MentorDashboardRepository.GetAll.
type CoordinatorDashboardRepository struct {
	db *pgxpool.Pool
}

func NewCoordinatorDashboardRepository(db *pgxpool.Pool) *CoordinatorDashboardRepository {
	return &CoordinatorDashboardRepository{db: db}
}

// Stats считает 3 числа для верхней панели:
//   - активных проектов (status in 'Активный','Опубликован','Утверждён')
//   - команд внутри этих проектов (только launched=true)
//   - студентов в этих командах
func (r *CoordinatorDashboardRepository) Stats(ctx context.Context) (models.CoordinatorDashboardStats, error) {
	var s models.CoordinatorDashboardStats

	const activeProjectsQ = `
		SELECT COUNT(*) FROM projects
		WHERE status IN ('Активный', 'Опубликован', 'Утверждён')
	`
	if err := r.db.QueryRow(ctx, activeProjectsQ).Scan(&s.ActiveProjects); err != nil {
		return s, fmt.Errorf("coord dashboard: active projects: %w", err)
	}

	const teamsQ = `
		SELECT COUNT(*) FROM teams t
		JOIN projects p ON p.id = t.project_id
		WHERE p.status IN ('Активный', 'Опубликован', 'Утверждён')
		  AND COALESCE(t.launched, TRUE) = TRUE
	`
	if err := r.db.QueryRow(ctx, teamsQ).Scan(&s.Teams); err != nil {
		return s, fmt.Errorf("coord dashboard: teams: %w", err)
	}

	const studentsQ = `
		SELECT COUNT(*) FROM team_members tm
		JOIN teams t   ON t.id = tm.team_id
		JOIN projects p ON p.id = t.project_id
		WHERE p.status IN ('Активный', 'Опубликован', 'Утверждён')
		  AND COALESCE(t.launched, TRUE) = TRUE
	`
	if err := r.db.QueryRow(ctx, studentsQ).Scan(&s.Students); err != nil {
		return s, fmt.Errorf("coord dashboard: students: %w", err)
	}

	return s, nil
}

// Attention считает 2 алёрта для «Требует внимания».
//   - PendingApplications: проекты на утверждении (status='На утверждении')
//     + проекты с pending_proposal_data (change-requests от менторов).
//   - UnassignedStudents: студенты с qualified-заявкой, не вошедшие в команду.
func (r *CoordinatorDashboardRepository) Attention(ctx context.Context) (models.CoordinatorDashboardAttention, error) {
	var a models.CoordinatorDashboardAttention

	const pendingQ = `
		SELECT COUNT(*) FROM projects
		WHERE status = 'На утверждении'
		   OR pending_proposal_data IS NOT NULL
	`
	if err := r.db.QueryRow(ctx, pendingQ).Scan(&a.PendingApplications); err != nil {
		return a, fmt.Errorf("coord dashboard: pending: %w", err)
	}

	// Студенты с активной заявкой (Ожидает / Рекомендован / Принято ментором /
	// Принят), не вошедшие ни в одну команду. Делаем через LEFT JOIN
	// team_members + IS NULL.
	const unassignedQ = `
		SELECT COUNT(DISTINCT a.student_id)
		FROM applications a
		LEFT JOIN team_members tm ON tm.user_id = a.student_id
		WHERE a.status IN ('Ожидает', 'Рекомендован', 'Принято ментором', 'Принят')
		  AND tm.user_id IS NULL
	`
	if err := r.db.QueryRow(ctx, unassignedQ).Scan(&a.UnassignedStudents); err != nil {
		return a, fmt.Errorf("coord dashboard: unassigned: %w", err)
	}

	return a, nil
}
