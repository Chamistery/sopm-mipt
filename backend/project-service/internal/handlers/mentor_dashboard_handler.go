package handlers

import (
	"context"
	"net/http"

	"github.com/hsse/project-service/internal/auth"
	"github.com/hsse/project-service/internal/httputil"
	"github.com/hsse/project-service/internal/models"
)

// MentorDashboardRepoInterface — узкий контракт для тестов хэндлера.
// Полная реализация — repository.MentorDashboardRepository.
type MentorDashboardRepoInterface interface {
	GetForMentor(ctx context.Context, mentorID int) ([]models.MentorDashboardProject, error)
}

type MentorDashboardHandler struct {
	repo MentorDashboardRepoInterface
}

func NewMentorDashboardHandler(repo MentorDashboardRepoInterface) *MentorDashboardHandler {
	return &MentorDashboardHandler{repo: repo}
}

// Get returns the aggregated mentor dashboard payload. The mentor is taken
// from the auth context (X-User-Id header). For coordinators / admins we
// honour an explicit `?mentorId=` so they can peek at someone else's
// dashboard without changing identity.
func (h *MentorDashboardHandler) Get(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	if !user.IsAuthenticated() {
		httputil.RespondError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	mentorID := user.ID
	if user.HasAnyRole(auth.RoleCoordinator) {
		if override := httputil.ParseQueryInt(r, "mentorId", 0); override > 0 {
			mentorID = override
		}
	} else if !user.HasAnyRole(auth.RoleMentor) {
		httputil.RespondError(w, http.StatusForbidden, "mentors only")
		return
	}

	projects, err := h.repo.GetForMentor(r.Context(), mentorID)
	if err != nil {
		httputil.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if projects == nil {
		projects = []models.MentorDashboardProject{}
	}
	httputil.RespondSuccess(w, http.StatusOK, map[string]interface{}{
		"projects": projects,
	})
}
