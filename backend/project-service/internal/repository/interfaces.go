package repository

import (
	"context"
	"encoding/json"

	"github.com/hsse/project-service/internal/models"
)

type ProjectRepositoryInterface interface {
	Create(ctx context.Context, project *models.Project) error
	GetList(ctx context.Context, filters ProjectListFilters) ([]models.ProjectListItem, int, error)
	GetByID(ctx context.Context, id int) (*models.Project, error)
	GetFull(ctx context.Context, id int) (*models.ProjectFull, error)
	GetApplicants(ctx context.Context, id int) (*models.ProjectApplicantsResponse, error)
	GetPredecessor(ctx context.Context, id int) (*models.Project, error)
	GetProposal(ctx context.Context, id int) (*json.RawMessage, int, error)
	Update(ctx context.Context, project *models.Project) error
	Delete(ctx context.Context, id int) error
	SubmitChangeRequest(ctx context.Context, projectID int, proposalData json.RawMessage, userID int) (*models.Project, error)
	ApproveChangeRequest(ctx context.Context, projectID int) (*models.Project, error)
	RejectChangeRequest(ctx context.Context, projectID int) (*models.Project, error)
}

type ApplicationRepositoryInterface interface {
	Create(ctx context.Context, app *models.Application) error
	GetByID(ctx context.Context, id int) (*models.Application, error)
	GetByStudentID(ctx context.Context, studentID int) ([]models.ApplicationWithProject, error)
	GetByProjectID(ctx context.Context, projectID int) ([]models.ApplicationWithProject, error)
	GetByStudentAndStatus(ctx context.Context, studentID int, statuses ...models.ApplicationStatus) ([]models.Application, error)
	Update(ctx context.Context, app *models.Application) error
	Delete(ctx context.Context, id int) error
}

type UserRepositoryInterface interface {
	Create(ctx context.Context, user *models.User) error
	GetByID(ctx context.Context, id int) (*models.User, error)
	GetAll(ctx context.Context) ([]models.User, error)
	GetTeam(ctx context.Context, userID int) (*models.Team, error)
}

type TeamRepositoryInterface interface {
	Create(ctx context.Context, team *models.Team) error
	GetByID(ctx context.Context, id int) (*models.Team, error)
	GetByProjectID(ctx context.Context, projectID int) ([]models.Team, error)
	Update(ctx context.Context, team *models.Team) error
	Delete(ctx context.Context, id int) error
	SetLaunched(ctx context.Context, id int, launched bool) error
	AddMember(ctx context.Context, member *models.TeamMember) error
	RemoveMember(ctx context.Context, teamID, userID int) error
	IsMember(ctx context.Context, teamID, userID int) (bool, error)
}

type SprintRepositoryInterface interface {
	Create(ctx context.Context, sprint *models.Sprint) error
	CreateBatch(ctx context.Context, projectID int, sprints []models.Sprint) error
	GetByID(ctx context.Context, id int) (*models.Sprint, error)
	GetByProjectID(ctx context.Context, projectID int) ([]models.Sprint, error)
	GetCurrentByProjectID(ctx context.Context, projectID int) (*models.Sprint, error)
	Update(ctx context.Context, sprint *models.Sprint) error
}

type TaskRepositoryInterface interface {
	Create(ctx context.Context, task *models.Task) error
	GetByID(ctx context.Context, id int) (*models.Task, error)
	GetList(ctx context.Context, filters TaskFilters) ([]models.Task, error)
	Update(ctx context.Context, task *models.Task) error
	SoftDelete(ctx context.Context, id int, deletedBy int) error
	AutoAdvanceAssigned(ctx context.Context) error
	MarkOverdue(ctx context.Context) error
}

type TeamReportRepositoryInterface interface {
	Create(ctx context.Context, report *models.TeamReport) error
	GetByID(ctx context.Context, id int) (*models.TeamReport, error)
	GetByTeamID(ctx context.Context, teamID int) ([]models.TeamReport, error)
	GetByTeamAndSprint(ctx context.Context, teamID, sprintID int) (*models.TeamReport, error)
	Update(ctx context.Context, report *models.TeamReport) error
}

type SprintScoreRepositoryInterface interface {
	Create(ctx context.Context, score *models.SprintScore) error
	GetByID(ctx context.Context, id int) (*models.SprintScore, error)
	GetBySprintAndTeam(ctx context.Context, sprintID, teamID int) ([]models.SprintScore, error)
	GetByStudentID(ctx context.Context, studentID int) ([]models.SprintScore, error)
	Update(ctx context.Context, score *models.SprintScore) error
}

type MeetingRepositoryInterface interface {
	Create(ctx context.Context, meeting *models.Meeting) error
	GetByID(ctx context.Context, id int) (*models.Meeting, error)
	GetByTeamID(ctx context.Context, teamID int, upcomingOnly bool) ([]models.Meeting, error)
	Update(ctx context.Context, meeting *models.Meeting) error
	Delete(ctx context.Context, id int) error
}

type UserProfileRepositoryInterface interface {
	GetByUserID(ctx context.Context, userID int) (*models.UserProfile, error)
	Upsert(ctx context.Context, profile *models.UserProfile) error
	UpdateNotificationsSeenAt(ctx context.Context, userID int) error
}

type UserFileRepositoryInterface interface {
	Create(ctx context.Context, file *models.UserFile) error
	GetByUserID(ctx context.Context, userID int) ([]models.UserFile, error)
	GetByID(ctx context.Context, id int) (*models.UserFile, error)
	Delete(ctx context.Context, id int) error
}

type TaskFilters struct {
	SprintID   int
	TeamID     int
	AssigneeID int
}
