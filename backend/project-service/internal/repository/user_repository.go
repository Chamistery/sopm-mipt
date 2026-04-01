package repository

import (
	"context"
	"fmt"

	"github.com/doug-martin/goqu/v9"
	_ "github.com/doug-martin/goqu/v9/dialect/postgres"
	"github.com/hsse/project-service/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UserRepository struct {
	db      *pgxpool.Pool
	dialect goqu.DialectWrapper
}

func NewUserRepository(db *pgxpool.Pool) *UserRepository {
	return &UserRepository{
		db:      db,
		dialect: goqu.Dialect("postgres"),
	}
}

func (r *UserRepository) Create(ctx context.Context, user *models.User) error {
	sql, args, err := r.dialect.Insert("users").
		Rows(goqu.Record{
			"first_name": user.FirstName,
			"last_name":  user.LastName,
			"email":      user.Email,
			"role":       user.Role,
			"company":    user.Company,
			"course":     user.Course,
			"group":      user.Group,
			"avatar":     user.Avatar,
		}).
		Returning("id").
		ToSQL()
	if err != nil {
		return fmt.Errorf("failed to build insert query: %w", err)
	}

	return r.db.QueryRow(ctx, sql, args...).Scan(&user.ID)
}

func (r *UserRepository) GetByID(ctx context.Context, id int) (*models.User, error) {
	sql, args, err := r.dialect.From("users").
		Select("id", "first_name", "last_name", "email", "role", "company", "course", "group", "avatar").
		Where(goqu.C("id").Eq(id)).
		ToSQL()
	if err != nil {
		return nil, fmt.Errorf("failed to build select query: %w", err)
	}

	user := &models.User{}

	scanFunc := func(s Scanner) error {
		return s.Scan(
			&user.ID,
			&user.FirstName,
			&user.LastName,
			&user.Email,
			&user.Role,
			&user.Company,
			&user.Course,
			&user.Group,
			&user.Avatar,
		)
	}

	if err := ScanOne(r.db.QueryRow(ctx, sql, args...), scanFunc, "user"); err != nil {
		return nil, err
	}

	return user, nil
}

func (r *UserRepository) GetAll(ctx context.Context) ([]models.User, error) {
	sql, args, err := r.dialect.From("users").
		Select("id", "first_name", "last_name", "email", "role", "company", "course", "group", "avatar").
		ToSQL()
	if err != nil {
		return nil, fmt.Errorf("failed to build select query: %w", err)
	}

	scanFunc := func(s Scanner) (models.User, error) {
		var user models.User
		err := s.Scan(
			&user.ID,
			&user.FirstName,
			&user.LastName,
			&user.Email,
			&user.Role,
			&user.Company,
			&user.Course,
			&user.Group,
			&user.Avatar,
		)
		return user, err
	}

	return ScanAll(ctx, r.db, sql, args, scanFunc)
}
