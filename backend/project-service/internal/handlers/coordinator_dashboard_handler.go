package handlers

import (
	"context"
	"net/http"

	"github.com/hsse/project-service/internal/auth"
	"github.com/hsse/project-service/internal/httputil"
	"github.com/hsse/project-service/internal/models"
)

// CoordinatorDashboardRepoInterface — узкий контракт для тестов хэндлера.
// Полная реализация — repository.CoordinatorDashboardRepository.
type CoordinatorDashboardRepoInterface interface {
	Stats(ctx context.Context) (models.CoordinatorDashboardStats, error)
	Attention(ctx context.Context) (models.CoordinatorDashboardAttention, error)
}

// MentorDashboardProjectsLister — контракт ровно той части
// MentorDashboardRepository, которая нужна координатору: список ВСЕХ
// активных проектов с агрегатом sprints/teams.
type MentorDashboardProjectsLister interface {
	GetAll(ctx context.Context) ([]models.MentorDashboardProject, error)
}

type CoordinatorDashboardHandler struct {
	coordRepo  CoordinatorDashboardRepoInterface
	mentorRepo MentorDashboardProjectsLister
}

func NewCoordinatorDashboardHandler(
	coordRepo CoordinatorDashboardRepoInterface,
	mentorRepo MentorDashboardProjectsLister,
) *CoordinatorDashboardHandler {
	return &CoordinatorDashboardHandler{coordRepo: coordRepo, mentorRepo: mentorRepo}
}

// Get возвращает агрегат для GET /api/coordinator/dashboard. Только для
// координатора и админа — менторы свой дашборд получают через
// /api/mentor/dashboard.
func (h *CoordinatorDashboardHandler) Get(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	if !user.IsAuthenticated() {
		httputil.RespondError(w, http.StatusUnauthorized, "authentication required")
		return
	}
	if !user.HasAnyRole(auth.RoleCoordinator) {
		httputil.RespondError(w, http.StatusForbidden, "coordinator or admin only")
		return
	}

	ctx := r.Context()
	stats, err := h.coordRepo.Stats(ctx)
	if err != nil {
		httputil.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	attention, err := h.coordRepo.Attention(ctx)
	if err != nil {
		httputil.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	projects, err := h.mentorRepo.GetAll(ctx)
	if err != nil {
		httputil.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if projects == nil {
		projects = []models.MentorDashboardProject{}
	}

	httputil.RespondSuccess(w, http.StatusOK, models.CoordinatorDashboardResponse{
		Stats:     stats,
		Attention: attention,
		Projects:  projects,
	})
}
