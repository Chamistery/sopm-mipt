package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/hsse/project-service/internal/auth"
	"github.com/hsse/project-service/internal/httputil"
	"github.com/hsse/project-service/internal/models"
	"github.com/hsse/project-service/internal/repository"
)

type TeamHandler struct {
	repo repository.TeamRepositoryInterface
}

func NewTeamHandler(repo repository.TeamRepositoryInterface) *TeamHandler {
	return &TeamHandler{repo: repo}
}

func (h *TeamHandler) Create(w http.ResponseWriter, r *http.Request) {
	if !currentUser(r).HasAnyRole(auth.RoleCoordinator, auth.RoleAdmin) {
		httputil.RespondError(w, http.StatusForbidden, "forbidden")
		return
	}
	var team models.Team
	if err := json.NewDecoder(r.Body).Decode(&team); err != nil {
		httputil.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := h.repo.Create(r.Context(), &team); err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusCreated, team)
}

func (h *TeamHandler) GetList(w http.ResponseWriter, r *http.Request) {
	projectID := httputil.ParseQueryInt(r, "projectId", 0)
	if projectID == 0 {
		httputil.RespondError(w, http.StatusBadRequest, "projectId is required")
		return
	}
	teams, err := h.repo.GetByProjectID(r.Context(), projectID)
	if err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, teams)
}

func (h *TeamHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	team, err := h.repo.GetByID(r.Context(), id)
	if err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, team)
}

func (h *TeamHandler) Update(w http.ResponseWriter, r *http.Request) {
	if !currentUser(r).HasAnyRole(auth.RoleCoordinator, auth.RoleAdmin) {
		httputil.RespondError(w, http.StatusForbidden, "forbidden")
		return
	}
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	var team models.Team
	if err := json.NewDecoder(r.Body).Decode(&team); err != nil {
		httputil.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	team.ID = id
	if err := h.repo.Update(r.Context(), &team); err != nil {
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

func (h *TeamHandler) Delete(w http.ResponseWriter, r *http.Request) {
	if !currentUser(r).HasAnyRole(auth.RoleCoordinator, auth.RoleAdmin) {
		httputil.RespondError(w, http.StatusForbidden, "forbidden")
		return
	}
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

func (h *TeamHandler) AddMember(w http.ResponseWriter, r *http.Request) {
	if !currentUser(r).HasAnyRole(auth.RoleCoordinator, auth.RoleMentor, auth.RoleAdmin) {
		httputil.RespondError(w, http.StatusForbidden, "forbidden")
		return
	}
	teamID, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	var member models.TeamMember
	if err := json.NewDecoder(r.Body).Decode(&member); err != nil {
		httputil.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	member.TeamID = teamID
	if err := h.repo.AddMember(r.Context(), &member); err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusCreated, member)
}

func (h *TeamHandler) RemoveMember(w http.ResponseWriter, r *http.Request) {
	if !currentUser(r).HasAnyRole(auth.RoleCoordinator, auth.RoleMentor, auth.RoleAdmin) {
		httputil.RespondError(w, http.StatusForbidden, "forbidden")
		return
	}
	teamID, err := httputil.ParsePathInt(r, "teamId")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	userID, err := httputil.ParsePathInt(r, "userId")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.repo.RemoveMember(r.Context(), teamID, userID); err != nil {
		respondServiceError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
