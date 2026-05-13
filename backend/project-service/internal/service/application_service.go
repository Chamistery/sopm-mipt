package service

import (
	"context"
	"log"
	"strconv"
	"time"

	"github.com/hsse/project-service/internal/auth"
	"github.com/hsse/project-service/internal/models"
	"github.com/hsse/project-service/internal/repository"
)

// logDist пишет короткую строку про действие на странице распределения.
// Префикс [dist] делает легко grep'ать docker logs sopm-project-service.
func logDist(action string, user *auth.CurrentUser, format string, args ...interface{}) {
	userPart := "anon"
	if user != nil {
		userPart = strconv.Itoa(user.ID) + ":" + string(user.Role)
	}
	log.Printf("[dist] %s by=%s "+format, append([]interface{}{action, userPart}, args...)...)
}

type ApplicationService struct {
	applications repository.ApplicationRepositoryInterface
	projects     repository.ProjectRepositoryInterface
	users        repository.UserRepositoryInterface
	teams        repository.TeamRepositoryInterface
	maxChoices   int
}

func NewApplicationService(
	applications repository.ApplicationRepositoryInterface,
	projects repository.ProjectRepositoryInterface,
	users repository.UserRepositoryInterface,
	teams repository.TeamRepositoryInterface,
	maxChoices int,
) *ApplicationService {
	return &ApplicationService{
		applications: applications,
		projects:     projects,
		users:        users,
		teams:        teams,
		maxChoices:   maxChoices,
	}
}

func (s *ApplicationService) Create(ctx context.Context, user *auth.CurrentUser, app *models.Application) error {
	logDist("create.start", user, "studentId=%d projectId=%d priority=%d", app.StudentID, app.ProjectID, app.Priority)
	if err := RequireRoles(user, auth.RoleStudent, auth.RoleCoordinator, auth.RoleAdmin); err != nil {
		return err
	}
	if user.HasAnyRole(auth.RoleStudent) && user.ID != app.StudentID {
		return ErrForbidden
	}
	if app.Priority < 1 || app.Priority > s.maxChoices {
		return WrapStateError("priority must be between 1 and %d", s.maxChoices)
	}
	existingApps, err := s.applications.GetByStudentID(ctx, app.StudentID)
	if err != nil {
		return err
	}
	if len(existingApps) >= s.maxChoices {
		return WrapStateError("student cannot submit more than %d applications", s.maxChoices)
	}
	for _, existing := range existingApps {
		if existing.Priority == app.Priority {
			return WrapStateError("priority %d is already used", app.Priority)
		}
		if existing.ProjectID == app.ProjectID {
			return WrapStateError("application for this project already exists")
		}
	}

	project, err := s.projects.GetByID(ctx, app.ProjectID)
	if err != nil {
		return err
	}
	student, err := s.users.GetByID(ctx, app.StudentID)
	if err != nil {
		return err
	}

	if qualifiesForProject(project, student) {
		app.Status = models.ApplicationStatusPending
	} else {
		app.Status = models.ApplicationStatusUnqualified
	}

	if err := s.applications.Create(ctx, app); err != nil {
		logDist("create.repo_err", user, "studentId=%d projectId=%d err=%v", app.StudentID, app.ProjectID, err)
		return err
	}
	logDist("create.ok", user, "id=%d studentId=%d projectId=%d status=%s",
		app.ID, app.StudentID, app.ProjectID, app.Status)
	return nil
}

