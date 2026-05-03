package repository

import (
	"context"

	"github.com/hsse/project-service/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SprintScoreRepository struct {
	db *pgxpool.Pool
}

func NewSprintScoreRepository(db *pgxpool.Pool) *SprintScoreRepository {
	return &SprintScoreRepository{db: db}
}

func (r *SprintScoreRepository) Create(ctx context.Context, score *models.SprintScore) error {
	query := `
		INSERT INTO sprint_scores (sprint_id, team_id, student_id, score, comment, scored_by_id)
		VALUES ($1,$2,$3,$4,$5,$6)
		RETURNING id, created_at, updated_at
	`
	return r.db.QueryRow(ctx, query, score.SprintID, score.TeamID, score.StudentID, score.Score, score.Comment, score.ScoredByID).
		Scan(&score.ID, &score.CreatedAt, &score.UpdatedAt)
}

func (r *SprintScoreRepository) GetByID(ctx context.Context, id int) (*models.SprintScore, error) {
	query := `
		SELECT s.id, s.sprint_id, s.team_id, s.student_id, u.id, u.first_name, u.last_name,
		       s.score, COALESCE(s.comment,''), s.scored_by_id, s.created_at, s.updated_at
		FROM sprint_scores s
		JOIN users u ON u.id = s.student_id
		WHERE s.id = $1
	`
	score := &models.SprintScore{}
	scanFunc := func(scanner Scanner) error {
		score.Student = &models.UserSummary{}
		return scanner.Scan(&score.ID, &score.SprintID, &score.TeamID, &score.StudentID, &score.Student.ID, &score.Student.FirstName, &score.Student.LastName, &score.Score, &score.Comment, &score.ScoredByID, &score.CreatedAt, &score.UpdatedAt)
	}
	if err := ScanOne(r.db.QueryRow(ctx, query, id), scanFunc, "sprint score"); err != nil {
		return nil, err
	}
	return score, nil
}

func (r *SprintScoreRepository) GetBySprintAndTeam(ctx context.Context, sprintID, teamID int) ([]models.SprintScore, error) {
	query := `
		SELECT s.id, s.sprint_id, s.team_id, s.student_id, u.id, u.first_name, u.last_name,
		       s.score, COALESCE(s.comment,''), s.scored_by_id, s.created_at, s.updated_at
		FROM sprint_scores s
		JOIN users u ON u.id = s.student_id
		WHERE s.sprint_id = $1 AND s.team_id = $2
		ORDER BY s.student_id
	`
	scanFunc := func(scanner Scanner) (models.SprintScore, error) {
		score := models.SprintScore{Student: &models.UserSummary{}}
		err := scanner.Scan(&score.ID, &score.SprintID, &score.TeamID, &score.StudentID, &score.Student.ID, &score.Student.FirstName, &score.Student.LastName, &score.Score, &score.Comment, &score.ScoredByID, &score.CreatedAt, &score.UpdatedAt)
		return score, err
	}
	return ScanAll(ctx, r.db, query, []interface{}{sprintID, teamID}, scanFunc)
}

func (r *SprintScoreRepository) GetByStudentID(ctx context.Context, studentID int) ([]models.SprintScore, error) {
	query := `
		SELECT s.id, s.sprint_id, s.team_id, s.student_id, u.id, u.first_name, u.last_name,
		       s.score, COALESCE(s.comment,''), s.scored_by_id, s.created_at, s.updated_at
		FROM sprint_scores s
		JOIN users u ON u.id = s.student_id
		WHERE s.student_id = $1
		ORDER BY s.sprint_id
	`
	scanFunc := func(scanner Scanner) (models.SprintScore, error) {
		score := models.SprintScore{Student: &models.UserSummary{}}
		err := scanner.Scan(&score.ID, &score.SprintID, &score.TeamID, &score.StudentID, &score.Student.ID, &score.Student.FirstName, &score.Student.LastName, &score.Score, &score.Comment, &score.ScoredByID, &score.CreatedAt, &score.UpdatedAt)
		return score, err
	}
	return ScanAll(ctx, r.db, query, []interface{}{studentID}, scanFunc)
}

func (r *SprintScoreRepository) Update(ctx context.Context, score *models.SprintScore) error {
	result, err := r.db.Exec(ctx, `UPDATE sprint_scores SET score = $2, comment = $3, scored_by_id = $4 WHERE id = $1`, score.ID, score.Score, score.Comment, score.ScoredByID)
	if err != nil {
		return err
	}
	return CheckRowsAffected(result, "sprint score")
}
