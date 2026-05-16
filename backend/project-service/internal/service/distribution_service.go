package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
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

// DistributionRunResult — то, что Generate возвращает наверх к handler'у.
// Числа пробрасываются на фронт, чтобы координатор увидел popup
// «N рекомендовано, M не рекомендовано».
type DistributionRunResult struct {
	State               string `json:"state"`
	Applied             int    `json:"applied"`
	Skipped             int    `json:"skipped"`
	RecommendedCount    int    `json:"recommendedCount"`
	NotRecommendedCount int    `json:"notRecommendedCount"`
	Message             string `json:"message,omitempty"`
}

// DistributionClient — порт для внешнего сервиса распределения.
// Реальная реализация делает HTTP-вызов к C++ Гейля-Шепли; в тестах
// можно подменить in-memory.
type DistributionClient interface {
	Run(ctx context.Context) (*DistributionExternalResult, error)
}

// DistributionExternalResult описывает JSON-ответ /api/distribution/start.
type DistributionExternalResult struct {
	Recommended    []DistributionAppDTO `json:"recommended"`
	NotRecommended []DistributionAppDTO `json:"not_recommended"`
}

type DistributionAppDTO struct {
	ID        int     `json:"id"`
	ProjectID int     `json:"projectId"`
	StudentID int     `json:"studentId"`
	Priority  int     `json:"priority"`
	Status    string  `json:"status"`
	TeamID    *int    `json:"teamId"`
}

// HTTPDistributionClient вызывает внешний distribution_service по HTTP.
// При недоступности (connection refused / 5xx / timeout) возвращает
// ErrServiceUnavailable, чтобы handler отдал 503 фронту.
//
// Auth: на сегодня C++ сервис не аутентифицирует входящие вызовы —
// его HTTP-эндпоинт доступен только внутри docker-network. Если в
// будущем понадобится взаимная аутентификация, добавляем заголовок
// здесь, а на C++ стороне проверяем тот же INTERNAL_SERVICE_TOKEN.
type HTTPDistributionClient struct {
	baseURL string
	http    *http.Client
}

func NewHTTPDistributionClient(baseURL string) *HTTPDistributionClient {
	return &HTTPDistributionClient{
		baseURL: baseURL,
		http:    &http.Client{Timeout: 60 * time.Second},
	}
}

func (c *HTTPDistributionClient) Run(ctx context.Context) (*DistributionExternalResult, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/api/distribution/start", nil)
	if err != nil {
		return nil, err
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrServiceUnavailable, err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("%w: read body: %v", ErrServiceUnavailable, err)
	}
	if resp.StatusCode >= 500 || resp.StatusCode == http.StatusServiceUnavailable {
		return nil, fmt.Errorf("%w: upstream HTTP %d: %s", ErrServiceUnavailable, resp.StatusCode, string(body))
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("distribution upstream returned HTTP %d: %s", resp.StatusCode, string(body))
	}

	var out DistributionExternalResult
	if err := json.Unmarshal(body, &out); err != nil {
		return nil, fmt.Errorf("distribution upstream: malformed JSON: %v", err)
	}
	return &out, nil
}

type DistributionService struct {
	projects     repository.ProjectRepositoryInterface
	applications repository.ApplicationRepositoryInterface
	teams        repository.TeamRepositoryInterface

	// client != nil → используем внешний C++ сервис.
	// client == nil → fallback на встроенный наивный Go-алгоритм
	// (нужен для unit-тестов, MSW e2e и dev-режима без docker-compose).
	client DistributionClient

	mu     sync.Mutex
	status DistributionStatus
}

func NewDistributionService(
	projects repository.ProjectRepositoryInterface,
	applications repository.ApplicationRepositoryInterface,
	teams repository.TeamRepositoryInterface,
	client DistributionClient,
) *DistributionService {
	return &DistributionService{
		projects:     projects,
		applications: applications,
		teams:        teams,
		client:       client,
		status:       DistributionStatus{State: "не начато"},
	}
}

func (s *DistributionService) Generate(ctx context.Context, user *auth.CurrentUser) (*DistributionRunResult, error) {
	if err := RequireRoles(user, auth.RoleCoordinator); err != nil {
		return nil, err
	}

	s.setStatus("в процессе", "distribution started")

	if s.client != nil {
		return s.generateViaExternal(ctx)
	}
	return s.generateInProcess(ctx)
}

