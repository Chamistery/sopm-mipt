package repository

import (
	"context"
	"fmt"
	"strconv"

	"github.com/hsse/project-service/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

// CoordinatorDistributionRepository собирает агрегат для GET
// /api/coordinator/distribution. Отдельный репозиторий — потому что shape
// отличается от менторского (один глобальный пул + ВСЕ команды).
type CoordinatorDistributionRepository struct {
	db *pgxpool.Pool
}

func NewCoordinatorDistributionRepository(db *pgxpool.Pool) *CoordinatorDistributionRepository {
	return &CoordinatorDistributionRepository{db: db}
}

func (r *CoordinatorDistributionRepository) Get(ctx context.Context) (*models.CoordinatorDistributionResponse, error) {
	const projectsQuery = `
		SELECT p.id, p.title, p.status, COALESCE(p.company, ''),
		       p.team_size_min, p.team_size_max, p.num_teams,
		       p.mentor_id, COALESCE(u.first_name, ''), COALESCE(u.last_name, '')
		FROM projects p
		LEFT JOIN users u ON u.id = p.mentor_id
		WHERE p.status IN ('Активный', 'Опубликован', 'Утверждён')
		ORDER BY p.id ASC
	`
	rows, err := r.db.Query(ctx, projectsQuery)
	if err != nil {
		return nil, fmt.Errorf("coord distribution: query projects: %w", err)
	}
	defer rows.Close()

	type projectRow struct {
		ID          int
		Title       string
		Status      models.ProjectStatus
		Company     string
		TeamSizeMin int
		TeamSizeMax int
		NumTeams    int
		MentorID    *int
		MentorFirst string
		MentorLast  string
	}

	var projects []projectRow
	for rows.Next() {
		var pr projectRow
		if err := rows.Scan(
			&pr.ID, &pr.Title, &pr.Status, &pr.Company,
			&pr.TeamSizeMin, &pr.TeamSizeMax, &pr.NumTeams,
			&pr.MentorID, &pr.MentorFirst, &pr.MentorLast,
		); err != nil {
			return nil, fmt.Errorf("coord distribution: scan project: %w", err)
		}
		projects = append(projects, pr)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("coord distribution: iterate projects: %w", err)
	}

	resp := &models.CoordinatorDistributionResponse{
		Projects: make([]models.CoordinatorDistributionProject, 0, len(projects)),
	}

	for _, pr := range projects {
		teams, err := r.loadProjectTeams(ctx, pr.ID)
		if err != nil {
			return nil, err
		}

		var mentor *models.UserSummary
		if pr.MentorID != nil {
			mentor = &models.UserSummary{
				ID: *pr.MentorID, FirstName: pr.MentorFirst, LastName: pr.MentorLast,
			}
		}

		resp.Projects = append(resp.Projects, models.CoordinatorDistributionProject{
			ID:          pr.ID,
			Title:       pr.Title,
			Status:      pr.Status,
			Company:     pr.Company,
			Mentor:      mentor,
			TeamSizeMin: pr.TeamSizeMin,
			TeamSizeMax: pr.TeamSizeMax,
			NumTeams:    pr.NumTeams,
			Teams:       teams,
		})
	}

	pool, err := r.loadGlobalPool(ctx)
	if err != nil {
		return nil, err
	}
	resp.Pool = pool

	return resp, nil
}

// loadProjectTeams — все команды проекта (launched и нет) с участниками.
// Используется тот же membership-criterion, что и в менторском
// distribution: members берутся из applications.team_id со статусами
// 'Рекомендован' / 'Принято ментором' / 'Принят'.
func (r *CoordinatorDistributionRepository) loadProjectTeams(ctx context.Context, projectID int) ([]models.MentorDistributionTeam, error) {
	const teamsQ = `
		SELECT id, name, COALESCE(launched, TRUE)
		FROM teams
		WHERE project_id = $1
		ORDER BY id ASC
	`
	rows, err := r.db.Query(ctx, teamsQ, projectID)
	if err != nil {
		return nil, fmt.Errorf("coord distribution: query teams: %w", err)
	}
	defer rows.Close()

	var teams []models.MentorDistributionTeam
	for rows.Next() {
		var t models.MentorDistributionTeam
		if err := rows.Scan(&t.ID, &t.Name, &t.Launched); err != nil {
			return nil, fmt.Errorf("coord distribution: scan team: %w", err)
		}
		teams = append(teams, t)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	for i := range teams {
		members, err := r.loadTeamMembers(ctx, teams[i].ID)
		if err != nil {
			return nil, err
		}
		if members == nil {
			members = []models.MentorDistributionTeamMember{}
		}
		teams[i].Members = members
	}
	if teams == nil {
		teams = []models.MentorDistributionTeam{}
	}
	return teams, nil
}

func (r *CoordinatorDistributionRepository) loadTeamMembers(ctx context.Context, teamID int) ([]models.MentorDistributionTeamMember, error) {
	const q = `
		SELECT a.id, a.student_id, a.priority, a.status,
		       u.first_name, u.last_name,
		       COALESCE(u.course, ''), COALESCE(u."group", ''), COALESCE(u.gpa, 0)
		FROM applications a
		JOIN users u ON u.id = a.student_id
		WHERE a.team_id = $1
		  AND a.status IN ('Рекомендован','Принято ментором','Принят')
		ORDER BY a.id ASC
	`
	rows, err := r.db.Query(ctx, q, teamID)
	if err != nil {
		return nil, fmt.Errorf("coord distribution: query team members: %w", err)
	}
	defer rows.Close()

	var members []models.MentorDistributionTeamMember
	for rows.Next() {
		var (
			m         models.MentorDistributionTeamMember
			courseStr string
		)
		if err := rows.Scan(
			&m.ApplicationID, &m.StudentID, &m.Priority, &m.Status,
			&m.FirstName, &m.LastName,
			&courseStr, &m.Group, &m.GPA,
		); err != nil {
			return nil, fmt.Errorf("coord distribution: scan member: %w", err)
		}
		m.Course, _ = strconv.Atoi(courseStr)
		m.Qualified = true // координатор не фильтрует по требованиям проекта
		members = append(members, m)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Подгружаем все приоритеты каждого студента для drawer'а. По одному
	// запросу на студента — дашборд distribution маленький (< 100 чипов).
	for i := range members {
		priorities, err := r.loadStudentPriorities(ctx, members[i].StudentID)
		if err != nil {
			return nil, err
		}
		members[i].AllPriorities = priorities
	}
	return members, nil
}

func (r *CoordinatorDistributionRepository) loadStudentPriorities(ctx context.Context, studentID int) ([]models.TeamMemberPriority, error) {
	const q = `
		SELECT a.id, a.project_id, p.title, a.priority, a.status
		FROM applications a
		JOIN projects p ON p.id = a.project_id
		WHERE a.student_id = $1
		ORDER BY a.priority ASC
	`
	rows, err := r.db.Query(ctx, q, studentID)
	if err != nil {
		return nil, fmt.Errorf("coord distribution: query student priorities: %w", err)
	}
	defer rows.Close()

	var out []models.TeamMemberPriority
	for rows.Next() {
		var p models.TeamMemberPriority
		if err := rows.Scan(&p.ApplicationID, &p.ProjectID, &p.ProjectTitle, &p.Priority, &p.Status); err != nil {
			return nil, fmt.Errorf("coord distribution: scan priority: %w", err)
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

// loadGlobalPool — все студенты, у которых есть заявка на любой проект
// в статусе 'Ожидает' / 'Рекомендован' / 'Принято ментором' / 'Принят'
// и которые не состоят ни в одной команде. Группируем приоритеты
// студента в одну запись.
func (r *CoordinatorDistributionRepository) loadGlobalPool(ctx context.Context) ([]models.CoordinatorPoolStudent, error) {
	const q = `
		SELECT a.id, a.student_id, a.priority, a.status,
		       a.project_id, p.title,
		       u.first_name, u.last_name,
		       COALESCE(u.course, ''), COALESCE(u."group", ''), COALESCE(u.gpa, 0)
		FROM applications a
		JOIN users u ON u.id = a.student_id
		JOIN projects p ON p.id = a.project_id
		WHERE a.student_id NOT IN (SELECT user_id FROM team_members)
		  AND a.status IN ('Ожидает','Рекомендован','Принято ментором','Принят','Не рекомендован','Не подходит')
		ORDER BY u.last_name ASC, u.first_name ASC, a.priority ASC
	`
	rows, err := r.db.Query(ctx, q)
	if err != nil {
		return nil, fmt.Errorf("coord distribution: query pool: %w", err)
	}
	defer rows.Close()

	type studentKey = int
	byStudent := map[studentKey]*models.CoordinatorPoolStudent{}
	order := []studentKey{}

	for rows.Next() {
		var (
			appID, studentID, priority, projectID int
			status                                models.ApplicationStatus
			projectTitle, first, last, courseStr  string
			group                                 string
			gpa                                   float64
		)
		if err := rows.Scan(
			&appID, &studentID, &priority, &status,
			&projectID, &projectTitle,
			&first, &last, &courseStr, &group, &gpa,
		); err != nil {
			return nil, fmt.Errorf("coord distribution: scan pool: %w", err)
		}
		course, _ := strconv.Atoi(courseStr)
		entry, ok := byStudent[studentID]
		if !ok {
			entry = &models.CoordinatorPoolStudent{
				StudentID: studentID,
				FirstName: first,
				LastName:  last,
				Course:    course,
				Group:     group,
				GPA:       gpa,
			}
			byStudent[studentID] = entry
			order = append(order, studentID)
		}
		entry.Priorities = append(entry.Priorities, models.CoordinatorPoolPriority{
			ApplicationID: appID,
			ProjectID:     projectID,
			ProjectTitle:  projectTitle,
			Priority:      priority,
			Status:        status,
		})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	out := make([]models.CoordinatorPoolStudent, 0, len(order))
	for _, sid := range order {
		out = append(out, *byStudent[sid])
	}
	return out, nil
}
