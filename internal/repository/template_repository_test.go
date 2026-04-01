package repository

import (
	"context"
	"testing"

	"github.com/hsse/project-service/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

func setupTestDB(t *testing.T) *pgxpool.Pool {
	t.Helper()

	dsn := "host=localhost port=5432 user=postgres password=postgres dbname=sopm sslmode=disable"
	pool, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	if err := pool.Ping(context.Background()); err != nil {
		t.Fatalf("Failed to ping test database: %v", err)
	}

	return pool
}

func cleanupTemplates(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	_, err := pool.Exec(context.Background(), "TRUNCATE templates CASCADE")
	if err != nil {
		t.Fatalf("Failed to cleanup templates: %v", err)
	}
}

func TestTemplateRepository_Create_Integration(t *testing.T) {
	pool := setupTestDB(t)
	defer pool.Close()
	cleanupTemplates(t, pool)

	repo := NewTemplateRepository(pool)
	ctx := context.Background()

	template := &models.Template{
		Name:   "Test Template",
		Fields: models.TemplateFields{},
	}
	err := repo.Create(ctx, template)
	if err != nil {
		t.Errorf("Create() unexpected error = %v", err)
	}
}

func TestTemplateRepository_GetByID_Integration(t *testing.T) {
	pool := setupTestDB(t)
	defer pool.Close()
	cleanupTemplates(t, pool)

	repo := NewTemplateRepository(pool)
	ctx := context.Background()

	template := &models.Template{
		Name:   "Test Template",
		Fields: models.TemplateFields{},
	}
	if err := repo.Create(ctx, template); err != nil {
		t.Fatalf("Failed to create template: %v", err)
	}

	tests := []struct {
		name    string
		id      string
		wantErr bool
	}{
		{
			name:    "existing template",
			id:      template.ID,
			wantErr: false,
		},
		{
			name:    "non-existent template",
			id:      "00000000-0000-0000-0000-000000000000",
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
				if got.ID != template.ID {
					t.Errorf("GetByID() ID = %v, want %v", got.ID, template.ID)
				}
				if got.Name != template.Name {
					t.Errorf("GetByID() Name = %v, want %v", got.Name, template.Name)
				}
			}
		})
	}
}

func TestTemplateRepository_GetAll_Integration(t *testing.T) {
	pool := setupTestDB(t)
	defer pool.Close()
	cleanupTemplates(t, pool)

	repo := NewTemplateRepository(pool)
	ctx := context.Background()

	templates := []models.Template{
		{ID: "template-1", Name: "Template 1", Fields: models.TemplateFields{}},
		{ID: "template-2", Name: "Template 2", Fields: models.TemplateFields{}},
		{ID: "template-3", Name: "Template 3", Fields: models.TemplateFields{}},
	}

	for i := range templates {
		if err := repo.Create(ctx, &templates[i]); err != nil {
			t.Fatalf("Failed to create template: %v", err)
		}
	}

	got, err := repo.GetAll(ctx)
	if err != nil {
		t.Fatalf("GetAll() error = %v", err)
	}

	if len(got) != len(templates) {
		t.Errorf("GetAll() returned %d templates, want %d", len(got), len(templates))
	}
}

func TestTemplateRepository_Delete_Integration(t *testing.T) {
	pool := setupTestDB(t)
	defer pool.Close()
	cleanupTemplates(t, pool)

	repo := NewTemplateRepository(pool)
	ctx := context.Background()

	template := &models.Template{
		Name:   "Test Template",
		Fields: models.TemplateFields{},
	}
	if err := repo.Create(ctx, template); err != nil {
		t.Fatalf("Failed to create template: %v", err)
	}

	tests := []struct {
		name    string
		id      string
		wantErr bool
	}{
		{
			name:    "delete existing template",
			id:      template.ID,
			wantErr: false,
		},
		{
			name:    "delete non-existent template",
			id:      "00000000-0000-0000-0000-000000000000",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := repo.Delete(ctx, tt.id)
			if (err != nil) != tt.wantErr {
				t.Errorf("Delete() error = %v, wantErr %v", err, tt.wantErr)
			}

			if !tt.wantErr {
				_, err := repo.GetByID(ctx, tt.id)
				if err == nil {
					t.Error("Template still exists after deletion")
				}
			}
		})
	}
}
