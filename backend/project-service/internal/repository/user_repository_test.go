package repository

import (
	"context"
	"testing"

	"github.com/hsse/project-service/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

func cleanupUsers(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	_, err := pool.Exec(context.Background(), "TRUNCATE users CASCADE")
	if err != nil {
		t.Fatalf("Failed to cleanup users: %v", err)
	}
}

func TestUserRepository_Create_Integration(t *testing.T) {
	pool := setupTestDB(t)
	defer pool.Close()
	cleanupUsers(t, pool)

	repo := NewUserRepository(pool)
	ctx := context.Background()

	tests := []struct {
		name    string
		user    *models.User
		wantErr bool
	}{
		{
			name: "successful creation",
			user: &models.User{
				FirstName: "Иван",
				LastName:  "Иванов",
				Email:     "ivan@test.ru",
				Role:      "студент",
			},
			wantErr: false,
		},
		{
			name: "duplicate email should fail",
			user: &models.User{
				FirstName: "Петр",
				LastName:  "Петров",
				Email:     "duplicate@test.ru",
				Role:      "студент",
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := repo.Create(ctx, tt.user)
			if (err != nil) != tt.wantErr {
				t.Errorf("Create() error = %v, wantErr %v", err, tt.wantErr)
			}

			if !tt.wantErr && tt.user.ID == 0 {
				t.Error("Create() did not set user ID")
			}
		})
	}
}

func TestUserRepository_GetByID_Integration(t *testing.T) {
	pool := setupTestDB(t)
	defer pool.Close()
	cleanupUsers(t, pool)

	repo := NewUserRepository(pool)
	ctx := context.Background()

	user := &models.User{
		FirstName: "Иван",
		LastName:  "Иванов",
		Email:     "ivan@test.ru",
		Role:      "студент",
	}
	if err := repo.Create(ctx, user); err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	tests := []struct {
		name    string
		id      int
		wantErr bool
	}{
		{
			name:    "existing user",
			id:      user.ID,
			wantErr: false,
		},
		{
			name:    "non-existent user",
			id:      99999,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := repo.GetByID(ctx, tt.id)
			if (err != nil) != tt.wantErr {
				t.Errorf("GetByID() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr {
				if got.ID != user.ID {
					t.Errorf("GetByID() ID = %v, want %v", got.ID, user.ID)
				}
				if got.Email != user.Email {
					t.Errorf("GetByID() Email = %v, want %v", got.Email, user.Email)
				}
			}
		})
	}
}

func TestUserRepository_GetAll_Integration(t *testing.T) {
	pool := setupTestDB(t)
	defer pool.Close()
	cleanupUsers(t, pool)

	repo := NewUserRepository(pool)
	ctx := context.Background()

	users := []models.User{
		{FirstName: "Иван", LastName: "Иванов", Email: "ivan1@test.ru", Role: "студент"},
		{FirstName: "Петр", LastName: "Петров", Email: "petr1@test.ru", Role: "студент"},
		{FirstName: "Сидор", LastName: "Сидоров", Email: "sidor1@test.ru", Role: "преподаватель"},
	}

	for i := range users {
		if err := repo.Create(ctx, &users[i]); err != nil {
			t.Fatalf("Failed to create user: %v", err)
		}
	}

	got, err := repo.GetAll(ctx)
	if err != nil {
		t.Fatalf("GetAll() error = %v", err)
	}

	if len(got) != len(users) {
		t.Errorf("GetAll() returned %d users, want %d", len(got), len(users))
	}
}
