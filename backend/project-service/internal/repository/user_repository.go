package repository

import (
	"context"

	"github.com/hsse/project-service/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UserRepository struct {
	db *pgxpool.Pool
}

func NewUserRepository(db *pgxpool.Pool) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) Create(ctx context.Context, user *models.User) error {
	query := `
		INSERT INTO users (
			first_name, last_name, middle_name, email, role, company, course, "group", avatar, gpa, direction
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
		RETURNING id
	`

	return r.db.QueryRow(
		ctx,
		query,
		user.FirstName,
		user.LastName,
		user.MiddleName,
		user.Email,
		user.Role,
		user.Company,
		user.Course,
		user.Group,
		user.Avatar,
		user.GPA,
		user.Direction,
	).Scan(&user.ID)
}

func (r *UserRepository) GetByID(ctx context.Context, id int) (*models.User, error) {
	query := `
		SELECT id, first_name, last_name, middle_name, email, role, company, course, "group", avatar, COALESCE(gpa, 0), direction
		FROM users
		WHERE id = $1
	`

	user := &models.User{}
	scanFunc := func(s Scanner) error {
		return s.Scan(
			&user.ID,
			&user.FirstName,
			&user.LastName,
			&user.MiddleName,
			&user.Email,
			&user.Role,
			&user.Company,
			&user.Course,
			&user.Group,
			&user.Avatar,
			&user.GPA,
			&user.Direction,
		)
	}

	if err := ScanOne(r.db.QueryRow(ctx, query, id), scanFunc, "user"); err != nil {
		return nil, err
	}

	return user, nil
}

func (r *UserRepository) GetAll(ctx context.Context) ([]models.User, error) {
	query := `
		SELECT id, first_name, last_name, middle_name, email, role, company, course, "group", avatar, COALESCE(gpa, 0), direction
		FROM users
		ORDER BY id
	`

	scanFunc := func(s Scanner) (models.User, error) {
		var user models.User
		err := s.Scan(
			&user.ID,
			&user.FirstName,
			&user.LastName,
			&user.MiddleName,
			&user.Email,
			&user.Role,
			&user.Company,
			&user.Course,
			&user.Group,
			&user.Avatar,
			&user.GPA,
			&user.Direction,
		)
		return user, err
	}

	return ScanAll(ctx, r.db, query, nil, scanFunc)
}

func (r *UserRepository) GetTeam(ctx context.Context, userID int) (*models.Team, error) {
	query := `
		SELECT t.id, t.project_id, t.name, t.leader_id, t.created_at, t.updated_at
		FROM teams t
		JOIN team_members tm ON tm.team_id = t.id
		WHERE tm.user_id = $1
		LIMIT 1
	`

	team := &models.Team{}
	scanFunc := func(s Scanner) error {
		return s.Scan(&team.ID, &team.ProjectID, &team.Name, &team.LeaderID, &team.CreatedAt, &team.UpdatedAt)
	}

	if err := ScanOne(r.db.QueryRow(ctx, query, userID), scanFunc, "team"); err != nil {
		return nil, err
	}

	return team, nil
}
