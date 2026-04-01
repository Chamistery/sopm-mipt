package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/hsse/project-service/internal/httputil"
	"github.com/hsse/project-service/internal/models"
	"github.com/hsse/project-service/internal/repository"
	"github.com/hsse/project-service/internal/validation"
)

type ApplicationHandler struct {
	repo repository.ApplicationRepositoryInterface
}

func NewApplicationHandler(repo repository.ApplicationRepositoryInterface) *ApplicationHandler {
	return &ApplicationHandler{repo: repo}
}

type CreateApplicationRequest struct {
	ProjectID int `json:"projectId"`
	StudentID int `json:"studentId"`
	Priority  int `json:"priority"`
}

func (h *ApplicationHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req CreateApplicationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate input
	v := validation.NewValidator()
	v.PositiveInt("projectId", req.ProjectID)
	v.PositiveInt("studentId", req.StudentID)
	v.NonNegativeInt("priority", req.Priority)
	v.IntRange("priority", req.Priority, 0, 100)

	if v.HasErrors() {
		httputil.RespondError(w, http.StatusBadRequest, v.Errors().Error())
		return
	}

	app := &models.Application{
		ProjectID: req.ProjectID,
		StudentID: req.StudentID,
		Priority:  req.Priority,
		Status:    models.ApplicationStatusPending,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	if err := h.repo.Create(r.Context(), app); err != nil {
		httputil.RespondError(w, http.StatusInternalServerError, "Failed to create application")
		return
	}

	httputil.RespondSuccess(w, http.StatusCreated, app)
}

func (h *ApplicationHandler) GetByStudentID(w http.ResponseWriter, r *http.Request) {
	studentID := httputil.ParseQueryInt(r, "studentId", 0)
	if studentID == 0 {
		httputil.RespondError(w, http.StatusBadRequest, "Student ID is required")
		return
	}

	apps, err := h.repo.GetByStudentID(r.Context(), studentID)
	if err != nil {
		httputil.RespondError(w, http.StatusInternalServerError, "Failed to fetch applications")
		return
	}

	httputil.RespondSuccess(w, http.StatusOK, apps)
}

func (h *ApplicationHandler) GetByProjectID(w http.ResponseWriter, r *http.Request) {
	projectID := httputil.ParseQueryInt(r, "projectId", 0)
	if projectID == 0 {
		httputil.RespondError(w, http.StatusBadRequest, "Project ID is required")
		return
	}

	apps, err := h.repo.GetByProjectID(r.Context(), projectID)
	if err != nil {
		httputil.RespondError(w, http.StatusInternalServerError, "Failed to fetch applications")
		return
	}

	httputil.RespondSuccess(w, http.StatusOK, apps)
}

type UpdateApplicationRequest struct {
	Priority int    `json:"priority"`
	Status   string `json:"status"`
}

func (h *ApplicationHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	var req UpdateApplicationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate input
	v := validation.NewValidator()
	v.PositiveInt("id", id)
	v.NonNegativeInt("priority", req.Priority)
	v.IntRange("priority", req.Priority, 0, 100)
	v.ValidApplicationStatus("status", models.ApplicationStatus(req.Status))

	if v.HasErrors() {
		httputil.RespondError(w, http.StatusBadRequest, v.Errors().Error())
		return
	}

	app := &models.Application{
		ID:       id,
		Priority: req.Priority,
		Status:   models.ApplicationStatus(req.Status),
	}
	if err := h.repo.Update(r.Context(), app); err != nil {
		httputil.RespondError(w, http.StatusNotFound, "Application not found")
		return
	}

	updatedApp, err := h.repo.GetByID(r.Context(), id)
	if err != nil {
		httputil.RespondError(w, http.StatusInternalServerError, "Failed to fetch updated application")
		return
	}

	httputil.RespondSuccess(w, http.StatusOK, updatedApp)
}

type UpdatePrioritiesRequest struct {
	Applications []struct {
		ID       int `json:"id"`
		Priority int `json:"priority"`
	} `json:"applications"`
}

func (h *ApplicationHandler) UpdatePriorities(w http.ResponseWriter, r *http.Request) {
	studentID := httputil.ParseQueryInt(r, "studentId", 0)
	if studentID == 0 {
		httputil.RespondError(w, http.StatusBadRequest, "Student ID is required")
		return
	}

	var req UpdatePrioritiesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate input
	v := validation.NewValidator()
	v.PositiveInt("studentId", studentID)
	v.MinArrayLength("applications", len(req.Applications), 1)
	v.MaxArrayLength("applications", len(req.Applications), 100)

	for i, a := range req.Applications {
		appPrefix := fmt.Sprintf("applications[%d]", i)
		v.PositiveInt(appPrefix+".id", a.ID)
		v.NonNegativeInt(appPrefix+".priority", a.Priority)
		v.IntRange(appPrefix+".priority", a.Priority, 0, 100)
	}

	if v.HasErrors() {
		httputil.RespondError(w, http.StatusBadRequest, v.Errors().Error())
		return
	}

	apps := make([]models.Application, len(req.Applications))

	for i, a := range req.Applications {
		apps[i] = models.Application{
			ID:       a.ID,
			Priority: a.Priority,
		}
	}

	if err := h.repo.UpdatePriorities(r.Context(), studentID, apps); err != nil {
		httputil.RespondError(w, http.StatusInternalServerError, "Failed to update priorities")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *ApplicationHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.repo.Delete(r.Context(), id); err != nil {
		httputil.RespondError(w, http.StatusNotFound, "Application not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