// generateViaExternal зовёт C++ сервис и применяет результат атомарно.
func (s *DistributionService) generateViaExternal(ctx context.Context) (*DistributionRunResult, error) {
	out, err := s.client.Run(ctx)
	if err != nil {
		s.setStatus("ошибка", err.Error())
		return nil, err
	}

	updates := make([]repository.DistributionApplicationUpdate, 0, len(out.Recommended)+len(out.NotRecommended))
	for _, app := range out.Recommended {
		updates = append(updates, repository.DistributionApplicationUpdate{
			ApplicationID: app.ID,
			TeamID:        app.TeamID,
			Status:        models.ApplicationStatusRecommended,
		})
	}
	for _, app := range out.NotRecommended {
		status := models.ApplicationStatusNotRecommended
		if app.Status == "unqualified" {
			status = models.ApplicationStatusUnqualified
		}
		updates = append(updates, repository.DistributionApplicationUpdate{
			ApplicationID: app.ID,
			TeamID:        nil,
			Status:        status,
		})
	}

	stats, err := s.applications.ApplyDistribution(ctx, updates)
	if err != nil {
		s.setStatus("ошибка", err.Error())
		return nil, err
	}

	msg := fmt.Sprintf("Распределение завершено: %d рекомендовано, %d не рекомендовано (применено %d, пропущено %d ручных решений)",
		len(out.Recommended), len(out.NotRecommended), stats.Applied, stats.Skipped)
	s.setStatus("завершено", msg)

	return &DistributionRunResult{
		State:               "завершено",
		Applied:             stats.Applied,
		Skipped:             stats.Skipped,
		RecommendedCount:    len(out.Recommended),
		NotRecommendedCount: len(out.NotRecommended),
		Message:             msg,
	}, nil
}

// generateInProcess — встроенный наивный алгоритм (приоритет → GPA →
// round-robin по командам). Используется в dev/test, когда нет
// доступного C++ сервиса распределения.
func (s *DistributionService) generateInProcess(ctx context.Context) (*DistributionRunResult, error) {
	projects, _, err := s.projects.GetList(ctx, repository.ProjectListFilters{Limit: 1000, Offset: 0})
	if err != nil {
		s.setStatus("ошибка", err.Error())
		return nil, err
	}

	recommendedTotal := 0
	notRecommendedTotal := 0

	for _, projectItem := range projects {
		project, err := s.projects.GetByID(ctx, projectItem.ID)
		if err != nil {
			s.setStatus("ошибка", err.Error())
			return nil, err
		}

		teams, err := s.teams.GetByProjectID(ctx, project.ID)
		if err != nil {
			s.setStatus("ошибка", err.Error())
			return nil, err
		}
		for len(teams) < project.NumTeams {
			team := &models.Team{ProjectID: project.ID, Name: "Команда " + strconv.Itoa(len(teams)+1)}
			if err := s.teams.Create(ctx, team); err != nil {
				s.setStatus("ошибка", err.Error())
				return nil, err
			}
			teams = append(teams, *team)
		}

		apps, err := s.applications.GetByProjectID(ctx, project.ID)
		if err != nil {
			s.setStatus("ошибка", err.Error())
			return nil, err
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
				recommendedTotal++
				continue
			}
			course, _ := strconv.Atoi(app.Student.Course)
			qualified := containsInt(project.Courses, course) && app.Student.GPA >= project.MinGPA
			if !qualified {
				app.Status = models.ApplicationStatusUnqualified
				app.TeamID = nil
				notRecommendedTotal++
			} else if recommended < capacity && len(teams) > 0 {
				teamID := teams[recommended%len(teams)].ID
				app.TeamID = &teamID
				app.Status = models.ApplicationStatusRecommended
				recommended++
				recommendedTotal++
			} else {
				app.TeamID = nil
				app.Status = models.ApplicationStatusNotRecommended
				notRecommendedTotal++
			}
			if err := s.applications.Update(ctx, &app.Application); err != nil {
				s.setStatus("ошибка", err.Error())
				return nil, err
			}
		}
	}

	msg := fmt.Sprintf("Распределение (in-process) завершено: %d рекомендовано, %d не рекомендовано",
		recommendedTotal, notRecommendedTotal)
	s.setStatus("завершено", msg)
	return &DistributionRunResult{
		State:               "завершено",
		Applied:             recommendedTotal + notRecommendedTotal,
		Skipped:             0,
		RecommendedCount:    recommendedTotal,
		NotRecommendedCount: notRecommendedTotal,
		Message:             msg,
	}, nil
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

// Ensures fmt.Errorf %w chain still works for downstream errors.Is.
var _ = errors.Is
