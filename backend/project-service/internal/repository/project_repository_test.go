package repository

import (
	"context"
	"testing"

	"github.com/hsse/project-service/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

func cleanupProjects(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	_, err := pool.Exec(context.Background(), "TRUNCATE projects CASCADE")
	if err != nil {
		t.Fatalf("Failed to cleanup projects: %v", err)
	}
}

func TestProjectRepository_Create_Integration(t *testing.T) {
	pool := setupTestDB(t)
	defer pool.Close()
	cleanupProjects(t, pool)
	cleanupTemplates(t, pool)

	repo := NewProjectRepository(pool)
	templateRepo := NewTemplateRepository(pool)
	ctx := context.Background()

	template := &models.Template{
		Name:   "Test Template",
		Fields: models.TemplateFields{},
	}
	if err := templateRepo.Create(ctx, template); err != nil {
		t.Fatalf("Failed to create template: %v", err)
	}

	project := &models.Project{
		Title:       "Test Project",
		TemplateID:  template.ID,
		FieldValues: models.FieldValues{},
	}
	err := repo.Create(ctx, project)
	if err != nil {
		t.Errorf("Create() unexpected error = %v", err)
	}

	if project.ID == 0 {
		t.Error("Create() did not set project ID")
	}
}

func TestProjectRepository_GetByID_Integration(t *testing.T) {
	pool := setupTestDB(t)
	defer pool.Close()
	cleanupProjects(t, pool)
	cleanupTemplates(t, pool)

	repo := NewProjectRepository(pool)
	templateRepo := NewTemplateRepository(pool)
	ctx := context.Background()

	template := &models.Template{
		Name:   "Test Template",
		Fields: models.TemplateFields{},
	}
	if err := templateRepo.Create(ctx, template); err != nil {
		t.Fatalf("Failed to create template: %v", err)
	}

	project := &models.Project{
		Title:       "Test Project",
		TemplateID:  template.ID,
		FieldValues: models.FieldValues{},
	}
	if err := repo.Create(ctx, project); err != nil {
		t.Fatalf("Failed to create project: %v", err)
	}

	tests := []struct {
		name    string
		id      int
		wantErr bool
	}{
		{
			name:    "existing project",
			id:      project.ID,
			wantErr: false,
		},
		{
			name:    "non-existent project",
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
				if got.ID != project.ID {
					t.Errorf("GetByID() ID = %v, want %v", got.ID, project.ID)
				}
				if got.Title != project.Title {
					t.Errorf("GetByID() Title = %v, want %v", got.Title, project.Title)
				}
			}
		})
	}
}

func TestProjectRepository_GetList_Integration(t *testing.T) {
	pool := setupTestDB(t)
	defer pool.Close()
	cleanupProjects(t, pool)
	cleanupTemplates(t, pool)

	repo := NewProjectRepository(pool)
	templateRepo := NewTemplateRepository(pool)
	ctx := context.Background()

	template := &models.Template{
		Name:   "Test Template",
		Fields: models.TemplateFields{},
	}
	if err := templateRepo.Create(ctx, template); err != nil {
		t.Fatalf("Failed to create template: %v", err)
	}

	projects := []models.Project{
		{Title: "Project 1", TemplateID: template.ID, FieldValues: models.FieldValues{}},
		{Title: "Project 2", TemplateID: template.ID, FieldValues: models.FieldValues{}},
		{Title: "Project 3", TemplateID: template.ID, FieldValues: models.FieldValues{}},
	}

	for i := range projects {
		if err := repo.Create(ctx, &projects[i]); err != nil {
			t.Fatalf("Failed to create project: %v", err)
		}
	}

	tests := []struct {
		name       string
		filters    ProjectListFilters
		wantCount  int
		wantTotal  int
	}{
		{
			name: "get all projects",
			filters: ProjectListFilters{
				Limit:  10,
				Offset: 0,
			},
			wantCount: 3,
			wantTotal: 3,
		},
		{
			name: "pagination - first page",
			filters: ProjectListFilters{
				Limit:  2,
				Offset: 0,
			},
			wantCount: 2,
			wantTotal: 3,
		},
		{
			name: "pagination - second page",
			filters: ProjectListFilters{
				Limit:  2,
				Offset: 2,
			},
			wantCount: 1,
			wantTotal: 3,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			items, total, err := repo.GetList(ctx, tt.filters)
			if err != nil {
				t.Errorf("GetList() error = %v", err)
				return
			}

			if len(items) != tt.wantCount {
				t.Errorf("GetList() returned %d items, want %d", len(items), tt.wantCount)
			}

			if total != tt.wantTotal {
				t.Errorf("GetList() total = %d, want %d", total, tt.wantTotal)
			}
		})
	}
}

func TestProjectRepository_Delete_Integration(t *testing.T) {
	pool := setupTestDB(t)
	defer pool.Close()
	cleanupProjects(t, pool)
	cleanupTemplates(t, pool)

	repo := NewProjectRepository(pool)
	templateRepo := NewTemplateRepository(pool)
	ctx := context.Background()

	template := &models.Template{
		Name:   "Test Template",
		Fields: models.TemplateFields{},
	}
	if err := templateRepo.Create(ctx, template); err != nil {
		t.Fatalf("Failed to create template: %v", err)
	}

	project := &models.Project{
		Title:       "Test Project",
		TemplateID:  template.ID,
		FieldValues: models.FieldValues{},
	}
	if err := repo.Create(ctx, project); err != nil {
		t.Fatalf("Failed to create project: %v", err)
	}

	tests := []struct {
		name    string
		id      int
		wantErr bool
	}{
		{
			name:    "delete existing project",
			id:      project.ID,
			wantErr: false,
		},
		{
			name:    "delete non-existent project",
			id:      99999,
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
					t.Error("Project still exists after deletion")
				}
			}
		})
	}
}
