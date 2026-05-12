package repository

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/hsse/project-service/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

// CoordinatorApplicationsRepository — список проектов, требующих
// решения координатора: status='На утверждении' (новая заявка) или
// pending_proposal_data IS NOT NULL (заявка на редактирование).
type CoordinatorApplicationsRepository struct {
	db *pgxpool.Pool
}

func NewCoordinatorApplicationsRepository(db *pgxpool.Pool) *CoordinatorApplicationsRepository {
	return &CoordinatorApplicationsRepository{db: db}
}

func (r *CoordinatorApplicationsRepository) List(ctx context.Context) ([]models.Project, error) {
	const q = `
		SELECT p.id, p.title, p.status, p.mentor_id, COALESCE(p.company, ''),
		       COALESCE(p.courses, '{}'),
		       COALESCE(p.description, ''), COALESCE(p.full_description, ''),
		       COALESCE(p.technologies, '{}'),
		       p.team_size_min, p.team_size_max, p.num_teams,
		       COALESCE(p.min_gpa, 0),
		       COALESCE(p.edu_result, ''), COALESCE(p.acceptance_criteria, ''),
		       COALESCE(p.goal, ''), COALESCE(p.expected_result, ''),
		       COALESCE(p.competencies, ''), COALESCE(p.resources, ''),
		       COALESCE(p.duration_semesters, 1),
		       p.predecessor_project_id, p.submitted_at,
		       p.created_at, p.updated_at,
		       p.proposal_data, p.pending_proposal_data, p.pending_submitted_at,
		       p.pending_submitted_by_id,
		       COALESCE(u.first_name, ''), COALESCE(u.last_name, '')
		FROM projects p
		LEFT JOIN users u ON u.id = p.mentor_id
		WHERE p.status = 'На утверждении'
		   OR p.pending_proposal_data IS NOT NULL
		ORDER BY COALESCE(p.pending_submitted_at, p.submitted_at, p.created_at) DESC
	`
	rows, err := r.db.Query(ctx, q)
	if err != nil {
		return nil, fmt.Errorf("coord applications: query: %w", err)
	}
	defer rows.Close()

	var out []models.Project
	for rows.Next() {
		var (
			p              models.Project
			proposalRaw    []byte
			pendingRaw     []byte
			mentorFirst    string
			mentorLast     string
		)
		if err := rows.Scan(
			&p.ID, &p.Title, &p.Status, &p.MentorID, &p.Company,
			&p.Courses,
			&p.Description, &p.FullDescription,
			&p.Technologies,
			&p.TeamSizeMin, &p.TeamSizeMax, &p.NumTeams,
			&p.MinGPA,
			&p.EduResult, &p.AcceptanceCriteria,
			&p.Goal, &p.ExpectedResult,
			&p.Competencies, &p.Resources,
			&p.DurationSemesters,
			&p.PredecessorProjectID, &p.SubmittedAt,
			&p.CreatedAt, &p.UpdatedAt,
			&proposalRaw, &pendingRaw, &p.PendingSubmittedAt,
			&p.PendingSubmittedByID,
			&mentorFirst, &mentorLast,
		); err != nil {
			return nil, fmt.Errorf("coord applications: scan: %w", err)
		}
		if len(proposalRaw) > 0 {
			raw := json.RawMessage(append([]byte(nil), proposalRaw...))
			p.ProposalData = &raw
		}
		if len(pendingRaw) > 0 {
			raw := json.RawMessage(append([]byte(nil), pendingRaw...))
			p.PendingProposalData = &raw
		}
		if p.MentorID > 0 {
			p.Mentor = &models.UserSummary{
				ID:        p.MentorID,
				FirstName: mentorFirst,
				LastName:  mentorLast,
			}
		}
		out = append(out, p)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if out == nil {
		out = []models.Project{}
	}
	return out, nil
}
