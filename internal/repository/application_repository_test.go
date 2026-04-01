package repository

import (
	"context"
	"testing"

	"github.com/hsse/project-service/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

func cleanupApplications(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	_, err := pool.Exec(context.Background(), "TRUNCATE applications CASCADE")
	if err != nil {
		t.Fatalf("Failed to cleanup applications: %v", err)
	}
}

func TestApplicationRepository_Create_Integration(t *testing.T) {
	pool := setupTestDB(t)
	defer pool.Close()
	cleanupApplications(t, pool)
	cleanupProjects(t, pool)
	cleanupTemplates(t, pool)
	cleanupUsers(t, pool)

	repo := NewApplicationRepository(pool)
	projectRepo := NewProjectRepository(pool)
	templateRepo := NewTemplateRepository(pool)
	userRepo := NewUserRepository(pool)
	ctx := context.Background()

	template := &models.Template{Name: "Test Template", Fields: models.TemplateFields{}}
	if err := templateRepo.Create(ctx, template); err != nil {
		t.Fatalf("Failed to create template: %v", err)
	}

	project := &models.Project{Title: "Test Project", TemplateID: template.ID, FieldValues: models.FieldValues{}}
	if err := projectRepo.Create(ctx, project); err != nil {
		t.Fatalf("Failed to create project: %v", err)
	}

	user := &models.User{FirstName: "Иван", LastName: "Иванов", Email: "test@test.ru", Role: "студент"}
	if err := userRepo.Create(ctx, user); err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	tests := []struct {
		name        string
		application *models.Application
		wantErr     bool
	}{
		{
			name: "successful creation",
			application: &models.Application{
				ProjectID: project.ID,
				StudentID: user.ID,
				Priority:  1,
				Status:    "Подано",
			},
			wantErr: false,
		},
		{
			name: "missing project id",
			application: &models.Application{
				ProjectID: 0,
				StudentID: user.ID,
				Priority:  1,
				Status:    "Подано",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := repo.Create(ctx, tt.application)
			if (err != nil) != tt.wantErr {
				t.Errorf("Create() error = %v, wantErr %v", err, tt.wantErr)
			}

			if !tt.wantErr && tt.application.ID == 0 {
				t.Error("Create() did not set application ID")
			}
		})
	}
}

func TestApplicationRepository_GetByID_Integration(t *testing.T) {
	pool := setupTestDB(t)
	defer pool.Close()
	cleanupApplications(t, pool)
	cleanupProjects(t, pool)
	cleanupTemplates(t, pool)
	cleanupUsers(t, pool)

	repo := NewApplicationRepository(pool)
	projectRepo := NewProjectRepository(pool)
	templateRepo := NewTemplateRepository(pool)
	userRepo := NewUserRepository(pool)
	ctx := context.Background()

	template := &models.Template{Name: "Test Template", Fields: models.TemplateFields{}}
	if err := templateRepo.Create(ctx, template); err != nil {
		t.Fatalf("Failed to create template: %v", err)
	}

	project := &models.Project{Title: "Test Project", TemplateID: template.ID, FieldValues: models.FieldValues{}}
	if err := projectRepo.Create(ctx, project); err != nil {
		t.Fatalf("Failed to create project: %v", err)
	}

	user := &models.User{FirstName: "Иван", LastName: "Иванов", Email: "test@test.ru", Role: "студент"}
	if err := userRepo.Create(ctx, user); err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	application := &models.Application{
		ProjectID: project.ID,
		StudentID: user.ID,
		Priority:  1,
		Status:    "Подано",
	}
	if err := repo.Create(ctx, application); err != nil {
		t.Fatalf("Failed to create application: %v", err)
	}

	tests := []struct {
		name    string
		id      int
		wantErr bool
	}{
		{
			name:    "existing application",
			id:      application.ID,
			wantErr: false,
		},
		{
			name:    "non-existent application",
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
				if got.ID != application.ID {
					t.Errorf("GetByID() ID = %v, want %v", got.ID, application.ID)
				}
				if got.Priority != application.Priority {
					t.Errorf("GetByID() Priority = %v, want %v", got.Priority, application.Priority)
				}
			}
		})
	}
}