func (s *ApplicationService) Recommend(ctx context.Context, user *auth.CurrentUser, applicationID int, teamID int) (*models.Application, error) {
	logDist("recommend.start", user, "appId=%d teamId=%d", applicationID, teamID)
	app, project, err := s.loadManagedApplication(ctx, user, applicationID)
	if err != nil {
		logDist("recommend.load_err", user, "appId=%d err=%v", applicationID, err)
		return nil, err
	}
	logDist("recommend.loaded", user, "appId=%d projectId=%d studentId=%d fromStatus=%s fromTeamId=%v",
		applicationID, app.ProjectID, app.StudentID, app.Status, app.TeamID)
	// Ментор: только из «холодных» статусов (Ожидает / Не рекомендован /
	// Не подходит). Координатор/админ может перевести из любого статуса
	// (admin.html status-menu разрешает «Заявка не отправлена» как обратный
	// шаг от Принят/Принято ментором).
	if app.Status != models.ApplicationStatusPending &&
		app.Status != models.ApplicationStatusNotRecommended &&
		app.Status != models.ApplicationStatusUnqualified {
		if !user.HasAnyRole(auth.RoleCoordinator, auth.RoleAdmin) {
			logDist("recommend.forbid_status", user, "appId=%d status=%s", applicationID, app.Status)
			return nil, WrapStateError("application cannot be recommended from status %s", app.Status)
		}
	}
	team, err := s.teams.GetByID(ctx, teamID)
	if err != nil {
		logDist("recommend.team_err", user, "teamId=%d err=%v", teamID, err)
		return nil, err
	}
	if team.ProjectID != project.ID {
		logDist("recommend.project_mismatch", user, "appId=%d appProjectId=%d teamProjectId=%d",
			applicationID, project.ID, team.ProjectID)
		return nil, WrapStateError("team must belong to the same project")
	}
	app.TeamID = &teamID
	app.Status = models.ApplicationStatusRecommended
	if err := s.applications.Update(ctx, app); err != nil {
		logDist("recommend.update_err", user, "appId=%d err=%v", applicationID, err)
		return nil, err
	}
	logDist("recommend.ok", user, "appId=%d studentId=%d teamId=%d", applicationID, app.StudentID, teamID)
	return s.applications.GetByID(ctx, app.ID)
}

func (s *ApplicationService) Unrecommend(ctx context.Context, user *auth.CurrentUser, applicationID int) (*models.Application, error) {
	logDist("unrecommend.start", user, "appId=%d", applicationID)
	app, _, err := s.loadManagedApplication(ctx, user, applicationID)
	if err != nil {
		logDist("unrecommend.load_err", user, "appId=%d err=%v", applicationID, err)
		return nil, err
	}
	logDist("unrecommend.loaded", user, "appId=%d projectId=%d studentId=%d fromStatus=%s fromTeamId=%v",
		applicationID, app.ProjectID, app.StudentID, app.Status, app.TeamID)
	// Idempotent: студент уже в пуле — возвращаем как есть, без ошибки.
	if app.TeamID == nil && app.Status == models.ApplicationStatusNotRecommended {
		logDist("unrecommend.idempotent", user, "appId=%d", applicationID)
		return app, nil
	}
	// Ментор: только из 'Рекомендован' (прототип mentor.html:3021-3025 — после
	// отправки приглашения чип «зафиксирован»). Координатор/админ: из любого
	// статуса, связанного с командой, чтобы можно было вернуть в пул
	// принятого студента (admin.html распределение).
	if app.Status != models.ApplicationStatusRecommended &&
		!user.HasAnyRole(auth.RoleCoordinator, auth.RoleAdmin) {
		logDist("unrecommend.forbid_status", user, "appId=%d status=%s", applicationID, app.Status)
		return nil, WrapStateError("application cannot be removed from team from status %s", app.Status)
	}
	// Запоминаем команду до сброса, чтобы удалить запись team_members
	// (она появляется после Accept; без удаления студент остаётся в team_members
	// и не показывается в глобальном пуле координатора).
	prevTeamID := app.TeamID
	app.TeamID = nil
	app.Status = models.ApplicationStatusNotRecommended
	if err := s.applications.Update(ctx, app); err != nil {
		logDist("unrecommend.update_err", user, "appId=%d err=%v", applicationID, err)
		return nil, err
	}
	if prevTeamID != nil {
		exists, checkErr := s.teams.IsMember(ctx, *prevTeamID, app.StudentID)
		if checkErr == nil && exists {
			if rmErr := s.teams.RemoveMember(ctx, *prevTeamID, app.StudentID); rmErr != nil {
				logDist("unrecommend.tm_remove_err", user, "teamId=%d studentId=%d err=%v",
					*prevTeamID, app.StudentID, rmErr)
			} else {
				logDist("unrecommend.tm_removed", user, "teamId=%d studentId=%d",
					*prevTeamID, app.StudentID)
			}
		} else if checkErr != nil {
			logDist("unrecommend.tm_check_err", user, "teamId=%d studentId=%d err=%v",
				*prevTeamID, app.StudentID, checkErr)
		}
	}
	logDist("unrecommend.ok", user, "appId=%d studentId=%d prevTeamId=%v", applicationID, app.StudentID, prevTeamID)
	return s.applications.GetByID(ctx, app.ID)
}

