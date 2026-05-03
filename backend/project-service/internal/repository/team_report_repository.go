package repository

import (
	"context"

	"github.com/hsse/project-service/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type TeamReportRepository struct {
	db *pgxpool.Pool
}

func NewTeamReportRepository(db *pgxpool.Pool) *TeamReportRepository {
	return &TeamReportRepository{db: db}
}

func (r *TeamReportRepository) Create(ctx context.Context, report *models.TeamReport) error {
	query := `
		INSERT INTO team_reports (sprint_id, team_id, summary, problems, next_plan, status, mentor_comment, submitted_at, reviewed_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		RETURNING id, created_at, updated_at
	`
	return r.db.QueryRow(ctx, query, report.SprintID, report.TeamID, report.Summary, report.Problems, report.NextPlan, report.Status, report.MentorComment, report.SubmittedAt, report.ReviewedAt).
		Scan(&report.ID, &report.CreatedAt, &report.UpdatedAt)
}

func (r *TeamReportRepository) GetByID(ctx context.Context, id int) (*models.TeamReport, error) {
	query := `
		SELECT id, sprint_id, team_id, COALESCE(summary,''), COALESCE(problems,''), COALESCE(next_plan,''), status,
		       COALESCE(mentor_comment,''), submitted_at, reviewed_at, created_at, updated_at
		FROM team_reports WHERE id = $1
	`
	report := &models.TeamReport{}
	scanFunc := func(s Scanner) error {
		return s.Scan(&report.ID, &report.SprintID, &report.TeamID, &report.Summary, &report.Problems, &report.NextPlan, &report.Status, &report.MentorComment, &report.SubmittedAt, &report.ReviewedAt, &report.CreatedAt, &report.UpdatedAt)
	}
	if err := ScanOne(r.db.QueryRow(ctx, query, id), scanFunc, "team report"); err != nil {
		return nil, err
	}
	return report, nil
}

func (r *TeamReportRepository) GetByTeamID(ctx context.Context, teamID int) ([]models.TeamReport, error) {
	query := `
		SELECT id, sprint_id, team_id, COALESCE(summary,''), COALESCE(problems,''), COALESCE(next_plan,''), status,
		       COALESCE(mentor_comment,''), submitted_at, reviewed_at, created_at, updated_at
		FROM team_reports WHERE team_id = $1 ORDER BY sprint_id
	`
	scanFunc := func(s Scanner) (models.TeamReport, error) {
		var report models.TeamReport
		err := s.Scan(&report.ID, &report.SprintID, &report.TeamID, &report.Summary, &report.Problems, &report.NextPlan, &report.Status, &report.MentorComment, &report.SubmittedAt, &report.ReviewedAt, &report.CreatedAt, &report.UpdatedAt)
		return report, err
	}
	return ScanAll(ctx, r.db, query, []interface{}{teamID}, scanFunc)
}

func (r *TeamReportRepository) GetByTeamAndSprint(ctx context.Context, teamID, sprintID int) (*models.TeamReport, error) {
	query := `
		SELECT id, sprint_id, team_id, COALESCE(summary,''), COALESCE(problems,''), COALESCE(next_plan,''), status,
		       COALESCE(mentor_comment,''), submitted_at, reviewed_at, created_at, updated_at
		FROM team_reports WHERE team_id = $1 AND sprint_id = $2
	`
	report := &models.TeamReport{}
	scanFunc := func(s Scanner) error {
		return s.Scan(&report.ID, &report.SprintID, &report.TeamID, &report.Summary, &report.Problems, &report.NextPlan, &report.Status, &report.MentorComment, &report.SubmittedAt, &report.ReviewedAt, &report.CreatedAt, &report.UpdatedAt)
	}
	if err := ScanOne(r.db.QueryRow(ctx, query, teamID, sprintID), scanFunc, "team report"); err != nil {
		return nil, err
	}
	return report, nil
}

func (r *TeamReportRepository) Update(ctx context.Context, report *models.TeamReport) error {
	result, err := r.db.Exec(
		ctx,
		`UPDATE team_reports
		 SET summary = $2, problems = $3, next_plan = $4, status = $5, mentor_comment = $6, submitted_at = $7, reviewed_at = $8
		 WHERE id = $1`,
		report.ID, report.Summary, report.Problems, report.NextPlan, report.Status, report.MentorComment, report.SubmittedAt, report.ReviewedAt,
	)
	if err != nil {
		return err
	}
	return CheckRowsAffected(result, "team report")
}
