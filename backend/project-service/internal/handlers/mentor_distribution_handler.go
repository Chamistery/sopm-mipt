package handlers

import (
	"context"
	"net/http"

	"github.com/hsse/project-service/internal/auth"
	"github.com/hsse/project-service/internal/httputil"
	"github.com/hsse/project-service/internal/models"
)

// MentorDistributionRepoInterface — узкий контракт для тестов хэндлера.
type MentorDistributionRepoInterface interface {
	GetForMentor(ctx context.Context, mentorID int) (*models.MentorDistributionResponse, error)
}

type MentorDistributionHandler struct {
	repo MentorDistributionRepoInterface
}

func NewMentorDistributionHandler(repo MentorDistributionRepoInterface) *MentorDistributionHandler {
	return &MentorDistributionHandler{repo: repo}
}

// Get — агрегат «Незапущенные команды по всем проектам ментора».
// Координаторы / админы могут смотреть чужой дашборд через ?mentorId=.
func (h *MentorDistributionHandler) Get(w http.ResponseWriter, r *http.Request) {
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

	resp, err := h.repo.GetForMentor(r.Context(), mentorID)
	if err != nil {
		httputil.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if resp == nil {
		resp = &models.MentorDistributionResponse{Projects: []models.MentorDistributionProject{}}
	}
	httputil.RespondSuccess(w, http.StatusOK, resp)
}
