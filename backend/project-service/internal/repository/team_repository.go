package repository

import (
	"context"

	"github.com/hsse/project-service/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type TeamRepository struct {
	db *pgxpool.Pool
}

func NewTeamRepository(db *pgxpool.Pool) *TeamRepository {
	return &TeamRepository{db: db}
}

func (r *TeamRepository) Create(ctx context.Context, team *models.Team) error {
	query := `
		INSERT INTO teams (project_id, name, leader_id)
		VALUES ($1, $2, $3)
		RETURNING id, created_at, updated_at
	`
	return r.db.QueryRow(ctx, query, team.ProjectID, team.Name, team.LeaderID).Scan(&team.ID, &team.CreatedAt, &team.UpdatedAt)
}

func (r *TeamRepository) GetByID(ctx context.Context, id int) (*models.Team, error) {
	query := `
		SELECT t.id, t.project_id, t.name, t.leader_id, t.created_at, t.updated_at,
		       u.id, u.first_name, u.last_name
		FROM teams t
		LEFT JOIN users u ON u.id = t.leader_id
		WHERE t.id = $1
	`
	team := &models.Team{}
	var leaderID *int
	var leaderFirst, leaderLast *string
	scanFunc := func(s Scanner) error {
		return s.Scan(
			&team.ID, &team.ProjectID, &team.Name, &team.LeaderID, &team.CreatedAt, &team.UpdatedAt,
			&leaderID, &leaderFirst, &leaderLast,
		)
	}
	if err := ScanOne(r.db.QueryRow(ctx, query, id), scanFunc, "team"); err != nil {
		return nil, err
	}
	if leaderID != nil {
		team.Leader = &models.UserSummary{ID: *leaderID}
		if leaderFirst != nil {
			team.Leader.FirstName = *leaderFirst
		}
		if leaderLast != nil {
			team.Leader.LastName = *leaderLast
		}
	}

	members, err := r.getMembers(ctx, id, team.LeaderID)
	if err != nil {
		return nil, err
	}
	team.Members = members

	currentSprint, err := NewSprintRepository(r.db).GetCurrentByProjectID(ctx, team.ProjectID)
	if err == nil {
		team.CurrentSprint = currentSprint
	}

	return team, nil
}

func (r *TeamRepository) GetByProjectID(ctx context.Context, projectID int) ([]models.Team, error) {
	query := `
		SELECT id, project_id, name, leader_id, created_at, updated_at
		FROM teams
		WHERE project_id = $1
		ORDER BY id
	`
	scanFunc := func(s Scanner) (models.Team, error) {
		var team models.Team
		err := s.Scan(&team.ID, &team.ProjectID, &team.Name, &team.LeaderID, &team.CreatedAt, &team.UpdatedAt)
		return team, err
	}
	teams, err := ScanAll(ctx, r.db, query, []interface{}{projectID}, scanFunc)
	if err != nil {
		return nil, err
	}

	for i := range teams {
		members, err := r.getMembers(ctx, teams[i].ID, teams[i].LeaderID)
		if err != nil {
			return nil, err
		}
		teams[i].Members = members
	}

	currentSprint, err := NewSprintRepository(r.db).GetCurrentByProjectID(ctx, projectID)
	if err == nil {
		for i := range teams {
			teams[i].CurrentSprint = currentSprint
		}
	}

	return teams, nil
}

func (r *TeamRepository) Update(ctx context.Context, team *models.Team) error {
	result, err := r.db.Exec(ctx, "UPDATE teams SET name = $2, leader_id = $3 WHERE id = $1", team.ID, team.Name, team.LeaderID)
	if err != nil {
		return err
	}
	return CheckRowsAffected(result, "team")
}

func (r *TeamRepository) Delete(ctx context.Context, id int) error {
	result, err := r.db.Exec(ctx, "DELETE FROM teams WHERE id = $1", id)
	if err != nil {
		return err
	}
	return CheckRowsAffected(result, "team")
}

// SetLaunched переключает teams.launched (true/false). Используется
// distribution-страницей: ментор нажимает «Запустить команду» когда все
// слоты приняты.
func (r *TeamRepository) SetLaunched(ctx context.Context, id int, launched bool) error {
	result, err := r.db.Exec(ctx, "UPDATE teams SET launched = $2 WHERE id = $1", id, launched)
	if err != nil {
		return err
	}
	return CheckRowsAffected(result, "team")
}

func (r *TeamRepository) AddMember(ctx context.Context, member *models.TeamMember) error {
	query := `
		INSERT INTO team_members (team_id, user_id, role_in_team)
		VALUES ($1, $2, $3)
		RETURNING id, joined_at
	`
	return r.db.QueryRow(ctx, query, member.TeamID, member.UserID, member.RoleInTeam).Scan(&member.ID, &member.JoinedAt)
}

func (r *TeamRepository) RemoveMember(ctx context.Context, teamID, userID int) error {
	result, err := r.db.Exec(ctx, "DELETE FROM team_members WHERE team_id = $1 AND user_id = $2", teamID, userID)
	if err != nil {
		return err
	}
	return CheckRowsAffected(result, "team member")
}

func (r *TeamRepository) IsMember(ctx context.Context, teamID, userID int) (bool, error) {
	var exists bool
	err := r.db.QueryRow(
		ctx,
		"SELECT EXISTS(SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2)",
		teamID,
		userID,
	).Scan(&exists)
	return exists, err
}

func (r *TeamRepository) getMembers(ctx context.Context, teamID int, leaderID *int) ([]models.TeamMember, error) {
	query := `
		SELECT tm.id, tm.team_id, tm.user_id, COALESCE(tm.role_in_team, ''), tm.joined_at,
		       u.id, u.first_name, u.last_name
		FROM team_members tm
		JOIN users u ON u.id = tm.user_id
		WHERE tm.team_id = $1
		ORDER BY tm.id
	`
	scanFunc := func(s Scanner) (models.TeamMember, error) {
		var member models.TeamMember
		err := s.Scan(
			&member.ID,
			&member.TeamID,
			&member.UserID,
			&member.RoleInTeam,
			&member.JoinedAt,
			&member.User.ID,
			&member.User.FirstName,
			&member.User.LastName,
		)
		member.IsLeader = leaderID != nil && *leaderID == member.UserID
		return member, err
	}
	return ScanAll(ctx, r.db, query, []interface{}{teamID}, scanFunc)
}
