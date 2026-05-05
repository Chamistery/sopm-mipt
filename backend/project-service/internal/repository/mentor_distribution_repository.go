package repository

import (
	"context"
	"fmt"
	"sort"
	"strconv"

	"github.com/hsse/project-service/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

// MentorDistributionRepository собирает агрегат для GET /api/mentor/distribution.
// Возвращает только проекты ментора, у которых есть хотя бы одна незапущенная
// команда (launched=false) — это и есть «Незапущенные команды» с прототипа.
// Каждый проект содержит свой пул заявок (qualified/unqualified × приоритеты)
// и список незапущенных команд с уже-распределёнными участниками.
type MentorDistributionRepository struct {
	db *pgxpool.Pool
}

func NewMentorDistributionRepository(db *pgxpool.Pool) *MentorDistributionRepository {
	return &MentorDistributionRepository{db: db}
}

func (r *MentorDistributionRepository) GetForMentor(ctx context.Context, mentorID int) (*models.MentorDistributionResponse, error) {
	const projectsQuery = `
		SELECT DISTINCT p.id, p.title, p.status, COALESCE(p.company, ''),
		       p.team_size_min, p.team_size_max, p.num_teams, COALESCE(p.min_gpa, 0),
		       COALESCE(array_to_json(p.courses)::text, '[]')
		FROM projects p
		JOIN teams t ON t.project_id = p.id
		WHERE p.mentor_id = $1
		  AND COALESCE(t.launched, TRUE) = FALSE
		  AND p.status NOT IN ('Завершён', 'Архивный')
		ORDER BY p.id ASC
	`

	rows, err := r.db.Query(ctx, projectsQuery, mentorID)
	if err != nil {
		return nil, fmt.Errorf("distribution: query projects: %w", err)
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
		MinGPA      float64
		Courses     models.IntList
	}

	var projects []projectRow
	for rows.Next() {
		var pr projectRow
		if err := rows.Scan(
			&pr.ID, &pr.Title, &pr.Status, &pr.Company,
			&pr.TeamSizeMin, &pr.TeamSizeMax, &pr.NumTeams, &pr.MinGPA, &pr.Courses,
		); err != nil {
			return nil, fmt.Errorf("distribution: scan project: %w", err)
		}
		projects = append(projects, pr)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("distribution: iterate projects: %w", err)
	}

	resp := &models.MentorDistributionResponse{
		Projects: make([]models.MentorDistributionProject, 0, len(projects)),
	}

	for _, pr := range projects {
		minCourse := 0
		if len(pr.Courses) > 0 {
			sorted := append([]int(nil), pr.Courses...)
			sort.Ints(sorted)
			minCourse = sorted[0]
		}
		teams, err := r.loadUnlaunchedTeams(ctx, pr.ID)
		if err != nil {
			return nil, err
		}
		// Применяем требования по курсу/GPA, чтобы корректно проставить qualified
		// и для участников команды (UI рендерит «⚠ Не подходит» бейдж).
		for ti := range teams {
			for mi := range teams[ti].Members {
				m := &teams[ti].Members[mi]
				m.Qualified = isQualified(m.Course, m.GPA, pr.Courses, pr.MinGPA)
			}
		}
		pool, err := r.loadProjectPool(ctx, pr.ID, pr.Courses, pr.MinGPA)
		if err != nil {
			return nil, err
		}
		sprintsCount, sprintWeeks, deadline, err := r.loadSprintMeta(ctx, pr.ID)
		if err != nil {
			return nil, err
		}

		resp.Projects = append(resp.Projects, models.MentorDistributionProject{
			ID:           pr.ID,
			Title:        pr.Title,
			Status:       pr.Status,
			Company:      pr.Company,
			TeamSizeMin:  pr.TeamSizeMin,
			TeamSizeMax:  pr.TeamSizeMax,
			NumTeams:     pr.NumTeams,
			SprintsCount: sprintsCount,
			SprintWeeks:  sprintWeeks,
			Deadline:     deadline,
			Requirements: models.ApplicantRequirements{
				MinCourse: minCourse,
				MinGPA:    pr.MinGPA,
			},
			Teams: orEmptyDistTeams(teams),
			Pool:  pool,
		})
	}

	return resp, nil
}

func (r *MentorDistributionRepository) loadUnlaunchedTeams(ctx context.Context, projectID int) ([]models.MentorDistributionTeam, error) {
	const q = `
		SELECT id, name, COALESCE(launched, TRUE)
		FROM teams
		WHERE project_id = $1 AND COALESCE(launched, TRUE) = FALSE
		ORDER BY id ASC
	`
	rows, err := r.db.Query(ctx, q, projectID)
	if err != nil {
		return nil, fmt.Errorf("distribution: query teams: %w", err)
	}
	defer rows.Close()

	var teams []models.MentorDistributionTeam
	for rows.Next() {
		var t models.MentorDistributionTeam
		if err := rows.Scan(&t.ID, &t.Name, &t.Launched); err != nil {
			return nil, fmt.Errorf("distribution: scan team: %w", err)
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
		teams[i].Members = members
	}
	return teams, nil
}

// Участники команды собираются по applications.team_id (это и рекомендованные,
// и приглашённые, и принятые) — поскольку при запуске команды членство
// фиксируется как раз на момент Принят (см. application_service.Accept).
func (r *MentorDistributionRepository) loadTeamMembers(ctx context.Context, teamID int) ([]models.MentorDistributionTeamMember, error) {
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
		return nil, fmt.Errorf("distribution: query team members: %w", err)
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
			return nil, fmt.Errorf("distribution: scan team member: %w", err)
		}
		m.Course, _ = strconv.Atoi(courseStr)
		members = append(members, m)
	}
	return members, rows.Err()
}

