package handlers

import (
	"context"
	"net/http"

	"github.com/hsse/project-service/internal/auth"
	"github.com/hsse/project-service/internal/httputil"
	"github.com/hsse/project-service/internal/models"
)

type CoordinatorDistributionRepoInterface interface {
	Get(ctx context.Context) (*models.CoordinatorDistributionResponse, error)
}

type CoordinatorDistributionHandler struct {
	repo CoordinatorDistributionRepoInterface
}

func NewCoordinatorDistributionHandler(repo CoordinatorDistributionRepoInterface) *CoordinatorDistributionHandler {
	return &CoordinatorDistributionHandler{repo: repo}
}

// Get возвращает агрегат для GET /api/coordinator/distribution. Доступно
// только для координатора и админа.
func (h *CoordinatorDistributionHandler) Get(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	if !user.IsAuthenticated() {
		httputil.RespondError(w, http.StatusUnauthorized, "authentication required")
		return
	}
	if !user.HasAnyRole(auth.RoleCoordinator, auth.RoleAdmin) {
		httputil.RespondError(w, http.StatusForbidden, "coordinator or admin only")
		return
	}

	resp, err := h.repo.Get(r.Context())
	if err != nil {
		httputil.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if resp.Projects == nil {
		resp.Projects = []models.CoordinatorDistributionProject{}
	}
	if resp.Pool == nil {
		resp.Pool = []models.CoordinatorPoolStudent{}
	}
	httputil.RespondSuccess(w, http.StatusOK, resp)
}
