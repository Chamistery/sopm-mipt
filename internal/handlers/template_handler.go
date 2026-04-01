package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/hsse/project-service/internal/httputil"
	"github.com/hsse/project-service/internal/models"
	"github.com/hsse/project-service/internal/repository"
	"github.com/hsse/project-service/internal/validation"
)

type TemplateHandler struct {
	repo repository.TemplateRepositoryInterface
}

func NewTemplateHandler(repo repository.TemplateRepositoryInterface) *TemplateHandler {
	return &TemplateHandler{repo: repo}
}

type CreateTemplateRequest struct {
	Name   string                `json:"name"`
	Fields models.TemplateFields `json:"fields"`
}

func (h *TemplateHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req CreateTemplateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate input
	v := validation.NewValidator()
	v.RequiredString("name", req.Name)
	v.MaxLength("name", req.Name, 200)
	v.SafeString("name", req.Name)
	v.MinArrayLength("fields", len(req.Fields), 1)
	v.MaxArrayLength("fields", len(req.Fields), 50)

	// Validate each field
	fieldIDs := make([]string, 0, len(req.Fields))
	for i, field := range req.Fields {
		fieldPrefix := fmt.Sprintf("fields[%d]", i)

		v.RequiredString(fieldPrefix+".id", field.ID)
		v.MaxLength(fieldPrefix+".id", field.ID, 100)
		v.SafeString(fieldPrefix+".id", field.ID)

		v.RequiredString(fieldPrefix+".name", field.Name)
		v.MaxLength(fieldPrefix+".name", field.Name, 200)
		v.SafeString(fieldPrefix+".name", field.Name)

		v.ValidFieldType(fieldPrefix+".type", field.Type)

		fieldIDs = append(fieldIDs, field.ID)
	}

	// Check for unique field IDs
	v.UniqueStrings("fields", fieldIDs)

	if v.HasErrors() {
		httputil.RespondError(w, http.StatusBadRequest, v.Errors().Error())
		return
	}

	template := &models.Template{
		ID:        uuid.New().String(),
		Name:      strings.TrimSpace(req.Name),
		Fields:    req.Fields,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := h.repo.Create(r.Context(), template); err != nil {
		httputil.RespondError(w, http.StatusInternalServerError, "Failed to create template")
		return
	}

	httputil.RespondSuccess(w, http.StatusCreated, template)
}

func (h *TemplateHandler) GetAll(w http.ResponseWriter, r *http.Request) {
	templates, err := h.repo.GetAll(r.Context())
	if err != nil {
		httputil.RespondError(w, http.StatusInternalServerError, "Failed to fetch templates")
		return
	}

	httputil.RespondSuccess(w, http.StatusOK, templates)
}

func (h *TemplateHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.ParsePathString(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Validate UUID format
	v := validation.NewValidator()
	v.UUID("id", id)
	if v.HasErrors() {
		httputil.RespondError(w, http.StatusBadRequest, v.Errors().Error())
		return
	}

	template, err := h.repo.GetByID(r.Context(), id)
	if err != nil {
		httputil.RespondError(w, http.StatusNotFound, "Template not found")
		return
	}

	httputil.RespondSuccess(w, http.StatusOK, template)
}

type UpdateTemplateRequest struct {
	Name   string                `json:"name"`
	Fields models.TemplateFields `json:"fields"`
}

func (h *TemplateHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.ParsePathString(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	var req UpdateTemplateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate input
	v := validation.NewValidator()
	v.UUID("id", id)
	v.RequiredString("name", req.Name)
	v.MaxLength("name", req.Name, 200)
	v.SafeString("name", req.Name)
	v.MinArrayLength("fields", len(req.Fields), 1)
	v.MaxArrayLength("fields", len(req.Fields), 50)

	// Validate each field
	fieldIDs := make([]string, 0, len(req.Fields))
	for i, field := range req.Fields {
		fieldPrefix := fmt.Sprintf("fields[%d]", i)

		v.RequiredString(fieldPrefix+".id", field.ID)
		v.MaxLength(fieldPrefix+".id", field.ID, 100)
		v.SafeString(fieldPrefix+".id", field.ID)

		v.RequiredString(fieldPrefix+".name", field.Name)
		v.MaxLength(fieldPrefix+".name", field.Name, 200)
		v.SafeString(fieldPrefix+".name", field.Name)

		v.ValidFieldType(fieldPrefix+".type", field.Type)

		fieldIDs = append(fieldIDs, field.ID)
	}

	// Check for unique field IDs
	v.UniqueStrings("fields", fieldIDs)

	if v.HasErrors() {
		httputil.RespondError(w, http.StatusBadRequest, v.Errors().Error())
		return
	}

	template := &models.Template{
		ID:     id,
		Name:   strings.TrimSpace(req.Name),
		Fields: req.Fields,
	}

	if err := h.repo.Update(r.Context(), template); err != nil {
		httputil.RespondError(w, http.StatusNotFound, "Template not found")
		return
	}

	updatedTemplate, err := h.repo.GetByID(r.Context(), id)
	if err != nil {
		httputil.RespondError(w, http.StatusInternalServerError, "Failed to fetch updated template")
		return
	}

	httputil.RespondSuccess(w, http.StatusOK, updatedTemplate)
}

func (h *TemplateHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.ParsePathString(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Validate UUID format
	v := validation.NewValidator()
	v.UUID("id", id)
	if v.HasErrors() {
		httputil.RespondError(w, http.StatusBadRequest, v.Errors().Error())
		return
	}

	if err := h.repo.Delete(r.Context(), id); err != nil {
		httputil.RespondError(w, http.StatusNotFound, "Template not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