// loadProjectPool — все заявки этого проекта, не привязанные к команде, для
// drag&drop. Группируем по qualified/unqualified × priority. Status — Подана,
// Не рекомендован или Не подходит.
func (r *MentorDistributionRepository) loadProjectPool(
	ctx context.Context, projectID int, courses []int, minGPA float64,
) (models.MentorDistributionPool, error) {
	const q = `
		SELECT a.id, a.student_id, a.priority, a.status,
		       u.first_name, u.last_name,
		       COALESCE(u.course, ''), COALESCE(u.gpa, 0)
		FROM applications a
		JOIN users u ON u.id = a.student_id
		WHERE a.project_id = $1
		  AND a.team_id IS NULL
		  AND a.status IN ('Ожидает','Не подходит','Не рекомендован')
		ORDER BY a.priority ASC, a.id ASC
	`
	rows, err := r.db.Query(ctx, q, projectID)
	if err != nil {
		return models.MentorDistributionPool{}, fmt.Errorf("distribution: query pool: %w", err)
	}
	defer rows.Close()

	pool := models.MentorDistributionPool{
		Qualified:   emptyPriorityBuckets(),
		Unqualified: emptyPriorityBuckets(),
	}
	for rows.Next() {
		var (
			id        int
			studentID int
			priority  int
			status    models.ApplicationStatus
			firstName string
			lastName  string
			courseStr string
			gpa       float64
		)
		if err := rows.Scan(&id, &studentID, &priority, &status, &firstName, &lastName, &courseStr, &gpa); err != nil {
			return models.MentorDistributionPool{}, fmt.Errorf("distribution: scan pool: %w", err)
		}
		course, _ := strconv.Atoi(courseStr)
		item := models.ApplicantItem{
			ApplicationID: id,
			StudentID:     studentID,
			Name:          firstName + " " + lastName,
			Course:        course,
			GPA:           gpa,
			Status:        status,
		}
		qualified := isQualified(course, gpa, courses, minGPA) && status != models.ApplicationStatusUnqualified
		addApplicantByPriority(&pool.Qualified, &pool.Unqualified, qualified, priority, item)
	}
	return pool, rows.Err()
}

// loadSprintMeta — суммарная информация о спринтах проекта для подзаголовка
// «N спринтов × W нед.» + ближайший дедлайн (последняя end_date).
func (r *MentorDistributionRepository) loadSprintMeta(ctx context.Context, projectID int) (count int, weeks int, deadline string, err error) {
	const q = `
		SELECT COUNT(*),
		       COALESCE(EXTRACT(DAY FROM MAX(end_date::timestamp - start_date::timestamp))::int / 7 + 1, 0),
		       COALESCE(MAX(end_date)::text, '')
		FROM sprints
		WHERE project_id = $1
	`
	var weeksRaw int
	if scanErr := r.db.QueryRow(ctx, q, projectID).Scan(&count, &weeksRaw, &deadline); scanErr != nil {
		return 0, 0, "", fmt.Errorf("distribution: query sprint meta: %w", scanErr)
	}
	if weeksRaw < 1 {
		weeksRaw = 0
	}
	return count, weeksRaw, deadline, nil
}

func emptyPriorityBuckets() models.ApplicantPriorityBuckets {
	return models.ApplicantPriorityBuckets{
		Priority1: []models.ApplicantItem{},
		Priority2: []models.ApplicantItem{},
		Priority3: []models.ApplicantItem{},
		Priority4: []models.ApplicantItem{},
		Priority5: []models.ApplicantItem{},
	}
}

func orEmptyDistTeams(t []models.MentorDistributionTeam) []models.MentorDistributionTeam {
	if t == nil {
		return []models.MentorDistributionTeam{}
	}
	for i := range t {
		if t[i].Members == nil {
			t[i].Members = []models.MentorDistributionTeamMember{}
		}
	}
	return t
}

func isQualified(course int, gpa float64, projectCourses []int, minGPA float64) bool {
	if len(projectCourses) > 0 {
		ok := false
		for _, c := range projectCourses {
			if c == course {
				ok = true
				break
			}
		}
		if !ok {
			return false
		}
	}
	return gpa >= minGPA
}
