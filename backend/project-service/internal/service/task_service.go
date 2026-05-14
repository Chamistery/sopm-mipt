package service

import (
	"context"
	"time"

	"github.com/hsse/project-service/internal/auth"
	"github.com/hsse/project-service/internal/models"
	"github.com/hsse/project-service/internal/repository"
)

type TaskService struct {
	tasks    repository.TaskRepositoryInterface
	sprints  repository.SprintRepositoryInterface
	teams    repository.TeamRepositoryInterface
	projects repository.ProjectRepositoryInterface
}

func NewTaskService(
	tasks repository.TaskRepositoryInterface,
	sprints repository.SprintRepositoryInterface,
	teams repository.TeamRepositoryInterface,
	projects repository.ProjectRepositoryInterface,
) *TaskService {
	return &TaskService{tasks: tasks, sprints: sprints, teams: teams, projects: projects}
}

func (s *TaskService) Create(ctx context.Context, user *auth.CurrentUser, task *models.Task) error {
	if err := RequireRoles(user, auth.RoleStudent, auth.RoleTeamLead, auth.RoleCoordinator); err != nil {
		return err
	}
	team, sprint, project, err := s.loadTeamSprintProject(ctx, task.TeamID, task.SprintID)
	if err != nil {
		return err
	}
	if team.ProjectID != sprint.ProjectID {
		return WrapStateError("team and sprint belong to different projects")
	}
	if task.StartDate < sprint.StartDate || task.EndDate > sprint.EndDate || task.StartDate > task.EndDate {
		return WrapStateError("task dates must fit into sprint dates")
	}
	if err := s.ensureAssigneeBelongsToTeam(ctx, team.ID, task.AssigneeID); err != nil {
		return err
	}
	if user.HasAnyRole(auth.RoleTeamLead) {
		if team.LeaderID == nil || *team.LeaderID != user.ID {
			return ErrForbidden
		}
		if err := s.ensureAssigneeBelongsToTeam(ctx, team.ID, task.AssigneeID); err != nil {
			return err
		}
	}
	if user.HasAnyRole(auth.RoleStudent) {
		if task.AssigneeID != user.ID {
			return ErrForbidden
		}
		isMember, err := s.teams.IsMember(ctx, team.ID, user.ID)
		if err != nil {
			return err
		}
		if !isMember {
			return ErrForbidden
		}
	}
	if user.HasAnyRole(auth.RoleCoordinator) {
		if project.ID == 0 {
			return ErrForbidden
		}
	}

	task.CreatedByID = user.ID
	task.Status = models.TaskStatusPendingApproval
	return s.tasks.Create(ctx, task)
}

func (s *TaskService) GetByID(ctx context.Context, user *auth.CurrentUser, id int) (*models.Task, error) {
	if err := s.sync(ctx); err != nil {
		return nil, err
	}
	task, err := s.tasks.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if err := s.ensureTaskVisible(ctx, user, task); err != nil {
		return nil, err
	}
	return task, nil
}

func (s *TaskService) List(ctx context.Context, user *auth.CurrentUser, filters repository.TaskFilters) ([]models.Task, error) {
	if err := s.sync(ctx); err != nil {
		return nil, err
	}
	tasks, err := s.tasks.GetList(ctx, filters)
	if err != nil {
		return nil, err
	}
	filtered := make([]models.Task, 0, len(tasks))
	for _, task := range tasks {
		if s.ensureTaskVisible(ctx, user, &task) == nil {
			filtered = append(filtered, task)
		}
	}
	return filtered, nil
}

