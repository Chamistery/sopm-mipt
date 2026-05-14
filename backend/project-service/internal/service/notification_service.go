package service

import (
	"context"
	"time"

	"github.com/hsse/project-service/internal/auth"
	"github.com/hsse/project-service/internal/models"
	"github.com/hsse/project-service/internal/repository"
	"github.com/jackc/pgx/v5/pgxpool"
)

type NotificationService struct {
	db       *pgxpool.Pool
	profiles repository.UserProfileRepositoryInterface
}

func NewNotificationService(db *pgxpool.Pool, profiles repository.UserProfileRepositoryInterface) *NotificationService {
	return &NotificationService{db: db, profiles: profiles}
}

func (s *NotificationService) GetForUser(ctx context.Context, user *auth.CurrentUser, userID int) ([]models.Notification, error) {
	if err := RequireSelfOrRoles(user, userID, auth.RoleCoordinator); err != nil {
		return nil, err
	}

	profile, err := s.profiles.GetByUserID(ctx, userID)
	if err != nil {
		profile = &models.UserProfile{UserID: userID}
	}
	since := profile.NotificationsSeenAt
	notifications := []models.Notification{}

	appendNotifications := func(query string, args []interface{}, code, title, entity string) error {
		rows, err := s.db.Query(ctx, query, args...)
		if err != nil {
			return err
		}
		defer rows.Close()
		for rows.Next() {
			var id int
			var message string
			var createdAt string
			if err := rows.Scan(&id, &message, &createdAt); err != nil {
				return err
			}
			notifications = append(notifications, models.Notification{
				Code:      code,
				Title:     title,
				Message:   message,
				Entity:    entity,
				EntityID:  id,
				CreatedAt: parseTimestamp(createdAt),
			})
		}
		return rows.Err()
	}

	if err := appendNotifications(
		`SELECT id, name, to_char(status_changed_at, 'YYYY-MM-DD"T"HH24:MI:SS') FROM tasks WHERE assignee_id = $1 AND status IN ('Назначена','Отклонена','Возвращена','Готово') AND status_changed_at > $2`,
		[]interface{}{userID, since},
		"task_status",
		"Обновление задачи",
		"task",
	); err != nil {
		return nil, err
	}

	if err := appendNotifications(
		`SELECT id, name, to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS')
		   FROM tasks
		  WHERE assignee_id = $1
		    AND created_by_id != assignee_id
		    AND created_at > $2`,
		[]interface{}{userID, since},
		"task_assigned_by_lead",
		"Новая задача от тимлида",
		"task",
	); err != nil {
		return nil, err
	}

	if err := appendNotifications(
		`SELECT id, 'Приглашение в проект #' || project_id, to_char(invited_at, 'YYYY-MM-DD"T"HH24:MI:SS') FROM applications WHERE student_id = $1 AND status = 'Принято ментором' AND invited_at > $2`,
		[]interface{}{userID, since},
		"application_invite",
		"Новое приглашение",
		"application",
	); err != nil {
		return nil, err
	}

	if err := appendNotifications(
		`SELECT id, 'Заявка обновлена', to_char(responded_at, 'YYYY-MM-DD"T"HH24:MI:SS')
		   FROM applications
		  WHERE student_id = $1
		    AND status IN ('Авто-отклонено','Студент отклонил')
		    AND responded_at > $2`,
		[]interface{}{userID, since},
		"application_response",
		"Изменение статуса приглашения",
		"application",
	); err != nil {
		return nil, err
	}

	if err := appendNotifications(
		`SELECT id, title, to_char(confirmed_at, 'YYYY-MM-DD"T"HH24:MI:SS') FROM meetings WHERE confirmed_at IS NOT NULL AND confirmed_at > $1 AND team_id IN (SELECT team_id FROM team_members WHERE user_id = $2)`,
		[]interface{}{since, userID},
		"meeting_update",
		"Обновление встречи",
		"meeting",
	); err != nil {
		return nil, err
	}

	if err := appendNotifications(
		`SELECT t.id, t.name, to_char(t.status_changed_at, 'YYYY-MM-DD"T"HH24:MI:SS')
		   FROM tasks t
		   JOIN teams tm ON tm.id = t.team_id
		   JOIN projects p ON p.id = tm.project_id
		  WHERE p.mentor_id = $1
		    AND t.status IN ('Ожидает аппрува','На ревью')
		    AND t.status_changed_at > $2`,
		[]interface{}{userID, since},
		"mentor_task_attention",
		"Задача требует внимания",
		"task",
	); err != nil {
		return nil, err
	}

	if err := appendNotifications(
		`SELECT tr.id, 'Командный отчёт отправлен', to_char(tr.submitted_at, 'YYYY-MM-DD"T"HH24:MI:SS')
		   FROM team_reports tr
		   JOIN teams t ON t.id = tr.team_id
		   JOIN projects p ON p.id = t.project_id
		  WHERE p.mentor_id = $1
		    AND tr.submitted_at IS NOT NULL
		    AND tr.submitted_at > $2`,
		[]interface{}{userID, since},
		"mentor_report_submitted",
		"Отчёт отправлен",
		"team_report",
	); err != nil {
		return nil, err
	}

	if err := appendNotifications(
		`SELECT id, title, to_char(submitted_at, 'YYYY-MM-DD"T"HH24:MI:SS')
		   FROM projects
		  WHERE mentor_id = $1
		    AND submitted_at IS NOT NULL
		    AND submitted_at > $2`,
		[]interface{}{userID, since},
		"project_submitted",
		"Проектная заявка отправлена",
		"project",
	); err != nil {
		return nil, err
	}

	if user.ID == userID {
		_ = s.profiles.UpdateNotificationsSeenAt(ctx, userID)
	}

	return notifications, nil
}

func parseTimestamp(value string) time.Time {
	if value == "" {
		return time.Time{}
	}
	parsed, err := time.Parse("2006-01-02T15:04:05", value)
	if err != nil {
		return time.Time{}
	}
	return parsed
}
