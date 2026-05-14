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
	"github.com/hsse/project-service/internal/service"
)

type MeetingHandler struct {
	repo     repository.MeetingRepositoryInterface
	teams    repository.TeamRepositoryInterface
	projects repository.ProjectRepositoryInterface
}

func NewMeetingHandler(
	repo repository.MeetingRepositoryInterface,
	teams repository.TeamRepositoryInterface,
	projects repository.ProjectRepositoryInterface,
) *MeetingHandler {
	return &MeetingHandler{repo: repo, teams: teams, projects: projects}
}

func (h *MeetingHandler) Create(w http.ResponseWriter, r *http.Request) {
	if !currentUser(r).HasAnyRole(auth.RoleMentor, auth.RoleTeamLead) {
		httputil.RespondError(w, http.StatusForbidden, "forbidden")
		return
	}
	var meeting models.Meeting
	if err := json.NewDecoder(r.Body).Decode(&meeting); err != nil {
		httputil.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := h.ensureMeetingAccess(r.Context(), currentUser(r), meeting.TeamID, true); err != nil {
		respondServiceError(w, err)
		return
	}
	meeting.CreatedByID = currentUser(r).ID
	if currentUser(r).HasAnyRole(auth.RoleMentor) {
		ok := true
		now := time.Now()
		meeting.MentorConfirmed = &ok
		meeting.ConfirmedAt = &now
		meeting.Status = models.MeetingStatusConfirmed
	} else if meeting.Status == "" {
		meeting.Status = models.MeetingStatusPending
	}
	if err := h.repo.Create(r.Context(), &meeting); err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusCreated, meeting)
}

func (h *MeetingHandler) GetList(w http.ResponseWriter, r *http.Request) {
	teamID := httputil.ParseQueryInt(r, "teamId", 0)
	if teamID == 0 {
		httputil.RespondError(w, http.StatusBadRequest, "teamId is required")
		return
	}
	if err := h.ensureMeetingAccess(r.Context(), currentUser(r), teamID, false); err != nil {
		respondServiceError(w, err)
		return
	}
	upcoming := httputil.ParseQueryString(r, "upcoming") == "true"
	meetings, err := h.repo.GetByTeamID(r.Context(), teamID, upcoming)
	if err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, meetings)
}

func (h *MeetingHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	meeting, err := h.repo.GetByID(r.Context(), id)
	if err != nil {
		respondServiceError(w, err)
		return
	}
	existing := *meeting
	if err := json.NewDecoder(r.Body).Decode(meeting); err != nil {
		httputil.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := h.ensureMeetingUpdateAccess(r.Context(), currentUser(r), &existing); err != nil {
		respondServiceError(w, err)
		return
	}
	meeting.ID = id
	meeting.CreatedByID = existing.CreatedByID
	if !currentUser(r).HasAnyRole(auth.RoleMentor) {
		meeting.MentorConfirmed = existing.MentorConfirmed
		meeting.MentorDeclineReason = existing.MentorDeclineReason
		meeting.ConfirmedAt = existing.ConfirmedAt
	}
	if meeting.MentorConfirmed != nil {
		now := time.Now()
		meeting.ConfirmedAt = &now
		if *meeting.MentorConfirmed {
			meeting.Status = models.MeetingStatusConfirmed
		} else {
			meeting.Status = models.MeetingStatusDeclined
		}
	}
	if err := h.repo.Update(r.Context(), meeting); err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, meeting)
}

func (h *MeetingHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	meeting, err := h.repo.GetByID(r.Context(), id)
	if err != nil {
		respondServiceError(w, err)
		return
	}
	if currentUser(r).ID != meeting.CreatedByID && !currentUser(r).HasAnyRole(auth.RoleCoordinator) {
		httputil.RespondError(w, http.StatusForbidden, "forbidden")
		return
	}
	if err := h.repo.Delete(r.Context(), id); err != nil {
		respondServiceError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *MeetingHandler) ensureMeetingAccess(ctx context.Context, user *auth.CurrentUser, teamID int, create bool) error {
	if user.HasAnyRole(auth.RoleCoordinator) {
		return nil
	}
	team, err := h.teams.GetByID(ctx, teamID)
	if err != nil {
		return err
	}
	project, err := h.projects.GetByID(ctx, team.ProjectID)
	if err != nil {
		return err
	}
	if user.HasAnyRole(auth.RoleMentor) {
		if project.MentorID == user.ID {
			return nil
		}
		return service.ErrForbidden
	}
	if user.HasAnyRole(auth.RoleTeamLead) {
		if create {
			if team.LeaderID != nil && *team.LeaderID == user.ID {
				return nil
			}
			return service.ErrForbidden
		}
	}
	isMember, err := h.teams.IsMember(ctx, team.ID, user.ID)
	if err != nil {
		return err
	}
	if isMember || (team.LeaderID != nil && *team.LeaderID == user.ID) {
		return nil
	}
	return service.ErrForbidden
}

func (h *MeetingHandler) ensureMeetingUpdateAccess(ctx context.Context, user *auth.CurrentUser, meeting *models.Meeting) error {
	if user.HasAnyRole(auth.RoleCoordinator) {
		return nil
	}
	if user.HasAnyRole(auth.RoleMentor) {
		return h.ensureMeetingAccess(ctx, user, meeting.TeamID, false)
	}
	if user.HasAnyRole(auth.RoleTeamLead) {
		team, err := h.teams.GetByID(ctx, meeting.TeamID)
		if err != nil {
			return err
		}
		if team.LeaderID != nil && *team.LeaderID == user.ID {
			return nil
		}
	}
	if meeting.CreatedByID == user.ID {
		return nil
	}
	return service.ErrForbidden
}