func TestApplicationRepository_GetByStudentID_Integration(t *testing.T) {
	pool := setupTestDB(t)
	defer pool.Close()
	cleanupApplications(t, pool)
	cleanupProjects(t, pool)
	cleanupTemplates(t, pool)
	cleanupUsers(t, pool)

	repo := NewApplicationRepository(pool)
	projectRepo := NewProjectRepository(pool)
	templateRepo := NewTemplateRepository(pool)
	userRepo := NewUserRepository(pool)
	ctx := context.Background()

	template := &models.Template{Name: "Test Template", Fields: models.TemplateFields{}}
	if err := templateRepo.Create(ctx, template); err != nil {
		t.Fatalf("Failed to create template: %v", err)
	}

	project1 := &models.Project{Title: "Test Project 1", TemplateID: template.ID, FieldValues: models.FieldValues{}}
	if err := projectRepo.Create(ctx, project1); err != nil {
		t.Fatalf("Failed to create project: %v", err)
	}

	project2 := &models.Project{Title: "Test Project 2", TemplateID: template.ID, FieldValues: models.FieldValues{}}
	if err := projectRepo.Create(ctx, project2); err != nil {
		t.Fatalf("Failed to create project: %v", err)
	}

	user := &models.User{FirstName: "Иван", LastName: "Иванов", Email: "test@test.ru", Role: "студент"}
	if err := userRepo.Create(ctx, user); err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	applications := []models.Application{
		{ProjectID: project1.ID, StudentID: user.ID, Priority: 1, Status: "Подано"},
		{ProjectID: project2.ID, StudentID: user.ID, Priority: 2, Status: "Подано"},
	}

	for i := range applications {
		if err := repo.Create(ctx, &applications[i]); err != nil {
			t.Fatalf("Failed to create application: %v", err)
		}
	}

	got, err := repo.GetByStudentID(ctx, user.ID)
	if err != nil {
		t.Fatalf("GetByStudentID() error = %v", err)
	}

	if len(got) != len(applications) {
		t.Errorf("GetByStudentID() returned %d applications, want %d", len(got), len(applications))
	}
}

func TestApplicationRepository_GetByProjectID_Integration(t *testing.T) {
	pool := setupTestDB(t)
	defer pool.Close()
	cleanupApplications(t, pool)
	cleanupProjects(t, pool)
	cleanupTemplates(t, pool)
	cleanupUsers(t, pool)

	repo := NewApplicationRepository(pool)
	projectRepo := NewProjectRepository(pool)
	templateRepo := NewTemplateRepository(pool)
	userRepo := NewUserRepository(pool)
	ctx := context.Background()

	template := &models.Template{Name: "Test Template", Fields: models.TemplateFields{}}
	if err := templateRepo.Create(ctx, template); err != nil {
		t.Fatalf("Failed to create template: %v", err)
	}

	project := &models.Project{Title: "Test Project", TemplateID: template.ID, FieldValues: models.FieldValues{}}
	if err := projectRepo.Create(ctx, project); err != nil {
		t.Fatalf("Failed to create project: %v", err)
	}

	user1 := &models.User{FirstName: "Иван", LastName: "Иванов", Email: "ivan@test.ru", Role: "студент"}
	if err := userRepo.Create(ctx, user1); err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	user2 := &models.User{FirstName: "Петр", LastName: "Петров", Email: "petr@test.ru", Role: "студент"}
	if err := userRepo.Create(ctx, user2); err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	applications := []models.Application{
		{ProjectID: project.ID, StudentID: user1.ID, Priority: 1, Status: "Подано"},
		{ProjectID: project.ID, StudentID: user2.ID, Priority: 1, Status: "Подано"},
	}

	for i := range applications {
		if err := repo.Create(ctx, &applications[i]); err != nil {
			t.Fatalf("Failed to create application: %v", err)
		}
	}

	got, err := repo.GetByProjectID(ctx, project.ID)
	if err != nil {
		t.Fatalf("GetByProjectID() error = %v", err)
	}

	if len(got) != len(applications) {
		t.Errorf("GetByProjectID() returned %d applications, want %d", len(got), len(applications))
	}
}

func TestApplicationRepository_Update_Integration(t *testing.T) {
	pool := setupTestDB(t)
	defer pool.Close()
	cleanupApplications(t, pool)
	cleanupProjects(t, pool)
	cleanupTemplates(t, pool)
	cleanupUsers(t, pool)

	repo := NewApplicationRepository(pool)
	projectRepo := NewProjectRepository(pool)
	templateRepo := NewTemplateRepository(pool)
	userRepo := NewUserRepository(pool)
	ctx := context.Background()

	template := &models.Template{Name: "Test Template", Fields: models.TemplateFields{}}
	if err := templateRepo.Create(ctx, template); err != nil {
		t.Fatalf("Failed to create template: %v", err)
	}

	project := &models.Project{Title: "Test Project", TemplateID: template.ID, FieldValues: models.FieldValues{}}
	if err := projectRepo.Create(ctx, project); err != nil {
		t.Fatalf("Failed to create project: %v", err)
	}

	user := &models.User{FirstName: "Иван", LastName: "Иванов", Email: "test@test.ru", Role: "студент"}
	if err := userRepo.Create(ctx, user); err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	application := &models.Application{
		ProjectID: project.ID,
		StudentID: user.ID,
		Priority:  1,
		Status:    "Подано",
	}
	if err := repo.Create(ctx, application); err != nil {
		t.Fatalf("Failed to create application: %v", err)
	}

	application.Status = "Принято"
	application.Priority = 2

	err := repo.Update(ctx, application)
	if err != nil {
		t.Fatalf("Update() error = %v", err)
	}

	updated, err := repo.GetByID(ctx, application.ID)
	if err != nil {
		t.Fatalf("GetByID() error = %v", err)
	}

	if updated.Status != "Принято" {
		t.Errorf("Update() Status = %v, want Принято", updated.Status)
	}

	if updated.Priority != 2 {
		t.Errorf("Update() Priority = %v, want 2", updated.Priority)
	}
}

