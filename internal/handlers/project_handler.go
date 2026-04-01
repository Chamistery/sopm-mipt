package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/hsse/project-service/internal/httputil"
	"github.com/hsse/project-service/internal/models"
	"github.com/hsse/project-service/internal/repository"
	"github.com/hsse/project-service/internal/validation"
)

type ProjectHandler struct {
	repo repository.ProjectRepositoryInterface
}

func NewProjectHandler(repo repository.ProjectRepositoryInterface) *ProjectHandler {
	return &ProjectHandler{repo: repo}
}

type CreateProjectRequest struct {
	Title       string             `json:"title"`
	TemplateID  string             `json:"templateId"`
	FieldValues models.FieldValues `json:"fieldValues"`
	MentorID    int                `json:"mentorId"`
	CreatorID   int                `json:"creatorId"`
	MaxSlots    int                `json:"maxSlots"`
	Company     string             `json:"company"`
	Course      string             `json:"course"`
}

func (h *ProjectHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req CreateProjectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate input
	v := validation.NewValidator()
	v.RequiredString("title", req.Title)
	v.MaxLength("title", req.Title, 500)
	v.SafeString("title", req.Title)

	v.RequiredString("templateId", req.TemplateID)
	v.UUID("templateId", req.TemplateID)

	v.PositiveInt("mentorId", req.MentorID)
	v.PositiveInt("creatorId", req.CreatorID)
	v.PositiveInt("maxSlots", req.MaxSlots)
	v.IntRange("maxSlots", req.MaxSlots, 1, 100)

	v.MaxLength("company", req.Company, 200)
	v.SafeString("company", req.Company)

	v.MaxLength("course", req.Course, 200)
	v.SafeString("course", req.Course)

	v.MaxArrayLength("fieldValues", len(req.FieldValues), 100)

	// Validate each field value
	for i, fv := range req.FieldValues {
		v.RequiredString(fmt.Sprintf("fieldValues[%d].fieldId", i), fv.FieldID)
		v.MaxLength(fmt.Sprintf("fieldValues[%d].fieldId", i), fv.FieldID, 100)
		v.SafeString(fmt.Sprintf("fieldValues[%d].fieldId", i), fv.FieldID)
		v.MaxLength(fmt.Sprintf("fieldValues[%d].value", i), fv.Value, 10000)
	}

	if v.HasErrors() {
		httputil.RespondError(w, http.StatusBadRequest, v.Errors().Error())
		return
	}

	project := &models.Project{
		Title:       strings.TrimSpace(req.Title),
		TemplateID:  strings.TrimSpace(req.TemplateID),
		FieldValues: req.FieldValues,
		Status:      models.ProjectStatusDraft,
		MentorID:    req.MentorID,
		CreatorID:   req.CreatorID,
		MaxSlots:    req.MaxSlots,
		Company:     strings.TrimSpace(req.Company),
		Course:      strings.TrimSpace(req.Course),
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	if err := h.repo.Create(r.Context(), project); err != nil {
		httputil.RespondError(w, http.StatusInternalServerError, "Failed to create project")
		return
	}

	httputil.RespondSuccess(w, http.StatusCreated, project)
}

func (h *ProjectHandler) GetList(w http.ResponseWriter, r *http.Request) {
	limit := httputil.ParseQueryInt(r, "limit", 20)
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	offset := httputil.ParseQueryInt(r, "offset", 0)
	if offset < 0 {
		offset = 0
	}

	company := httputil.ParseQueryString(r, "company")
	course := httputil.ParseQueryString(r, "course")
	status := httputil.ParseQueryString(r, "status")

	// Validate filter inputs
	v := validation.NewValidator()
	v.MaxLength("company", company, 200)
	v.SafeString("company", company)
	v.MaxLength("course", course, 200)
	v.SafeString("course", course)
	v.ValidProjectStatus("status", models.ProjectStatus(status))

	if v.HasErrors() {
		httputil.RespondError(w, http.StatusBadRequest, v.Errors().Error())
		return
	}

	filters := repository.ProjectListFilters{
		Company: company,
		Course:  course,
		Status:  status,
		Limit:   limit,
		Offset:  offset,
	}

	projects, total, err := h.repo.GetList(r.Context(), filters)
	if err != nil {
		httputil.RespondError(w, http.StatusInternalServerError, "Failed to fetch projects")
		return
	}

	response := map[string]interface{}{
		"projects": projects,
		"total":    total,
		"limit":    limit,
		"offset":   offset,
	}
	httputil.RespondSuccess(w, http.StatusOK, response)
}

func (h *ProjectHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	project, err := h.repo.GetByID(r.Context(), id)
	if err != nil {
		httputil.RespondError(w, http.StatusNotFound, "Project not found")
		return
	}

	httputil.RespondSuccess(w, http.StatusOK, project)
}

type UpdateProjectRequest struct {
	Title       string             `json:"title"`
	FieldValues models.FieldValues `json:"fieldValues"`
	Status      string             `json:"status"`
	MaxSlots    int                `json:"maxSlots"`
	Company     string             `json:"company"`
	Course      string             `json:"course"`
}

func (h *ProjectHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	var req UpdateProjectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate input
	v := validation.NewValidator()
	v.PositiveInt("id", id)
	v.RequiredString("title", req.Title)
	v.MaxLength("title", req.Title, 500)
	v.SafeString("title", req.Title)

	v.ValidProjectStatus("status", models.ProjectStatus(req.Status))
	v.PositiveInt("maxSlots", req.MaxSlots)
	v.IntRange("maxSlots", req.MaxSlots, 1, 100)

	v.MaxLength("company", req.Company, 200)
	v.SafeString("company", req.Company)

	v.MaxLength("course", req.Course, 200)
	v.SafeString("course", req.Course)

	v.MaxArrayLength("fieldValues", len(req.FieldValues), 100)

	// Validate each field value
	for i, fv := range req.FieldValues {
		v.RequiredString(fmt.Sprintf("fieldValues[%d].fieldId", i), fv.FieldID)
		v.MaxLength(fmt.Sprintf("fieldValues[%d].fieldId", i), fv.FieldID, 100)
		v.SafeString(fmt.Sprintf("fieldValues[%d].fieldId", i), fv.FieldID)
		v.MaxLength(fmt.Sprintf("fieldValues[%d].value", i), fv.Value, 10000)
	}

	if v.HasErrors() {
		httputil.RespondError(w, http.StatusBadRequest, v.Errors().Error())
		return
	}

	project := &models.Project{
		ID:          id,
		Title:       strings.TrimSpace(req.Title),
		FieldValues: req.FieldValues,
		Status:      models.ProjectStatus(req.Status),
		MaxSlots:    req.MaxSlots,
		Company:     strings.TrimSpace(req.Company),
		Course:      strings.TrimSpace(req.Course),
	}
	if err := h.repo.Update(r.Context(), project); err != nil {
		httputil.RespondError(w, http.StatusNotFound, "Project not found")
		return
	}

	updatedProject, err := h.repo.GetByID(r.Context(), id)
	if err != nil {
		httputil.RespondError(w, http.StatusInternalServerError, "Failed to fetch updated project")
		return
	}

	httputil.RespondSuccess(w, http.StatusOK, updatedProject)
}

func (h *ProjectHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.repo.Delete(r.Context(), id); err != nil {
		httputil.RespondError(w, http.StatusNotFound, "Project not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
