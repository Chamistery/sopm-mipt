package service

import (
	"context"
	"testing"

	"github.com/hsse/project-service/internal/auth"
	"github.com/hsse/project-service/internal/models"
	"github.com/hsse/project-service/internal/repository"
)

type stubTaskRepo struct {
	task *models.Task
	last *models.Task
}

func (s *stubTaskRepo) Create(_ context.Context, task *models.Task) error {
	cloned := *task
	s.last = &cloned
	s.task = &cloned
	return nil
}
func (s *stubTaskRepo) GetByID(context.Context, int) (*models.Task, error) { return s.task, nil }
func (s *stubTaskRepo) GetList(context.Context, repository.TaskFilters) ([]models.Task, error) {
	return []models.Task{*s.task}, nil
}
func (s *stubTaskRepo) Update(_ context.Context, task *models.Task) error {
	cloned := *task
	s.task = &cloned
	return nil
}
func (s *stubTaskRepo) SoftDelete(context.Context, int, int) error { return nil }
func (s *stubTaskRepo) AutoAdvanceAssigned(context.Context) error  { return nil }
func (s *stubTaskRepo) MarkOverdue(context.Context) error          { return nil }

type stubSprintRepo struct{ sprint *models.Sprint }

func (s *stubSprintRepo) Create(context.Context, *models.Sprint) error            { return nil }
func (s *stubSprintRepo) CreateBatch(context.Context, int, []models.Sprint) error { return nil }
func (s *stubSprintRepo) GetByID(context.Context, int) (*models.Sprint, error)    { return s.sprint, nil }
func (s *stubSprintRepo) GetByProjectID(context.Context, int) ([]models.Sprint, error) {
	return []models.Sprint{*s.sprint}, nil
}
func (s *stubSprintRepo) GetCurrentByProjectID(context.Context, int) (*models.Sprint, error) {
	return s.sprint, nil
}
func (s *stubSprintRepo) Update(context.Context, *models.Sprint) error { return nil }

type stubTeamRepoForTask struct {
	team      *models.Team
	members   map[int]bool
	memberErr error
}

func (s *stubTeamRepoForTask) Create(context.Context, *models.Team) error         { return nil }
func (s *stubTeamRepoForTask) GetByID(context.Context, int) (*models.Team, error) { return s.team, nil }
func (s *stubTeamRepoForTask) GetByProjectID(context.Context, int) ([]models.Team, error) {
	return []models.Team{*s.team}, nil
}
func (s *stubTeamRepoForTask) Update(context.Context, *models.Team) error          { return nil }
func (s *stubTeamRepoForTask) Delete(context.Context, int) error                   { return nil }
func (s *stubTeamRepoForTask) SetLaunched(context.Context, int, bool) error        { return nil }
func (s *stubTeamRepoForTask) AddMember(context.Context, *models.TeamMember) error { return nil }
func (s *stubTeamRepoForTask) RemoveMember(context.Context, int, int) error        { return nil }
func (s *stubTeamRepoForTask) IsMember(_ context.Context, _ int, userID int) (bool, error) {
	if s.memberErr != nil {
		return false, s.memberErr
	}
	if s.members == nil {
		return true, nil
	}
	return s.members[userID], nil
}

func TestTaskServiceApprove(t *testing.T) {
	mentorID := 3
	repo := &stubTaskRepo{task: &models.Task{
		ID:          1,
		TeamID:      2,
		SprintID:    4,
		AssigneeID:  7,
		CreatedByID: 7,
		Status:      models.TaskStatusPendingApproval,
	}}
	svc := NewTaskService(
		repo,
		&stubSprintRepo{sprint: &models.Sprint{ID: 4, ProjectID: 10, StartDate: "2026-04-01", EndDate: "2026-04-15"}},
		&stubTeamRepoForTask{team: &models.Team{ID: 2, ProjectID: 10}},
		&stubProjectRepo{project: &models.Project{ID: 10, MentorID: mentorID}},
	)

	task, err := svc.Approve(context.Background(), &auth.CurrentUser{ID: mentorID, Role: auth.RoleMentor}, 1, "ok")
	if err != nil {
		t.Fatalf("Approve() error = %v", err)
	}
	if task.Status != models.TaskStatusAssigned {
		t.Fatalf("expected task to be assigned, got %s", task.Status)
	}
	if len(task.MentorComments) != 1 || task.MentorComments[0].Action != models.MentorCommentApprove {
		t.Fatalf("expected approve comment to be appended")
	}
}

func TestTaskServiceCreateStudentCanCreateOnlyForSelf(t *testing.T) {
	repo := &stubTaskRepo{}
	svc := NewTaskService(
		repo,
		&stubSprintRepo{sprint: &models.Sprint{ID: 4, ProjectID: 10, StartDate: "2026-04-01", EndDate: "2026-04-15"}},
		&stubTeamRepoForTask{
			team:    &models.Team{ID: 2, ProjectID: 10},
			members: map[int]bool{7: true, 8: true},
		},
		&stubProjectRepo{project: &models.Project{ID: 10, MentorID: 3}},
	)

	err := svc.Create(context.Background(), &auth.CurrentUser{ID: 7, Role: auth.RoleStudent}, &models.Task{
		SprintID:   4,
		TeamID:     2,
		AssigneeID: 8,
		Name:       "other student task",
		StartDate:  "2026-04-02",
		EndDate:    "2026-04-05",
	})
	if err == nil {
		t.Fatalf("expected forbidden error when student creates task for another user")
	}
}

func TestTaskServiceCreateTeamLeadRequiresTeamMemberAssignee(t *testing.T) {
	leaderID := 11
	repo := &stubTaskRepo{}
	svc := NewTaskService(
		repo,
		&stubSprintRepo{sprint: &models.Sprint{ID: 4, ProjectID: 10, StartDate: "2026-04-01", EndDate: "2026-04-15"}},
		&stubTeamRepoForTask{
			team:    &models.Team{ID: 2, ProjectID: 10, LeaderID: &leaderID},
			members: map[int]bool{leaderID: true},
		},
		&stubProjectRepo{project: &models.Project{ID: 10, MentorID: 3}},
	)

	err := svc.Create(context.Background(), &auth.CurrentUser{ID: leaderID, Role: auth.RoleTeamLead}, &models.Task{
		SprintID:   4,
		TeamID:     2,
		AssigneeID: 99,
		Name:       "outsider task",
		StartDate:  "2026-04-02",
		EndDate:    "2026-04-05",
	})
	if err == nil {
		t.Fatalf("expected validation error when assignee is not in team")
	}
}