func (s *TaskService) Update(ctx context.Context, user *auth.CurrentUser, update *models.Task) (*models.Task, error) {
	task, err := s.tasks.GetByID(ctx, update.ID)
	if err != nil {
		return nil, err
	}
	if err := s.ensureTaskEditor(ctx, user, task); err != nil {
		return nil, err
	}
	if task.Status == models.TaskStatusInReview || task.Status == models.TaskStatusDone || task.Status == models.TaskStatusRejected {
		return nil, WrapStateError("task cannot be edited in status %s", task.Status)
	}

	isMentorEditor := false
	if user.HasAnyRole(auth.RoleMentor) {
		if s.ensureMentorForTask(ctx, user, task) == nil {
			isMentorEditor = true
		}
	}

	if isMentorEditor {
		if update.StartDate != "" {
			task.StartDate = update.StartDate
		}
		if update.EndDate != "" {
			task.EndDate = update.EndDate
		}
	} else {
		update.StartDate = task.StartDate
		update.EndDate = task.EndDate
	}
	if update.Name != "" {
		task.Name = update.Name
	}
	task.Description = update.Description
	task.HoursEstimate = update.HoursEstimate
	task.MRLink = update.MRLink
	task.WorkDescription = update.WorkDescription
	if update.AssigneeID > 0 {
		if !isMentorEditor && user.HasAnyRole(auth.RoleStudent) && update.AssigneeID != task.AssigneeID {
			return nil, ErrForbidden
		}
		if err := s.ensureAssigneeBelongsToTeam(ctx, task.TeamID, update.AssigneeID); err != nil {
			return nil, err
		}
		task.AssigneeID = update.AssigneeID
	}
	if err := s.ensureTaskDates(ctx, task); err != nil {
		return nil, err
	}
	if err := s.tasks.Update(ctx, task); err != nil {
		return nil, err
	}
	return s.tasks.GetByID(ctx, task.ID)
}

func (s *TaskService) Approve(ctx context.Context, user *auth.CurrentUser, id int, comment string) (*models.Task, error) {
	return s.transitionTask(ctx, user, id, models.TaskStatusPendingApproval, models.TaskStatusAssigned, models.MentorCommentApprove, comment, "")
}

func (s *TaskService) Reject(ctx context.Context, user *auth.CurrentUser, id int, comment string) (*models.Task, error) {
	return s.transitionTask(ctx, user, id, models.TaskStatusPendingApproval, models.TaskStatusRejected, models.MentorCommentReject, comment, "")
}

func (s *TaskService) SubmitReview(ctx context.Context, user *auth.CurrentUser, id int) (*models.Task, error) {
	task, err := s.tasks.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if !user.IsAuthenticated() || user.ID != task.AssigneeID {
		return nil, ErrForbidden
	}
	if task.Status != models.TaskStatusInProgress && task.Status != models.TaskStatusReturned {
		return nil, WrapStateError("task cannot be submitted for review from status %s", task.Status)
	}
	task.Status = models.TaskStatusInReview
	task.History = append(task.History, models.TaskHistoryItem{
		Day:   s.taskDay(ctx, task),
		Event: models.TaskHistoryReview,
	})
	if err := s.tasks.Update(ctx, task); err != nil {
		return nil, err
	}
	return s.tasks.GetByID(ctx, id)
}

func (s *TaskService) Accept(ctx context.Context, user *auth.CurrentUser, id int, comment string) (*models.Task, error) {
	return s.transitionTask(ctx, user, id, models.TaskStatusInReview, models.TaskStatusDone, models.MentorCommentAccept, comment, string(models.TaskHistoryAccepted))
}

func (s *TaskService) Return(ctx context.Context, user *auth.CurrentUser, id int, comment string) (*models.Task, error) {
	return s.transitionTask(ctx, user, id, models.TaskStatusInReview, models.TaskStatusReturned, models.MentorCommentReturn, comment, string(models.TaskHistoryReturned))
}

func (s *TaskService) Delete(ctx context.Context, user *auth.CurrentUser, id int) error {
	task, err := s.tasks.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if task.Status != models.TaskStatusPendingApproval {
		return WrapStateError("task can only be deleted before mentor approval")
	}
	if user.ID != task.CreatedByID && !user.HasAnyRole(auth.RoleCoordinator) {
		return ErrForbidden
	}
	return s.tasks.SoftDelete(ctx, id, user.ID)
}

func (s *TaskService) transitionTask(
	ctx context.Context,
	user *auth.CurrentUser,
	id int,
	from models.TaskStatus,
	to models.TaskStatus,
	action models.MentorCommentAction,
	comment string,
	historyEvent string,
) (*models.Task, error) {
	task, err := s.tasks.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if err := s.ensureMentorForTask(ctx, user, task); err != nil {
		return nil, err
	}
	if task.Status != from {
		return nil, WrapStateError("task cannot move from %s to %s", task.Status, to)
	}
	task.Status = to
	task.MentorComments = append(task.MentorComments, models.MentorComment{Action: action, Text: comment, CreatedAt: time.Now()})
	switch historyEvent {
	case string(models.TaskHistoryAccepted):
		task.History = append(task.History, models.TaskHistoryItem{Day: s.taskDay(ctx, task), Event: models.TaskHistoryAccepted})
	case string(models.TaskHistoryReturned):
		task.History = append(task.History, models.TaskHistoryItem{Day: s.taskDay(ctx, task), Event: models.TaskHistoryReturned})
	}
	if err := s.tasks.Update(ctx, task); err != nil {
		return nil, err
	}
	return s.tasks.GetByID(ctx, id)
}

