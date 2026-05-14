package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/hsse/project-service/internal/auth"
	"github.com/hsse/project-service/internal/httputil"
	"github.com/hsse/project-service/internal/models"
	"github.com/hsse/project-service/internal/repository"
)

type TeamReportHandler struct {
	repo repository.TeamReportRepositoryInterface
}

func NewTeamReportHandler(repo repository.TeamReportRepositoryInterface) *TeamReportHandler {
	return &TeamReportHandler{repo: repo}
}

func (h *TeamReportHandler) Create(w http.ResponseWriter, r *http.Request) {
	if !currentUser(r).HasAnyRole(auth.RoleTeamLead) {
		httputil.RespondError(w, http.StatusForbidden, "forbidden")
		return
	}
	var report models.TeamReport
	if err := json.NewDecoder(r.Body).Decode(&report); err != nil {
		httputil.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if report.Status == "" {
		report.Status = models.TeamReportStatusDraft
	}
	if report.Status == models.TeamReportStatusSubmitted {
		now := time.Now()
		report.SubmittedAt = &now
	}
	if err := h.repo.Create(r.Context(), &report); err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusCreated, report)
}

func (h *TeamReportHandler) GetList(w http.ResponseWriter, r *http.Request) {
	teamID := httputil.ParseQueryInt(r, "teamId", 0)
	sprintID := httputil.ParseQueryInt(r, "sprintId", 0)
	if teamID == 0 {
		httputil.RespondError(w, http.StatusBadRequest, "teamId is required")
		return
	}
	if sprintID > 0 {
		report, err := h.repo.GetByTeamAndSprint(r.Context(), teamID, sprintID)
		if err != nil {
			respondServiceError(w, err)
			return
		}
		httputil.RespondSuccess(w, http.StatusOK, report)
		return
	}
	reports, err := h.repo.GetByTeamID(r.Context(), teamID)
	if err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, reports)
}

func (h *TeamReportHandler) Update(w http.ResponseWriter, r *http.Request) {
	if !currentUser(r).HasAnyRole(auth.RoleTeamLead) {
		httputil.RespondError(w, http.StatusForbidden, "forbidden")
		return
	}
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	report, err := h.repo.GetByID(r.Context(), id)
	if err != nil {
		respondServiceError(w, err)
		return
	}
	if err := json.NewDecoder(r.Body).Decode(report); err != nil {
		httputil.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	report.ID = id
	if report.Status == models.TeamReportStatusSubmitted && report.SubmittedAt == nil {
		now := time.Now()
		report.SubmittedAt = &now
	}
	if err := h.repo.Update(r.Context(), report); err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, report)
}

func (h *TeamReportHandler) Review(w http.ResponseWriter, r *http.Request) {
	if !currentUser(r).HasAnyRole(auth.RoleMentor) {
		httputil.RespondError(w, http.StatusForbidden, "forbidden")
		return
	}
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	report, err := h.repo.GetByID(r.Context(), id)
	if err != nil {
		respondServiceError(w, err)
		return
	}
	var payload struct {
		MentorComment string `json:"mentorComment"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		httputil.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	now := time.Now()
	report.MentorComment = payload.MentorComment
	report.Status = models.TeamReportStatusReviewed
	report.ReviewedAt = &now
	if err := h.repo.Update(r.Context(), report); err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, report)
}
