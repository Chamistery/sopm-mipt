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
	if err := RequireSelfOrRoles(user, userID, auth.RoleAdmin, auth.RoleCoordinator); err != nil {
		return nil, err
	}

	profile, err := s.profiles.GetByUserID(ctx, userID)
	if err != nil {
		profile = &models.UserProfile{UserID: userID}
	}
	since := profile.NotificationsSeenAt
	notifications := []models.Notification{}

	appendN := func(query string, args []interface{}, code, title, entity string) {
		rows, err := s.db.Query(ctx, query, args...)
		if err != nil {
			return
		}
		defer rows.Close()
		for rows.Next() {
			var id int
			var message string
			var createdAt string
			if err := rows.Scan(&id, &message, &createdAt); err != nil {
				continue
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
	}

	// Determine user's role-based context
	var userTeamIDs []int
	var userProjectIDs []int
	var isMentor, isCoordinator, isTeamLead bool

	rows, _ := s.db.Query(ctx, `SELECT team_id FROM team_members WHERE user_id = $1`, userID)
	if rows != nil {
		for rows.Next() {
			var tid int
			if rows.Scan(&tid) == nil {
				userTeamIDs = append(userTeamIDs, tid)
			}
		}
		rows.Close()
	}

	// Check if user is a teamlead
	for _, tid := range userTeamIDs {
		var leaderID *int
		_ = s.db.QueryRow(ctx, `SELECT leader_id FROM teams WHERE id = $1`, tid).Scan(&leaderID)
		if leaderID != nil && *leaderID == userID {
			isTeamLead = true
			break
		}
	}

	// Check roles from the actual user record
	var userRole string
	_ = s.db.QueryRow(ctx, `SELECT role FROM users WHERE id = $1`, userID).Scan(&userRole)
	isMentor = userRole == "mentor"
	isCoordinator = userRole == "coordinator"

	if isMentor {
		mrows, _ := s.db.Query(ctx, `SELECT id FROM projects WHERE mentor_id = $1`, userID)
		if mrows != nil {
			for mrows.Next() {
				var pid int
				if mrows.Scan(&pid) == nil {
					userProjectIDs = append(userProjectIDs, pid)
				}
			}
			mrows.Close()
		}
	}

	// ========== STUDENT NOTIFICATIONS (#1-#11) ==========

	// #1 Task approved
	appendN(
		`SELECT id, name, to_char(status_changed_at, 'YYYY-MM-DD"T"HH24:MI:SS')
		 FROM tasks WHERE assignee_id = $1 AND status = 'Назначена' AND status_changed_at > $2 AND deleted_at IS NULL`,
		[]interface{}{userID, since},
		"task_approved", "Задача одобрена", "task",
	)

	// #2 Task rejected
	appendN(
		`SELECT id, name, to_char(status_changed_at, 'YYYY-MM-DD"T"HH24:MI:SS')
		 FROM tasks WHERE assignee_id = $1 AND status = 'Отклонена' AND status_changed_at > $2`,
		[]interface{}{userID, since},
		"task_rejected", "Задача отклонена", "task",
	)

	// #3 Task returned
	appendN(
		`SELECT id, name, to_char(status_changed_at, 'YYYY-MM-DD"T"HH24:MI:SS')
		 FROM tasks WHERE assignee_id = $1 AND status = 'Возвращена' AND status_changed_at > $2 AND deleted_at IS NULL`,
		[]interface{}{userID, since},
		"task_returned", "Задача возвращена на доработку", "task",
	)

	// #4 Task accepted (done)
	appendN(
		`SELECT id, name, to_char(status_changed_at, 'YYYY-MM-DD"T"HH24:MI:SS')
		 FROM tasks WHERE assignee_id = $1 AND status = 'Готово' AND status_changed_at > $2 AND deleted_at IS NULL`,
		[]interface{}{userID, since},
		"task_accepted", "Задача принята", "task",
	)

	// #5 Task assigned by teamlead
	appendN(
		`SELECT id, name, to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS')
		 FROM tasks WHERE assignee_id = $1 AND created_by_id != assignee_id AND created_at > $2 AND deleted_at IS NULL`,
		[]interface{}{userID, since},
		"task_assigned_by_lead", "Новая задача от тимлида", "task",
	)

	// #6 Invitation to project
	appendN(
		`SELECT a.id, 'Приглашение в проект "' || p.title || '"', to_char(a.invited_at, 'YYYY-MM-DD"T"HH24:MI:SS')
		 FROM applications a JOIN projects p ON p.id = a.project_id
		 WHERE a.student_id = $1 AND a.status = 'Принято ментором' AND a.invited_at > $2`,
		[]interface{}{userID, since},
		"application_invite", "Приглашение в проект", "application",
	)

	// #7 Task deadline in 2 days
	appendN(
		`SELECT id, name, to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD"T"HH24:MI:SS')
		 FROM tasks WHERE assignee_id = $1 AND status IN ('В работе','Возвращена')
		 AND end_date - CURRENT_DATE <= 2 AND end_date >= CURRENT_DATE AND deleted_at IS NULL`,
		[]interface{}{userID},
		"task_deadline", "Приближается дедлайн", "task",
	)

	// #8 Meeting scheduled by mentor (for team members)
	appendN(
		`SELECT m.id, m.title, to_char(m.created_at, 'YYYY-MM-DD"T"HH24:MI:SS')
		 FROM meetings m
		 JOIN team_members tm ON tm.team_id = m.team_id AND tm.user_id = $1
		 WHERE m.created_by_id != $1 AND m.status = 'Подтверждена' AND m.created_at > $2`,
		[]interface{}{userID, since},
		"meeting_scheduled", "Встреча назначена", "meeting",
	)

	// #9 Team report reviewed (for team members)
	appendN(
		`SELECT tr.id, 'Отчёт за спринт проверен', to_char(tr.reviewed_at, 'YYYY-MM-DD"T"HH24:MI:SS')
		 FROM team_reports tr
		 JOIN team_members tm ON tm.team_id = tr.team_id AND tm.user_id = $1
		 WHERE tr.reviewed_at IS NOT NULL AND tr.reviewed_at > $2`,
		[]interface{}{userID, since},
		"report_reviewed", "Отчёт проверен", "team_report",
	)

	// #10 Meeting confirmed by mentor
	appendN(
		`SELECT m.id, m.title, to_char(m.confirmed_at, 'YYYY-MM-DD"T"HH24:MI:SS')
		 FROM meetings m
		 JOIN team_members tm ON tm.team_id = m.team_id AND tm.user_id = $1
		 WHERE m.mentor_confirmed = TRUE AND m.confirmed_at > $2 AND m.created_by_id != $1`,
		[]interface{}{userID, since},
		"meeting_confirmed", "Встреча подтверждена", "meeting",
	)

	// #11 Meeting declined by mentor
	appendN(
		`SELECT m.id, m.title || ': ' || COALESCE(m.mentor_decline_reason, ''), to_char(m.confirmed_at, 'YYYY-MM-DD"T"HH24:MI:SS')
		 FROM meetings m
		 JOIN team_members tm ON tm.team_id = m.team_id AND tm.user_id = $1
		 WHERE m.mentor_confirmed = FALSE AND m.confirmed_at > $2`,
		[]interface{}{userID, since},
		"meeting_declined", "Встреча отклонена", "meeting",
	)

	// ========== TEAMLEAD NOTIFICATIONS (#12-#15) ==========
	if isTeamLead {
		// #12 Team member's task approved
		appendN(
			`SELECT t.id, t.name || ' (' || u.first_name || ' ' || u.last_name || ')', to_char(t.status_changed_at, 'YYYY-MM-DD"T"HH24:MI:SS')
			 FROM tasks t
			 JOIN users u ON u.id = t.assignee_id
			 JOIN teams tm ON tm.id = t.team_id
			 WHERE tm.leader_id = $1 AND t.assignee_id != $1 AND t.status = 'Назначена' AND t.status_changed_at > $2 AND t.deleted_at IS NULL`,
			[]interface{}{userID, since},
			"lead_task_approved", "Задача участника одобрена", "task",
		)

		// #13 Team member's task rejected
		appendN(
			`SELECT t.id, t.name || ' (' || u.first_name || ' ' || u.last_name || ')', to_char(t.status_changed_at, 'YYYY-MM-DD"T"HH24:MI:SS')
			 FROM tasks t
			 JOIN users u ON u.id = t.assignee_id
			 JOIN teams tm ON tm.id = t.team_id
			 WHERE tm.leader_id = $1 AND t.assignee_id != $1 AND t.status = 'Отклонена' AND t.status_changed_at > $2`,
			[]interface{}{userID, since},
			"lead_task_rejected", "Задача участника отклонена", "task",
		)

		// #14 Member submitted for review
		appendN(
			`SELECT t.id, u.first_name || ' ' || u.last_name || ': ' || t.name, to_char(t.status_changed_at, 'YYYY-MM-DD"T"HH24:MI:SS')
			 FROM tasks t
			 JOIN users u ON u.id = t.assignee_id
			 JOIN teams tm ON tm.id = t.team_id
			 WHERE tm.leader_id = $1 AND t.assignee_id != $1 AND t.status = 'На ревью' AND t.status_changed_at > $2 AND t.deleted_at IS NULL`,
			[]interface{}{userID, since},
			"lead_member_review", "Участник отправил на ревью", "task",
		)

		// #15 Sprint ending soon, member has no completed tasks (simplified as deadline warning)
		appendN(
			`SELECT s.id, 'Спринт #' || s.number || ' заканчивается через ' || (s.end_date - CURRENT_DATE) || ' дн.', to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD"T"HH24:MI:SS')
			 FROM sprints s
			 JOIN teams tm ON tm.project_id = s.project_id
			 WHERE tm.leader_id = $1 AND s.end_date - CURRENT_DATE <= 3 AND s.end_date >= CURRENT_DATE AND s.status = 'Активный'`,
			[]interface{}{userID},
			"lead_sprint_ending", "Спринт скоро закончится", "sprint",
		)
	}

	// ========== MENTOR NOTIFICATIONS (#16-#24) ==========
	if isMentor {
		// #16 New task pending approval
		appendN(
			`SELECT t.id, t.name || ' от ' || u.first_name || ' ' || u.last_name, to_char(t.created_at, 'YYYY-MM-DD"T"HH24:MI:SS')
			 FROM tasks t
			 JOIN users u ON u.id = t.created_by_id
			 JOIN teams tm ON tm.id = t.team_id
			 JOIN projects p ON p.id = tm.project_id
			 WHERE p.mentor_id = $1 AND t.status = 'Ожидает аппрува' AND t.created_at > $2 AND t.deleted_at IS NULL`,
			[]interface{}{userID, since},
			"mentor_task_pending", "Задача ожидает аппрува", "task",
		)

		// #17 Task submitted for review
		appendN(
			`SELECT t.id, t.name || ' (' || u.first_name || ' ' || u.last_name || ')', to_char(t.status_changed_at, 'YYYY-MM-DD"T"HH24:MI:SS')
			 FROM tasks t
			 JOIN users u ON u.id = t.assignee_id
			 JOIN teams tm ON tm.id = t.team_id
			 JOIN projects p ON p.id = tm.project_id
			 WHERE p.mentor_id = $1 AND t.status = 'На ревью' AND t.status_changed_at > $2 AND t.deleted_at IS NULL`,
			[]interface{}{userID, since},
			"mentor_task_review", "Задача на ревью", "task",
		)

		// #18 Task cancelled by student
		appendN(
			`SELECT t.id, t.name || ' — ' || u.first_name || ' ' || u.last_name || ' отменил', to_char(t.deleted_at, 'YYYY-MM-DD"T"HH24:MI:SS')
			 FROM tasks t
			 JOIN users u ON u.id = t.deleted_by_id
			 JOIN teams tm ON tm.id = t.team_id
			 JOIN projects p ON p.id = tm.project_id
			 WHERE p.mentor_id = $1 AND t.deleted_at IS NOT NULL AND t.deleted_at > $2`,
			[]interface{}{userID, since},
			"mentor_task_cancelled", "Задача отменена студентом", "task",
		)

		// #19 Student accepted invitation
		appendN(
			`SELECT a.id, u.first_name || ' ' || u.last_name || ' принял приглашение в "' || p.title || '"', to_char(a.responded_at, 'YYYY-MM-DD"T"HH24:MI:SS')
			 FROM applications a
			 JOIN users u ON u.id = a.student_id
			 JOIN projects p ON p.id = a.project_id
			 WHERE p.mentor_id = $1 AND a.status = 'Принят' AND a.responded_at > $2`,
			[]interface{}{userID, since},
			"mentor_student_accepted", "Студент принял приглашение", "application",
		)

		// #20 Student declined invitation
		appendN(
			`SELECT a.id, u.first_name || ' ' || u.last_name || ' отклонил приглашение в "' || p.title || '"', to_char(a.responded_at, 'YYYY-MM-DD"T"HH24:MI:SS')
			 FROM applications a
			 JOIN users u ON u.id = a.student_id
			 JOIN projects p ON p.id = a.project_id
			 WHERE p.mentor_id = $1 AND a.status = 'Студент отклонил' AND a.responded_at > $2`,
			[]interface{}{userID, since},
			"mentor_student_declined", "Студент отклонил приглашение", "application",
		)

		// #21 Team report submitted
		appendN(
			`SELECT tr.id, 'Отчёт за спринт #' || s.number || ' от команды "' || tm.name || '"', to_char(tr.submitted_at, 'YYYY-MM-DD"T"HH24:MI:SS')
			 FROM team_reports tr
			 JOIN teams tm ON tm.id = tr.team_id
			 JOIN sprints s ON s.id = tr.sprint_id
			 JOIN projects p ON p.id = tm.project_id
			 WHERE p.mentor_id = $1 AND tr.submitted_at IS NOT NULL AND tr.submitted_at > $2`,
			[]interface{}{userID, since},
			"mentor_report_submitted", "Отчёт отправлен на проверку", "team_report",
		)

		// #22 No meeting in sprint (7 days before end)
		appendN(
			`SELECT s.id, 'Команда "' || tm.name || '": нет встречи в спринте #' || s.number, to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD"T"HH24:MI:SS')
			 FROM sprints s
			 JOIN teams tm ON tm.project_id = s.project_id
			 JOIN projects p ON p.id = s.project_id
			 WHERE p.mentor_id = $1 AND s.end_date - CURRENT_DATE <= 7 AND s.end_date >= CURRENT_DATE
			   AND NOT EXISTS (SELECT 1 FROM meetings m WHERE m.team_id = tm.id AND m.sprint_id = s.id)`,
			[]interface{}{userID},
			"mentor_no_meeting", "Нет встречи в спринте", "sprint",
		)

		// #23 All team members accepted
		appendN(
			`SELECT tm.id, 'Все участники команды "' || tm.name || '" приняли приглашения', to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD"T"HH24:MI:SS')
			 FROM teams tm
			 JOIN projects p ON p.id = tm.project_id
			 WHERE p.mentor_id = $1
			   AND (SELECT COUNT(*) FROM applications WHERE team_id = tm.id AND status = 'Принят') >= p.team_size_min
			   AND NOT EXISTS (SELECT 1 FROM applications WHERE team_id = tm.id AND status IN ('Рекомендован','Принято ментором'))`,
			[]interface{}{userID},
			"mentor_team_complete", "Команда сформирована", "team",
		)

		// #24 Meeting from teamlead (pending confirmation)
		appendN(
			`SELECT m.id, 'Тимлид предлагает встречу "' || m.title || '" на ' || to_char(m.meeting_date, 'DD.MM.YYYY'), to_char(m.created_at, 'YYYY-MM-DD"T"HH24:MI:SS')
			 FROM meetings m
			 JOIN teams tm ON tm.id = m.team_id
			 JOIN projects p ON p.id = tm.project_id
			 WHERE p.mentor_id = $1 AND m.mentor_confirmed IS NULL AND m.created_by_id != $1 AND m.created_at > $2`,
			[]interface{}{userID, since},
			"mentor_meeting_pending", "Встреча требует подтверждения", "meeting",
		)
	}

	// ========== COORDINATOR NOTIFICATIONS (#25-#30) ==========
	if isCoordinator {
		// #25 New project application submitted
		appendN(
			`SELECT p.id, 'Заявка на проект "' || p.title || '" от ' || u.first_name || ' ' || u.last_name, to_char(p.submitted_at, 'YYYY-MM-DD"T"HH24:MI:SS')
			 FROM projects p
			 JOIN users u ON u.id = p.mentor_id
			 WHERE p.submitted_at IS NOT NULL AND p.submitted_at > $1`,
			[]interface{}{since},
			"coord_project_submitted", "Новая заявка на проект", "project",
		)

		// #26 Distribution completed (check status via last run)
		// This is handled by the distribution status endpoint

		// #27 Team launched (project became active)
		appendN(
			`SELECT p.id, 'Проект "' || p.title || '" переведён в статус Активный', to_char(p.updated_at, 'YYYY-MM-DD"T"HH24:MI:SS')
			 FROM projects p WHERE p.status = 'Активный' AND p.updated_at > $1`,
			[]interface{}{since},
			"coord_project_active", "Проект запущен", "project",
		)

		// #28 Students without team
		appendN(
			`SELECT COUNT(*), 'студентов без команды', to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD"T"HH24:MI:SS')
			 FROM applications WHERE status IN ('Не рекомендован','Ожидает') AND team_id IS NULL
			 HAVING COUNT(*) > 0`,
			[]interface{}{},
			"coord_unassigned", "Студенты без команды", "application",
		)

		// #29 Student excluded (log)
		appendN(
			`SELECT a.id, u.first_name || ' ' || u.last_name || ' исключён из проекта "' || p.title || '"', to_char(a.status_changed_at, 'YYYY-MM-DD"T"HH24:MI:SS')
			 FROM applications a
			 JOIN users u ON u.id = a.student_id
			 JOIN projects p ON p.id = a.project_id
			 WHERE a.status = 'Исключён' AND a.status_changed_at > $1`,
			[]interface{}{since},
			"coord_student_excluded", "Студент исключён", "application",
		)

		// #30 Project ready to launch (all teams have min members, all accepted)
		appendN(
			`SELECT p.id, 'Все команды проекта "' || p.title || '" сформированы', to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD"T"HH24:MI:SS')
			 FROM projects p
			 WHERE p.status = 'Опубликован'
			   AND NOT EXISTS (
			     SELECT 1 FROM teams t WHERE t.project_id = p.id
			       AND (SELECT COUNT(*) FROM applications a WHERE a.team_id = t.id AND a.status = 'Принят') < p.team_size_min
			   )
			   AND (SELECT COUNT(*) FROM teams t WHERE t.project_id = p.id) >= p.num_teams`,
			[]interface{}{},
			"coord_project_ready", "Проект готов к запуску", "project",
		)
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
