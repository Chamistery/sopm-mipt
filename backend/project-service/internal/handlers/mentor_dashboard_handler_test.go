package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/hsse/project-service/internal/auth"
	"github.com/hsse/project-service/internal/models"
)

type stubMentorDashboardRepo struct {
	lastMentorID int
	projects     []models.MentorDashboardProject
	err          error
}

func (s *stubMentorDashboardRepo) GetForMentor(_ context.Context, mentorID int) ([]models.MentorDashboardProject, error) {
	s.lastMentorID = mentorID
	return s.projects, s.err
}

func TestMentorDashboardHandler_RequiresAuth(t *testing.T) {
	repo := &stubMentorDashboardRepo{}
	h := NewMentorDashboardHandler(repo)

	req := httptest.NewRequest(http.MethodGet, "/api/mentor/dashboard", nil)
	w := httptest.NewRecorder()
	h.Get(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestMentorDashboardHandler_ForbidsStudent(t *testing.T) {
	repo := &stubMentorDashboardRepo{}
	h := NewMentorDashboardHandler(repo)

	user := &auth.CurrentUser{ID: 5, Role: auth.RoleStudent}
	req := newRequestWithUser(http.MethodGet, "/api/mentor/dashboard", user)
	w := httptest.NewRecorder()
	h.Get(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", w.Code)
	}
}

func TestMentorDashboardHandler_UsesMentorIDFromContext(t *testing.T) {
	repo := &stubMentorDashboardRepo{
		projects: []models.MentorDashboardProject{
			{ID: 1, Title: "СУПП", Status: models.ProjectStatusActive, Sprints: []models.DashboardSprint{}, Teams: []models.DashboardTeam{}},
		},
	}
	h := NewMentorDashboardHandler(repo)

	user := &auth.CurrentUser{ID: 99, Role: auth.RoleMentor}
	req := newRequestWithUser(http.MethodGet, "/api/mentor/dashboard", user)
	w := httptest.NewRecorder()
	h.Get(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	if repo.lastMentorID != 99 {
		t.Fatalf("expected mentorID=99, got %d", repo.lastMentorID)
	}

	var body struct {
		Data struct {
			Projects []models.MentorDashboardProject `json:"projects"`
		} `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(body.Data.Projects) != 1 || body.Data.Projects[0].ID != 1 {
		t.Fatalf("unexpected payload: %+v", body)
	}
}

func TestMentorDashboardHandler_CoordinatorCanOverrideMentorID(t *testing.T) {
	repo := &stubMentorDashboardRepo{}
	h := NewMentorDashboardHandler(repo)

	user := &auth.CurrentUser{ID: 2, Role: auth.RoleCoordinator}
	req := newRequestWithUser(http.MethodGet, "/api/mentor/dashboard?mentorId=42", user)
	w := httptest.NewRecorder()
	h.Get(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	if repo.lastMentorID != 42 {
		t.Fatalf("expected mentorID=42, got %d", repo.lastMentorID)
	}
}