func (s *TaskService) ensureTaskVisible(ctx context.Context, user *auth.CurrentUser, task *models.Task) error {
	if err := RequireAuth(user); err != nil {
		return err
	}
	if user.HasAnyRole(auth.RoleCoordinator) {
		return nil
	}
	if user.ID == task.AssigneeID || user.ID == task.CreatedByID {
		return nil
	}
	team, _, project, err := s.loadTeamSprintProject(ctx, task.TeamID, task.SprintID)
	if err != nil {
		return err
	}
	if project.MentorID == user.ID {
		return nil
	}
	if team.LeaderID != nil && *team.LeaderID == user.ID {
		return nil
	}
	isMember, err := s.teams.IsMember(ctx, team.ID, user.ID)
	if err != nil {
		return err
	}
	if isMember {
		return nil
	}
	return ErrForbidden
}

func (s *TaskService) ensureTaskEditor(ctx context.Context, user *auth.CurrentUser, task *models.Task) error {
	if err := s.ensureTaskVisible(ctx, user, task); err != nil {
		return err
	}
	if user.HasAnyRole(auth.RoleCoordinator) {
		return nil
	}
	if user.ID == task.AssigneeID {
		return nil
	}
	team, _, _, err := s.loadTeamSprintProject(ctx, task.TeamID, task.SprintID)
	if err != nil {
		return err
	}
	if user.ID == task.CreatedByID && !user.HasAnyRole(auth.RoleStudent) {
		return nil
	}
	if team.LeaderID != nil && *team.LeaderID == user.ID {
		return nil
	}
	if s.ensureMentorForTask(ctx, user, task) == nil {
		return nil
	}
	return ErrForbidden
}

func (s *TaskService) ensureMentorForTask(ctx context.Context, user *auth.CurrentUser, task *models.Task) error {
	if err := RequireRoles(user, auth.RoleMentor); err != nil {
		return err
	}
	if user.HasAnyRole(auth.RoleCoordinator) {
		return nil
	}
	_, _, project, err := s.loadTeamSprintProject(ctx, task.TeamID, task.SprintID)
	if err != nil {
		return err
	}
	if project.MentorID != user.ID {
		return ErrForbidden
	}
	return nil
}

func (s *TaskService) loadTeamSprintProject(ctx context.Context, teamID, sprintID int) (*models.Team, *models.Sprint, *models.Project, error) {
	team, err := s.teams.GetByID(ctx, teamID)
	if err != nil {
		return nil, nil, nil, err
	}
	sprint, err := s.sprints.GetByID(ctx, sprintID)
	if err != nil {
		return nil, nil, nil, err
	}
	project, err := s.projects.GetByID(ctx, team.ProjectID)
	if err != nil {
		return nil, nil, nil, err
	}
	return team, sprint, project, nil
}

func (s *TaskService) taskDay(ctx context.Context, task *models.Task) int {
	sprint, err := s.sprints.GetByID(ctx, task.SprintID)
	if err != nil {
		return 0
	}
	start, err := time.Parse("2006-01-02", sprint.StartDate)
	if err != nil {
		return 0
	}
	return int(time.Since(start).Hours()/24) + 1
}

func (s *TaskService) sync(ctx context.Context) error {
	if err := s.tasks.AutoAdvanceAssigned(ctx); err != nil {
		return err
	}
	return s.tasks.MarkOverdue(ctx)
}

func (s *TaskService) ensureAssigneeBelongsToTeam(ctx context.Context, teamID, assigneeID int) error {
	isMember, err := s.teams.IsMember(ctx, teamID, assigneeID)
	if err != nil {
		return err
	}
	if !isMember {
		return WrapStateError("assignee must belong to the team")
	}
	return nil
}

func (s *TaskService) ensureTaskDates(ctx context.Context, task *models.Task) error {
	sprint, err := s.sprints.GetByID(ctx, task.SprintID)
	if err != nil {
		return err
	}
	if task.StartDate < sprint.StartDate || task.EndDate > sprint.EndDate || task.StartDate > task.EndDate {
		return WrapStateError("task dates must fit into sprint dates")
	}
	return nil
}
