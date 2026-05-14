package service

import (
	"context"
	"sort"
	"strconv"
	"sync"
	"time"

	"github.com/hsse/project-service/internal/auth"
	"github.com/hsse/project-service/internal/models"
	"github.com/hsse/project-service/internal/repository"
)

type DistributionStatus struct {
	State       string    `json:"state"`
	LastRunAt   time.Time `json:"lastRunAt,omitempty"`
	LastMessage string    `json:"lastMessage,omitempty"`
}

type DistributionService struct {
	projects     repository.ProjectRepositoryInterface
	applications repository.ApplicationRepositoryInterface
	teams        repository.TeamRepositoryInterface

	mu     sync.Mutex
	status DistributionStatus
}

func NewDistributionService(
	projects repository.ProjectRepositoryInterface,
	applications repository.ApplicationRepositoryInterface,
	teams repository.TeamRepositoryInterface,
) *DistributionService {
	return &DistributionService{
		projects:     projects,
		applications: applications,
		teams:        teams,
		status:       DistributionStatus{State: "не начато"},
	}
}

func (s *DistributionService) Generate(ctx context.Context, user *auth.CurrentUser) error {
	if err := RequireRoles(user, auth.RoleCoordinator); err != nil {
		return err
	}

	s.setStatus("в процессе", "distribution started")
	defer func() {
		s.status.LastRunAt = time.Now()
	}()

	projects, _, err := s.projects.GetList(ctx, repository.ProjectListFilters{Limit: 1000, Offset: 0})
	if err != nil {
		s.setStatus("ошибка", err.Error())
		return err
	}

	for _, projectItem := range projects {
		project, err := s.projects.GetByID(ctx, projectItem.ID)
		if err != nil {
			s.setStatus("ошибка", err.Error())
			return err
		}

		teams, err := s.teams.GetByProjectID(ctx, project.ID)
		if err != nil {
			s.setStatus("ошибка", err.Error())
			return err
		}
		for len(teams) < project.NumTeams {
			team := &models.Team{ProjectID: project.ID, Name: "Команда " + strconv.Itoa(len(teams)+1)}
			if err := s.teams.Create(ctx, team); err != nil {
				s.setStatus("ошибка", err.Error())
				return err
			}
			teams = append(teams, *team)
		}

		apps, err := s.applications.GetByProjectID(ctx, project.ID)
		if err != nil {
			s.setStatus("ошибка", err.Error())
			return err
		}
		sort.SliceStable(apps, func(i, j int) bool {
			if apps[i].Priority == apps[j].Priority {
				return apps[i].Student.GPA > apps[j].Student.GPA
			}
			return apps[i].Priority < apps[j].Priority
		})

		capacity := project.NumTeams * project.TeamSizeMax
		recommended := 0
		for i := range apps {
			app := apps[i]
			if app.Status == models.ApplicationStatusAccepted || app.Status == models.ApplicationStatusMentorAccepted {
				recommended++
				continue
			}
			course, _ := strconv.Atoi(app.Student.Course)
			qualified := containsInt(project.Courses, course) && app.Student.GPA >= project.MinGPA
			if !qualified {
				app.Status = models.ApplicationStatusUnqualified
				app.TeamID = nil
			} else if recommended < capacity && len(teams) > 0 {
				teamID := teams[recommended%len(teams)].ID
				app.TeamID = &teamID
				app.Status = models.ApplicationStatusRecommended
				recommended++
			} else {
				app.TeamID = nil
				app.Status = models.ApplicationStatusNotRecommended
			}
			if err := s.applications.Update(ctx, &app.Application); err != nil {
				s.setStatus("ошибка", err.Error())
				return err
			}
		}
	}

	s.setStatus("завершено", "distribution finished successfully")
	return nil
}

func (s *DistributionService) Status() DistributionStatus {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.status
}

func (s *DistributionService) setStatus(state, message string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.status.State = state
	s.status.LastMessage = message
	s.status.LastRunAt = time.Now()
}

func containsInt(values []int, target int) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}