func TestApplicationRepository_Delete_Integration(t *testing.T) {
	pool := setupTestDB(t)
	defer pool.Close()
	cleanupApplications(t, pool)
	cleanupProjects(t, pool)
	cleanupTemplates(t, pool)
	cleanupUsers(t, pool)

	repo := NewApplicationRepository(pool)
	projectRepo := NewProjectRepository(pool)
	templateRepo := NewTemplateRepository(pool)
	userRepo := NewUserRepository(pool)
	ctx := context.Background()

	template := &models.Template{Name: "Test Template", Fields: models.TemplateFields{}}
	if err := templateRepo.Create(ctx, template); err != nil {
		t.Fatalf("Failed to create template: %v", err)
	}

	project := &models.Project{Title: "Test Project", TemplateID: template.ID, FieldValues: models.FieldValues{}}
	if err := projectRepo.Create(ctx, project); err != nil {
		t.Fatalf("Failed to create project: %v", err)
	}

	user := &models.User{FirstName: "Иван", LastName: "Иванов", Email: "test@test.ru", Role: "студент"}
	if err := userRepo.Create(ctx, user); err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	application := &models.Application{
		ProjectID: project.ID,
		StudentID: user.ID,
		Priority:  1,
		Status:    "Подано",
	}
	if err := repo.Create(ctx, application); err != nil {
		t.Fatalf("Failed to create application: %v", err)
	}

	tests := []struct {
		name    string
		id      int
		wantErr bool
	}{
		{
			name:    "delete existing application",
			id:      application.ID,
			wantErr: false,
		},
		{
			name:    "delete non-existent application",
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
					t.Error("Application still exists after deletion")
				}
			}
		})
	}
}

func TestApplicationRepository_UpdatePriorities_Integration(t *testing.T) {
	pool := setupTestDB(t)
	defer pool.Close()
	cleanupApplications(t, pool)
	cleanupProjects(t, pool)
	cleanupTemplates(t, pool)
	cleanupUsers(t, pool)

	repo := NewApplicationRepository(pool)
	projectRepo := NewProjectRepository(pool)
	templateRepo := NewTemplateRepository(pool)
	userRepo := NewUserRepository(pool)
	ctx := context.Background()

	template := &models.Template{Name: "Test Template", Fields: models.TemplateFields{}}
	if err := templateRepo.Create(ctx, template); err != nil {
		t.Fatalf("Failed to create template: %v", err)
	}

	project1 := &models.Project{Title: "Test Project 1", TemplateID: template.ID, FieldValues: models.FieldValues{}}
	if err := projectRepo.Create(ctx, project1); err != nil {
		t.Fatalf("Failed to create project: %v", err)
	}

	project2 := &models.Project{Title: "Test Project 2", TemplateID: template.ID, FieldValues: models.FieldValues{}}
	if err := projectRepo.Create(ctx, project2); err != nil {
		t.Fatalf("Failed to create project: %v", err)
	}

	user := &models.User{FirstName: "Иван", LastName: "Иванов", Email: "test@test.ru", Role: "студент"}
	if err := userRepo.Create(ctx, user); err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	app1 := &models.Application{ProjectID: project1.ID, StudentID: user.ID, Priority: 1, Status: "Подано"}
	if err := repo.Create(ctx, app1); err != nil {
		t.Fatalf("Failed to create application: %v", err)
	}

	app2 := &models.Application{ProjectID: project2.ID, StudentID: user.ID, Priority: 2, Status: "Подано"}
	if err := repo.Create(ctx, app2); err != nil {
		t.Fatalf("Failed to create application: %v", err)
	}

	updatedApps := []models.Application{
		{ID: app1.ID, Priority: 3},
		{ID: app2.ID, Priority: 4},
	}

	err := repo.UpdatePriorities(ctx, user.ID, updatedApps)
	if err != nil {
		t.Fatalf("UpdatePriorities() error = %v", err)
	}

	got1, err := repo.GetByID(ctx, app1.ID)
	if err != nil {
		t.Fatalf("GetByID() error = %v", err)
	}
	if got1.Priority != 3 {
		t.Errorf("UpdatePriorities() app1 Priority = %v, want 3", got1.Priority)
	}

	got2, err := repo.GetByID(ctx, app2.ID)
	if err != nil {
		t.Fatalf("GetByID() error = %v", err)
	}
	if got2.Priority != 4 {
		t.Errorf("UpdatePriorities() app2 Priority = %v, want 4", got2.Priority)
	}
}
