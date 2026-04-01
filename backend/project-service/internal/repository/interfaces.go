package repository

import (
	"context"

	"github.com/hsse/project-service/internal/models"
)

type TemplateRepositoryInterface interface {
	Create(ctx context.Context, template *models.Template) error
	GetAll(ctx context.Context) ([]models.Template, error)
	GetByID(ctx context.Context, id string) (*models.Template, error)
	Update(ctx context.Context, template *models.Template) error
	Delete(ctx context.Context, id string) error
}

type ProjectRepositoryInterface interface {
	Create(ctx context.Context, project *models.Project) error
	GetList(ctx context.Context, filters ProjectListFilters) ([]models.ProjectListItem, int, error)
	GetByID(ctx context.Context, id int) (*models.Project, error)
	Update(ctx context.Context, project *models.Project) error
	Delete(ctx context.Context, id int) error
}

type ApplicationRepositoryInterface interface {
	Create(ctx context.Context, app *models.Application) error
	GetByID(ctx context.Context, id int) (*models.Application, error)
	GetByStudentID(ctx context.Context, studentID int) ([]models.ApplicationWithProject, error)
	GetByProjectID(ctx context.Context, projectID int) ([]models.Application, error)
	Update(ctx context.Context, app *models.Application) error
	Delete(ctx context.Context, id int) error
	UpdatePriorities(ctx context.Context, studentID int, applications []models.Application) error
}

type UserRepositoryInterface interface {
	Create(ctx context.Context, user *models.User) error
	GetByID(ctx context.Context, id int) (*models.User, error)
	GetAll(ctx context.Context) ([]models.User, error)
}
