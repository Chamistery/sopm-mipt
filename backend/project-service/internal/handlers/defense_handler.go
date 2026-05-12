package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/hsse/project-service/internal/auth"
	"github.com/hsse/project-service/internal/httputil"
	"github.com/hsse/project-service/internal/models"
	"github.com/hsse/project-service/internal/repository"
)

type DefenseRepoInterface interface {
	List(ctx context.Context) ([]models.Defense, error)
	GetByID(ctx context.Context, id int) (*models.Defense, error)
	Create(ctx context.Context, in repository.DefenseInput, createdByID int) (*models.Defense, error)
	Update(ctx context.Context, id int, in repository.DefenseInput) (*models.Defense, error)
	Delete(ctx context.Context, id int) error
}

type DefenseHandler struct {
	repo DefenseRepoInterface
}

func NewDefenseHandler(repo DefenseRepoInterface) *DefenseHandler {
	return &DefenseHandler{repo: repo}
}

func (h *DefenseHandler) List(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	if !user.IsAuthenticated() {
		httputil.RespondError(w, http.StatusUnauthorized, "authentication required")
		return
	}
	items, err := h.repo.List(r.Context())
	if err != nil {
		httputil.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if items == nil {
		items = []models.Defense{}
	}
	httputil.RespondSuccess(w, http.StatusOK, map[string]interface{}{
		"defenses": items,
	})
}

type defenseRequest struct {
	Title         string     `json:"title"`
	StartsAt      time.Time  `json:"startsAt"`
	EndsAt        *time.Time `json:"endsAt"`
	Location      string     `json:"location"`
	Description   string     `json:"description"`
	SemesterLabel string     `json:"semesterLabel"`
	Completed     bool       `json:"completed"`
	ProjectIDs    []int      `json:"projectIds"`
	ExpertUserIDs []int      `json:"expertUserIds"`
}

func (h *DefenseHandler) Create(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	if !user.HasAnyRole(auth.RoleCoordinator, auth.RoleAdmin) {
		httputil.RespondError(w, http.StatusForbidden, "coordinator or admin only")
		return
	}
	var req defenseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Title == "" || req.StartsAt.IsZero() {
		httputil.RespondError(w, http.StatusBadRequest, "title and startsAt are required")
		return
	}
	d, err := h.repo.Create(r.Context(), repository.DefenseInput{
		Title:         req.Title,
		StartsAt:      req.StartsAt,
		EndsAt:        req.EndsAt,
		Location:      req.Location,
		Description:   req.Description,
		SemesterLabel: req.SemesterLabel,
		Completed:     req.Completed,
		ProjectIDs:    req.ProjectIDs,
		ExpertUserIDs: req.ExpertUserIDs,
	}, user.ID)
	if err != nil {
		httputil.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	httputil.RespondSuccess(w, http.StatusCreated, d)
}

func (h *DefenseHandler) Update(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	if !user.HasAnyRole(auth.RoleCoordinator, auth.RoleAdmin) {
		httputil.RespondError(w, http.StatusForbidden, "coordinator or admin only")
		return
	}
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	var req defenseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	d, err := h.repo.Update(r.Context(), id, repository.DefenseInput{
		Title:         req.Title,
		StartsAt:      req.StartsAt,
		EndsAt:        req.EndsAt,
		Location:      req.Location,
		Description:   req.Description,
		SemesterLabel: req.SemesterLabel,
		Completed:     req.Completed,
		ProjectIDs:    req.ProjectIDs,
		ExpertUserIDs: req.ExpertUserIDs,
	})
	if err != nil {
		httputil.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, d)
}

func (h *DefenseHandler) Delete(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	if !user.HasAnyRole(auth.RoleCoordinator, auth.RoleAdmin) {
		httputil.RespondError(w, http.StatusForbidden, "coordinator or admin only")
		return
	}
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.repo.Delete(r.Context(), id); err != nil {
		httputil.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
