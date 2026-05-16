package handlers

import (
	"context"
	"net/http"

	"github.com/hsse/project-service/internal/auth"
	"github.com/hsse/project-service/internal/httputil"
	"github.com/hsse/project-service/internal/repository"
)

// DistributionInputProjectTeam — компактное описание команды для входа в
// алгоритм. Без участников/спринтов — алгоритм оперирует только id+name.
type DistributionInputProjectTeam struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type DistributionInputProject struct {
	ID          int                            `json:"id"`
	NumTeams    int                            `json:"numTeams"`
	TeamSizeMin int                            `json:"teamSizeMin"`
	TeamSizeMax int                            `json:"teamSizeMax"`
	MinGpa      float64                        `json:"minGpa"`
	Courses     []int                          `json:"courses"`
	Teams       []DistributionInputProjectTeam `json:"teams"`
}

type DistributionInputStudent struct {
	ID     int     `json:"id"`
	Course string  `json:"course"`
	Gpa    float64 `json:"gpa"`
}

type DistributionInputApplication struct {
	ID        int    `json:"id"`
	ProjectID int    `json:"projectId"`
	StudentID int    `json:"studentId"`
	Priority  int    `json:"priority"`
	Status    string `json:"status"`
	TeamID    *int   `json:"teamId,omitempty"`
}

// DistributionInput — единый снапшот, который distribution_service (C++)
// получает за один HTTP-запрос. Атомарность гарантируется тем, что все
// данные читаются последовательно одним handler'ом — без race между
// тремя отдельными вызовами на стороне C++.
type DistributionInput struct {
	Projects     []DistributionInputProject     `json:"projects"`
	Students     []DistributionInputStudent     `json:"students"`
	Applications []DistributionInputApplication `json:"applications"`
}

type InternalDistributionHandler struct {
	projects     repository.ProjectRepositoryInterface
	teams        repository.TeamRepositoryInterface
	users        repository.UserRepositoryInterface
	applications repository.ApplicationRepositoryInterface
}

func NewInternalDistributionHandler(
	projects repository.ProjectRepositoryInterface,
	teams repository.TeamRepositoryInterface,
	users repository.UserRepositoryInterface,
	applications repository.ApplicationRepositoryInterface,
) *InternalDistributionHandler {
	return &InternalDistributionHandler{
		projects:     projects,
		teams:        teams,
		users:        users,
		applications: applications,
	}
}

// Input возвращает агрегированный снимок данных для distribution_service.
// Доступ только под service-token (allowlist в middleware/auth.go);
// человек-координатор сюда не ходит — у него есть отдельный
// /api/coordinator/distribution view.
func (h *InternalDistributionHandler) Input(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	if !user.IsService {
		httputil.RespondError(w, http.StatusForbidden, "internal endpoint: service-token required")
		return
	}

	ctx := r.Context()
	input, err := h.buildInput(ctx)
	if err != nil {
		httputil.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, input)
}

func (h *InternalDistributionHandler) buildInput(ctx context.Context) (*DistributionInput, error) {
	projectsList, _, err := h.projects.GetList(ctx, repository.ProjectListFilters{Limit: 1000, Offset: 0})
	if err != nil {
		return nil, err
	}

	projects := make([]DistributionInputProject, 0, len(projectsList))
	allApplications := make([]DistributionInputApplication, 0)
	for _, item := range projectsList {
		full, err := h.projects.GetByID(ctx, item.ID)
		if err != nil {
			return nil, err
		}
		teams, err := h.teams.GetByProjectID(ctx, item.ID)
		if err != nil {
			return nil, err
		}
		teamDTOs := make([]DistributionInputProjectTeam, 0, len(teams))
		for _, t := range teams {
			teamDTOs = append(teamDTOs, DistributionInputProjectTeam{ID: t.ID, Name: t.Name})
		}
		projects = append(projects, DistributionInputProject{
			ID:          full.ID,
			NumTeams:    full.NumTeams,
			TeamSizeMin: full.TeamSizeMin,
			TeamSizeMax: full.TeamSizeMax,
			MinGpa:      full.MinGPA,
			Courses:     full.Courses,
			Teams:       teamDTOs,
		})

		apps, err := h.applications.GetByProjectID(ctx, item.ID)
		if err != nil {
			return nil, err
		}
		for _, a := range apps {
			allApplications = append(allApplications, DistributionInputApplication{
				ID:        a.ID,
				ProjectID: a.ProjectID,
				StudentID: a.StudentID,
				Priority:  a.Priority,
				Status:    string(a.Status),
				TeamID:    a.TeamID,
			})
		}
	}

	users, err := h.users.GetAll(ctx)
	if err != nil {
		return nil, err
	}
	students := make([]DistributionInputStudent, 0, len(users))
	for _, u := range users {
		if auth.ParseRole(u.Role) != auth.RoleStudent {
			continue
		}
		students = append(students, DistributionInputStudent{
			ID:     u.ID,
			Course: u.Course,
			Gpa:    u.GPA,
		})
	}

	return &DistributionInput{
		Projects:     projects,
		Students:     students,
		Applications: allApplications,
	}, nil
}