// MoveToTeam меняет team_id заявки, СОХРАНЯЯ её статус. Используется
// координатором/админом при перетаскивании чипа из одной команды в другую
// (admin.html distribution): студент остаётся в том же статусе («Принято
// ментором» / «Рекомендован»), но команда меняется.
//
// Если статус был 'Принят' — фронт обязан спросить confirm у пользователя
// перед вызовом этого endpoint'а (см. admin.html:2882). Сам бэк не блокирует:
// в этом случае нужно сначала вызвать Recommend, который сбросит статус.
func (s *ApplicationService) MoveToTeam(ctx context.Context, user *auth.CurrentUser, applicationID, teamID int) (*models.Application, error) {
	logDist("moveTeam.start", user, "appId=%d teamId=%d", applicationID, teamID)
	app, project, err := s.loadManagedApplication(ctx, user, applicationID)
	if err != nil {
		logDist("moveTeam.load_err", user, "appId=%d err=%v", applicationID, err)
		return nil, err
	}
	team, err := s.teams.GetByID(ctx, teamID)
	if err != nil {
		logDist("moveTeam.team_err", user, "teamId=%d err=%v", teamID, err)
		return nil, err
	}
	if team.ProjectID != project.ID {
		logDist("moveTeam.project_mismatch", user, "appId=%d appProjectId=%d teamProjectId=%d",
			applicationID, project.ID, team.ProjectID)
		return nil, WrapStateError("team must belong to the same project")
	}
	app.TeamID = &teamID
	if err := s.applications.Update(ctx, app); err != nil {
		logDist("moveTeam.update_err", user, "appId=%d err=%v", applicationID, err)
		return nil, err
	}
	logDist("moveTeam.ok", user, "appId=%d studentId=%d teamId=%d", applicationID, app.StudentID, teamID)
	return s.applications.GetByID(ctx, app.ID)
}

func (s *ApplicationService) Invite(ctx context.Context, user *auth.CurrentUser, applicationID int) (*models.Application, error) {
	app, _, err := s.loadManagedApplication(ctx, user, applicationID)
	if err != nil {
		return nil, err
	}
	// Ментор только из 'Рекомендован' (стандартный flow). Координатор/админ
	// может в admin.html status-menu переключать туда-обратно — поэтому
	// допускаем 'Принят' тоже (как deescalation от accepted).
	if app.Status != models.ApplicationStatusRecommended {
		if user.HasAnyRole(auth.RoleCoordinator, auth.RoleAdmin) &&
			app.Status == models.ApplicationStatusAccepted {
			// OK — coordinator deescalates accepted → invited
		} else {
			return nil, WrapStateError("application cannot be invited from status %s", app.Status)
		}
	}
	now := time.Now()
	app.Status = models.ApplicationStatusMentorAccepted
	app.InvitedAt = &now
	app.RespondedAt = nil
	if err := s.applications.Update(ctx, app); err != nil {
		return nil, err
	}
	return s.applications.GetByID(ctx, app.ID)
}

