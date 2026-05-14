package handlers

import (
	"context"
	"net/http"

	"github.com/hsse/project-service/internal/auth"
	"github.com/hsse/project-service/internal/httputil"
	"github.com/hsse/project-service/internal/models"
)

type CoordinatorApplicationsRepoInterface interface {
	List(ctx context.Context) ([]models.Project, error)
}

type CoordinatorApplicationsHandler struct {
	repo CoordinatorApplicationsRepoInterface
}

func NewCoordinatorApplicationsHandler(repo CoordinatorApplicationsRepoInterface) *CoordinatorApplicationsHandler {
	return &CoordinatorApplicationsHandler{repo: repo}
}

// Get отдаёт список проектов, требующих утверждения координатором:
// status='На утверждении' (новые заявки) и проекты с pending_proposal_data
// (заявки на редактирование).
func (h *CoordinatorApplicationsHandler) Get(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	if !user.IsAuthenticated() {
		httputil.RespondError(w, http.StatusUnauthorized, "authentication required")
		return
	}
	if !user.HasAnyRole(auth.RoleCoordinator) {
		httputil.RespondError(w, http.StatusForbidden, "coordinator or admin only")
		return
	}
	items, err := h.repo.List(r.Context())
	if err != nil {
		httputil.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, map[string]interface{}{
		"applications": items,
	})
}
