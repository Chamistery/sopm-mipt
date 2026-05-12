package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/hsse/project-service/internal/httputil"
	"github.com/hsse/project-service/internal/models"
	"github.com/hsse/project-service/internal/repository"
	"github.com/hsse/project-service/internal/service"
)

type ApplicationHandler struct {
	repo    repository.ApplicationRepositoryInterface
	service *service.ApplicationService
}

func NewApplicationHandler(repo repository.ApplicationRepositoryInterface, svc *service.ApplicationService) *ApplicationHandler {
	return &ApplicationHandler{repo: repo, service: svc}
}

func (h *ApplicationHandler) Create(w http.ResponseWriter, r *http.Request) {
	var app models.Application
	if err := json.NewDecoder(r.Body).Decode(&app); err != nil {
		httputil.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := h.service.Create(r.Context(), currentUser(r), &app); err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusCreated, app)
}

func (h *ApplicationHandler) GetByStudentID(w http.ResponseWriter, r *http.Request) {
	studentID := httputil.ParseQueryInt(r, "studentId", 0)
	if studentID == 0 {
		httputil.RespondError(w, http.StatusBadRequest, "studentId is required")
		return
	}
	apps, err := h.repo.GetByStudentID(r.Context(), studentID)
	if err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, apps)
}

func (h *ApplicationHandler) GetByProjectID(w http.ResponseWriter, r *http.Request) {
	projectID := httputil.ParseQueryInt(r, "projectId", 0)
	if projectID == 0 {
		httputil.RespondError(w, http.StatusBadRequest, "projectId is required")
		return
	}
	apps, err := h.repo.GetByProjectID(r.Context(), projectID)
	if err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, apps)
}

func (h *ApplicationHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	app, err := h.repo.GetByID(r.Context(), id)
	if err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, app)
}

func (h *ApplicationHandler) Recommend(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	var payload struct {
		TeamID int `json:"teamId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		httputil.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	app, err := h.service.Recommend(r.Context(), currentUser(r), id, payload.TeamID)
	if err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, app)
}

// MoveToTeam — координатор перетаскивает чип из одной команды в другую
// внутри того же проекта, СОХРАНЯЯ статус. Body: { teamId }.
func (h *ApplicationHandler) MoveToTeam(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	var payload struct {
		TeamID int `json:"teamId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		httputil.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	app, err := h.service.MoveToTeam(r.Context(), currentUser(r), id, payload.TeamID)
	if err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, app)
}

func (h *ApplicationHandler) Unrecommend(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	app, err := h.service.Unrecommend(r.Context(), currentUser(r), id)
	if err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, app)
}

func (h *ApplicationHandler) Invite(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	app, err := h.service.Invite(r.Context(), currentUser(r), id)
	if err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, app)
}

func (h *ApplicationHandler) Accept(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	app, err := h.service.Accept(r.Context(), currentUser(r), id)
	if err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, app)
}

func (h *ApplicationHandler) Decline(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	app, err := h.service.Decline(r.Context(), currentUser(r), id)
	if err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, app)
}

func (h *ApplicationHandler) Exclude(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	app, err := h.service.Exclude(r.Context(), currentUser(r), id)
	if err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, app)
}

func (h *ApplicationHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.repo.Delete(r.Context(), id); err != nil {
		respondServiceError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