func (s *ApplicationService) Accept(ctx context.Context, user *auth.CurrentUser, applicationID int) (*models.Application, error) {
	if err := RequireRoles(user, auth.RoleStudent, auth.RoleCoordinator, auth.RoleAdmin); err != nil {
		return nil, err
	}
	app, err := s.applications.GetByID(ctx, applicationID)
	if err != nil {
		return nil, err
	}
	if user.Role == auth.RoleStudent && user.ID != app.StudentID {
		return nil, ErrForbidden
	}
	// Студент жмёт «принять приглашение» — только из 'Принято ментором'.
	// Координатор/админ из admin.html status-menu выставляет статус
	// напрямую — допускается с 'Рекомендован' или 'Принято ментором'
	// (студент уже привязан к команде).
	if user.HasAnyRole(auth.RoleStudent) && app.Status != models.ApplicationStatusMentorAccepted {
		return nil, WrapStateError("application cannot be accepted from status %s", app.Status)
	}
	if user.HasAnyRole(auth.RoleCoordinator, auth.RoleAdmin) {
		if app.Status != models.ApplicationStatusRecommended &&
			app.Status != models.ApplicationStatusMentorAccepted &&
			app.Status != models.ApplicationStatusAccepted {
			return nil, WrapStateError("application cannot be accepted from status %s", app.Status)
		}
	}

	now := time.Now()
	app.Status = models.ApplicationStatusAccepted
	app.RespondedAt = &now
	if err := s.applications.Update(ctx, app); err != nil {
		return nil, err
	}

	if app.TeamID != nil {
		member := &models.TeamMember{TeamID: *app.TeamID, UserID: app.StudentID}
		exists, err := s.teams.IsMember(ctx, *app.TeamID, app.StudentID)
		if err == nil && !exists {
			_ = s.teams.AddMember(ctx, member)
		}
	}

	otherApps, err := s.applications.GetByStudentAndStatus(ctx, app.StudentID, models.ApplicationStatusMentorAccepted)
	if err != nil {
		return nil, err
	}
	for _, other := range otherApps {
		if other.ID == app.ID {
			continue
		}
		other.Status = models.ApplicationStatusAutoDeclined
		other.RespondedAt = &now
		_ = s.applications.Update(ctx, &other)
	}

	return s.applications.GetByID(ctx, app.ID)
}

func (s *ApplicationService) Decline(ctx context.Context, user *auth.CurrentUser, applicationID int) (*models.Application, error) {
	if err := RequireRoles(user, auth.RoleStudent, auth.RoleAdmin); err != nil {
		return nil, err
	}
	app, err := s.applications.GetByID(ctx, applicationID)
	if err != nil {
		return nil, err
	}
	if user.Role == auth.RoleStudent && user.ID != app.StudentID {
		return nil, ErrForbidden
	}
	if app.Status != models.ApplicationStatusMentorAccepted {
		return nil, WrapStateError("application cannot be declined from status %s", app.Status)
	}
	now := time.Now()
	app.Status = models.ApplicationStatusStudentDeclined
	app.RespondedAt = &now
	if err := s.applications.Update(ctx, app); err != nil {
		return nil, err
	}
	return s.applications.GetByID(ctx, app.ID)
}

func (s *ApplicationService) Exclude(ctx context.Context, user *auth.CurrentUser, applicationID int) (*models.Application, error) {
	if err := RequireRoles(user, auth.RoleCoordinator, auth.RoleAdmin); err != nil {
		return nil, err
	}
	app, err := s.applications.GetByID(ctx, applicationID)
	if err != nil {
		return nil, err
	}
	if app.Status != models.ApplicationStatusAccepted {
		return nil, WrapStateError("application cannot be excluded from status %s", app.Status)
	}
	app.Status = models.ApplicationStatusExcluded
	app.TeamID = nil
	if err := s.applications.Update(ctx, app); err != nil {
		return nil, err
	}
	return s.applications.GetByID(ctx, app.ID)
}

func (s *ApplicationService) loadManagedApplication(ctx context.Context, user *auth.CurrentUser, applicationID int) (*models.Application, *models.Project, error) {
	if err := RequireRoles(user, auth.RoleMentor, auth.RoleCoordinator, auth.RoleAdmin); err != nil {
		return nil, nil, err
	}
	app, err := s.applications.GetByID(ctx, applicationID)
	if err != nil {
		return nil, nil, err
	}
	project, err := s.projects.GetByID(ctx, app.ProjectID)
	if err != nil {
		return nil, nil, err
	}
	if user.HasAnyRole(auth.RoleCoordinator, auth.RoleAdmin) || project.MentorID == user.ID {
		return app, project, nil
	}
	return nil, nil, ErrForbidden
}

func qualifiesForProject(project *models.Project, student *models.User) bool {
	if len(project.Courses) > 0 {
		ok := false
		for _, course := range project.Courses {
			if student.Course == "" {
				break
			}
			if student.Course == strconv.Itoa(course) {
				ok = true
				break
			}
		}
		if !ok {
			return false
		}
	}

	return student.GPA >= project.MinGPA
}
