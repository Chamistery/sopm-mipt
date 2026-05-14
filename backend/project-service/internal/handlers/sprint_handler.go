package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/hsse/project-service/internal/auth"
	"github.com/hsse/project-service/internal/httputil"
	"github.com/hsse/project-service/internal/models"
	"github.com/hsse/project-service/internal/repository"
)

type SprintHandler struct {
	repo repository.SprintRepositoryInterface
}

func NewSprintHandler(repo repository.SprintRepositoryInterface) *SprintHandler {
	return &SprintHandler{repo: repo}
}

func (h *SprintHandler) Create(w http.ResponseWriter, r *http.Request) {
	if !currentUser(r).HasAnyRole(auth.RoleMentor) {
		httputil.RespondError(w, http.StatusForbidden, "forbidden")
		return
	}
	var sprint models.Sprint
	if err := json.NewDecoder(r.Body).Decode(&sprint); err != nil {
		httputil.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if sprint.Status == "" {
		sprint.Status = models.SprintStatusPlanned
	}
	if err := h.repo.Create(r.Context(), &sprint); err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusCreated, sprint)
}

func (h *SprintHandler) CreateBatch(w http.ResponseWriter, r *http.Request) {
	if !currentUser(r).HasAnyRole(auth.RoleMentor) {
		httputil.RespondError(w, http.StatusForbidden, "forbidden")
		return
	}
	var payload struct {
		ProjectID int             `json:"projectId"`
		Sprints   []models.Sprint `json:"sprints"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		httputil.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	for i := range payload.Sprints {
		if payload.Sprints[i].Status == "" {
			payload.Sprints[i].Status = models.SprintStatusPlanned
		}
	}
	if err := h.repo.CreateBatch(r.Context(), payload.ProjectID, payload.Sprints); err != nil {
		respondServiceError(w, err)
		return
	}
	w.WriteHeader(http.StatusCreated)
}

func (h *SprintHandler) GetList(w http.ResponseWriter, r *http.Request) {
	projectID := httputil.ParseQueryInt(r, "projectId", 0)
	if projectID == 0 {
		httputil.RespondError(w, http.StatusBadRequest, "projectId is required")
		return
	}
	sprints, err := h.repo.GetByProjectID(r.Context(), projectID)
	if err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, sprints)
}

func (h *SprintHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	sprint, err := h.repo.GetByID(r.Context(), id)
	if err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, sprint)
}

func (h *SprintHandler) Update(w http.ResponseWriter, r *http.Request) {
	if !currentUser(r).HasAnyRole(auth.RoleMentor) {
		httputil.RespondError(w, http.StatusForbidden, "forbidden")
		return
	}
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	var sprint models.Sprint
	if err := json.NewDecoder(r.Body).Decode(&sprint); err != nil {
		httputil.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	sprint.ID = id
	if err := h.repo.Update(r.Context(), &sprint); err != nil {
		respondServiceError(w, err)
		return
	}
	updated, err := h.repo.GetByID(r.Context(), id)
	if err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, updated)
}
