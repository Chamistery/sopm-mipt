package service

import (
	"context"
	"testing"
	"time"

	"github.com/hsse/project-service/internal/auth"
	"github.com/hsse/project-service/internal/models"
	"github.com/hsse/project-service/internal/repository"
)

type stubApplicationRepo struct {
	byID               map[int]*models.Application
	byStudentAndStatus []models.Application
	byStudent          []models.ApplicationWithProject
	updated            []*models.Application
}

func (s *stubApplicationRepo) Create(context.Context, *models.Application) error { return nil }
func (s *stubApplicationRepo) GetByID(_ context.Context, id int) (*models.Application, error) {
	return s.byID[id], nil
}
func (s *stubApplicationRepo) GetByStudentID(context.Context, int) ([]models.ApplicationWithProject, error) {
	return s.byStudent, nil
}
func (s *stubApplicationRepo) GetByProjectID(context.Context, int) ([]models.ApplicationWithProject, error) {
	return nil, nil
}
func (s *stubApplicationRepo) GetByStudentAndStatus(context.Context, int, ...models.ApplicationStatus) ([]models.Application, error) {
	return s.byStudentAndStatus, nil
}
func (s *stubApplicationRepo) Update(_ context.Context, app *models.Application) error {
	cloned := *app
	s.updated = append(s.updated, &cloned)
	s.byID[app.ID] = &cloned
	return nil
}
func (s *stubApplicationRepo) Delete(context.Context, int) error { return nil }

type stubProjectRepo struct{ project *models.Project }

func (s *stubProjectRepo) Create(context.Context, *models.Project) error { return nil }
func (s *stubProjectRepo) GetList(context.Context, repository.ProjectListFilters) ([]models.ProjectListItem, int, error) {
	return nil, 0, nil
}
func (s *stubProjectRepo) GetByID(context.Context, int) (*models.Project, error) {
	return s.project, nil
}
func (s *stubProjectRepo) GetFull(context.Context, int) (*models.ProjectFull, error) { return nil, nil }
func (s *stubProjectRepo) GetApplicants(context.Context, int) (*models.ProjectApplicantsResponse, error) {
	return nil, nil
}
func (s *stubProjectRepo) Update(context.Context, *models.Project) error { return nil }
func (s *stubProjectRepo) Delete(context.Context, int) error             { return nil }

type stubUserRepo struct{ user *models.User }

func (s *stubUserRepo) Create(context.Context, *models.User) error         { return nil }
func (s *stubUserRepo) GetByID(context.Context, int) (*models.User, error) { return s.user, nil }
func (s *stubUserRepo) GetAll(context.Context) ([]models.User, error)      { return nil, nil }
func (s *stubUserRepo) GetTeam(context.Context, int) (*models.Team, error) { return nil, nil }

type stubTeamRepo struct {
	added []*models.TeamMember
	team  *models.Team
}

func (s *stubTeamRepo) Create(context.Context, *models.Team) error                 { return nil }
func (s *stubTeamRepo) GetByID(context.Context, int) (*models.Team, error)         { return s.team, nil }
func (s *stubTeamRepo) GetByProjectID(context.Context, int) ([]models.Team, error) { return nil, nil }
func (s *stubTeamRepo) Update(context.Context, *models.Team) error                 { return nil }
func (s *stubTeamRepo) Delete(context.Context, int) error                          { return nil }
func (s *stubTeamRepo) AddMember(_ context.Context, member *models.TeamMember) error {
	s.added = append(s.added, member)
	return nil
}
func (s *stubTeamRepo) RemoveMember(context.Context, int, int) error     { return nil }
func (s *stubTeamRepo) IsMember(context.Context, int, int) (bool, error) { return false, nil }

func TestApplicationServiceAcceptAutoDeclinesOtherInvites(t *testing.T) {
	teamID := 5
	now := time.Now()
	appRepo := &stubApplicationRepo{
		byID: map[int]*models.Application{
			1: {ID: 1, StudentID: 7, TeamID: &teamID, Status: models.ApplicationStatusMentorAccepted},
		},
		byStudentAndStatus: []models.Application{
			{ID: 1, StudentID: 7, TeamID: &teamID, Status: models.ApplicationStatusMentorAccepted},
			{ID: 2, StudentID: 7, Status: models.ApplicationStatusMentorAccepted, InvitedAt: &now},
		},
	}
	svc := NewApplicationService(
		appRepo,
		&stubProjectRepo{},
		&stubUserRepo{},
		&stubTeamRepo{},
		5,
	)

	app, err := svc.Accept(context.Background(), &auth.CurrentUser{ID: 7, Role: auth.RoleStudent}, 1)
	if err != nil {
		t.Fatalf("Accept() error = %v", err)
	}
	if app.Status != models.ApplicationStatusAccepted {
		t.Fatalf("expected accepted status, got %s", app.Status)
	}
	if len(appRepo.updated) < 2 {
		t.Fatalf("expected accepted application and auto-declined invitation to be updated")
	}
	if appRepo.byID[2].Status != models.ApplicationStatusAutoDeclined {
		t.Fatalf("expected second invitation to be auto declined, got %s", appRepo.byID[2].Status)
	}
}

func TestApplicationServiceCreateRejectsDuplicatePriority(t *testing.T) {
	svc := NewApplicationService(
		&stubApplicationRepo{
			byStudent: []models.ApplicationWithProject{
				{Application: models.Application{ProjectID: 11, Priority: 1}},
			},
		},
		&stubProjectRepo{project: &models.Project{ID: 10, Courses: []int{2}, MinGPA: 6.0}},
		&stubUserRepo{user: &models.User{ID: 7, Course: "2", GPA: 7.5}},
		&stubTeamRepo{},
		5,
	)

	err := svc.Create(context.Background(), &auth.CurrentUser{ID: 7, Role: auth.RoleStudent}, &models.Application{
		ProjectID: 10,
		StudentID: 7,
		Priority:  1,
	})
	if err == nil {
		t.Fatalf("expected duplicate priority to be rejected")
	}
}

func TestApplicationServiceRecommendRejectsForeignTeam(t *testing.T) {
	appRepo := &stubApplicationRepo{
		byID: map[int]*models.Application{
			1: {ID: 1, ProjectID: 10, StudentID: 7, Status: models.ApplicationStatusPending},
		},
	}
	svc := NewApplicationService(
		appRepo,
		&stubProjectRepo{project: &models.Project{ID: 10, MentorID: 42}},
		&stubUserRepo{},
		&stubTeamRepo{team: &models.Team{ID: 5, ProjectID: 999}},
		5,
	)

	_, err := svc.Recommend(context.Background(), &auth.CurrentUser{ID: 42, Role: auth.RoleMentor}, 1, 5)
	if err == nil {
		t.Fatalf("expected recommend to reject team from another project")
	}
}
