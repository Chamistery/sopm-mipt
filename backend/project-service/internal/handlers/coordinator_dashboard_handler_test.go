package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/hsse/project-service/internal/auth"
	"github.com/hsse/project-service/internal/models"
)

type stubCoordDashboardRepo struct {
	stats     models.CoordinatorDashboardStats
	attention models.CoordinatorDashboardAttention
	statsErr  error
	attErr    error
}

func (s *stubCoordDashboardRepo) Stats(_ context.Context) (models.CoordinatorDashboardStats, error) {
	return s.stats, s.statsErr
}

func (s *stubCoordDashboardRepo) Attention(_ context.Context) (models.CoordinatorDashboardAttention, error) {
	return s.attention, s.attErr
}

type stubCoordProjectsLister struct {
	projects []models.MentorDashboardProject
	err      error
}

func (s *stubCoordProjectsLister) GetAll(_ context.Context) ([]models.MentorDashboardProject, error) {
	return s.projects, s.err
}

func TestCoordinatorDashboardHandler_RequiresAuth(t *testing.T) {
	h := NewCoordinatorDashboardHandler(&stubCoordDashboardRepo{}, &stubCoordProjectsLister{})

	req := httptest.NewRequest(http.MethodGet, "/api/coordinator/dashboard", nil)
	w := httptest.NewRecorder()
	h.Get(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", w.Code, w.Body.String())
	}
}

func TestCoordinatorDashboardHandler_ForbidsMentor(t *testing.T) {
	h := NewCoordinatorDashboardHandler(&stubCoordDashboardRepo{}, &stubCoordProjectsLister{})

	user := &auth.CurrentUser{ID: 5, Role: auth.RoleMentor}
	req := newRequestWithUser(http.MethodGet, "/api/coordinator/dashboard", user)
	w := httptest.NewRecorder()
	h.Get(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d: %s", w.Code, w.Body.String())
	}
}

func TestCoordinatorDashboardHandler_ForbidsStudent(t *testing.T) {
	h := NewCoordinatorDashboardHandler(&stubCoordDashboardRepo{}, &stubCoordProjectsLister{})

	user := &auth.CurrentUser{ID: 6, Role: auth.RoleStudent}
	req := newRequestWithUser(http.MethodGet, "/api/coordinator/dashboard", user)
	w := httptest.NewRecorder()
	h.Get(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d: %s", w.Code, w.Body.String())
	}
}

func TestCoordinatorDashboardHandler_ReturnsAggregate(t *testing.T) {
	repo := &stubCoordDashboardRepo{
		stats:     models.CoordinatorDashboardStats{ActiveProjects: 5, Teams: 12, Students: 48},
		attention: models.CoordinatorDashboardAttention{PendingApplications: 3, UnassignedStudents: 8},
	}
	lister := &stubCoordProjectsLister{
		projects: []models.MentorDashboardProject{
			{ID: 1, Title: "СУПП", Status: models.ProjectStatusActive, Sprints: []models.DashboardSprint{}, Teams: []models.DashboardTeam{}},
		},
	}
	h := NewCoordinatorDashboardHandler(repo, lister)

	user := &auth.CurrentUser{ID: 2, Role: auth.RoleCoordinator}
	req := newRequestWithUser(http.MethodGet, "/api/coordinator/dashboard", user)
	w := httptest.NewRecorder()
	h.Get(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var body struct {
		Data models.CoordinatorDashboardResponse `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if body.Data.Stats.ActiveProjects != 5 || body.Data.Stats.Teams != 12 || body.Data.Stats.Students != 48 {
		t.Fatalf("stats mismatch: %+v", body.Data.Stats)
	}
	if body.Data.Attention.PendingApplications != 3 || body.Data.Attention.UnassignedStudents != 8 {
		t.Fatalf("attention mismatch: %+v", body.Data.Attention)
	}
	if len(body.Data.Projects) != 1 || body.Data.Projects[0].ID != 1 {
		t.Fatalf("projects mismatch: %+v", body.Data.Projects)
	}
}

func TestCoordinatorDashboardHandler_AdminAllowed(t *testing.T) {
	repo := &stubCoordDashboardRepo{}
	lister := &stubCoordProjectsLister{}
	h := NewCoordinatorDashboardHandler(repo, lister)

	user := &auth.CurrentUser{ID: 1, Role: auth.RoleCoordinator}
	req := newRequestWithUser(http.MethodGet, "/api/coordinator/dashboard", user)
	w := httptest.NewRecorder()
	h.Get(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestCoordinatorDashboardHandler_PropagatesError(t *testing.T) {
	repo := &stubCoordDashboardRepo{statsErr: errors.New("db down")}
	h := NewCoordinatorDashboardHandler(repo, &stubCoordProjectsLister{})

	user := &auth.CurrentUser{ID: 2, Role: auth.RoleCoordinator}
	req := newRequestWithUser(http.MethodGet, "/api/coordinator/dashboard", user)
	w := httptest.NewRecorder()
	h.Get(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
}
