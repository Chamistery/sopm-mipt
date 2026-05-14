package handlers

import (
	"context"
	"net/http"

	"github.com/hsse/project-service/internal/auth"
	"github.com/hsse/project-service/internal/httputil"
	"github.com/hsse/project-service/internal/models"
)

type CoordinatorGradingRepoInterface interface {
	Rows(ctx context.Context) ([]models.CoordinatorGradingRow, error)
}

type CoordinatorGradingHandler struct {
	repo CoordinatorGradingRepoInterface
}

func NewCoordinatorGradingHandler(repo CoordinatorGradingRepoInterface) *CoordinatorGradingHandler {
	return &CoordinatorGradingHandler{repo: repo}
}

func (h *CoordinatorGradingHandler) Get(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	if !user.HasAnyRole(auth.RoleCoordinator) {
		httputil.RespondError(w, http.StatusForbidden, "coordinator or admin only")
		return
	}
	rows, err := h.repo.Rows(r.Context())
	if err != nil {
		httputil.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, models.CoordinatorGradingResponse{Rows: rows})
}
