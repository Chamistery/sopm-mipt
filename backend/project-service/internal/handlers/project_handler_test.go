package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/hsse/project-service/internal/auth"
	"github.com/hsse/project-service/internal/models"
	"github.com/hsse/project-service/internal/repository"
)

// stubProjectRepo captures the last filters passed to GetList and returns
// configurable canned responses for the methods exercised by handler tests.
type stubProjectRepo struct {
	lastFilters  repository.ProjectListFilters
	listProjects []models.ProjectListItem
	listTotal    int
	listErr      error
}

func (s *stubProjectRepo) Create(context.Context, *models.Project) error { return nil }
func (s *stubProjectRepo) GetList(_ context.Context, filters repository.ProjectListFilters) ([]models.ProjectListItem, int, error) {
	s.lastFilters = filters
	return s.listProjects, s.listTotal, s.listErr
}

func (s *stubProjectRepo) GetByID(context.Context, int) (*models.Project, error) {
	return nil, nil
}
func (s *stubProjectRepo) GetFull(context.Context, int) (*models.ProjectFull, error) { return nil, nil }
func (s *stubProjectRepo) GetApplicants(context.Context, int) (*models.ProjectApplicantsResponse, error) {
	return nil, nil
}
func (s *stubProjectRepo) Update(context.Context, *models.Project) error { return nil }
func (s *stubProjectRepo) Delete(context.Context, int) error             { return nil }

func newRequestWithUser(method, target string, user *auth.CurrentUser) *http.Request {
	req := httptest.NewRequest(method, target, nil)
	if user != nil {
		req = req.WithContext(auth.WithCurrentUser(req.Context(), user))
	}
	return req
}

func TestProjectHandler_GetList_PassesMentorIDFilter(t *testing.T) {
	repo := &stubProjectRepo{}
	h := NewProjectHandler(repo)

	req := httptest.NewRequest(http.MethodGet, "/api/projects?mentorId=42&company=Acme", nil)
	w := httptest.NewRecorder()
	h.GetList(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	if repo.lastFilters.MentorID != 42 {
		t.Fatalf("expected MentorID=42, got %d", repo.lastFilters.MentorID)
	}
	if repo.lastFilters.Company != "Acme" {
		t.Fatalf("expected Company=Acme, got %q", repo.lastFilters.Company)
	}
}

func TestProjectHandler_GetList_NoMentorIDDefaultsToZero(t *testing.T) {
	repo := &stubProjectRepo{}
	h := NewProjectHandler(repo)

	req := httptest.NewRequest(http.MethodGet, "/api/projects", nil)
	w := httptest.NewRecorder()
	h.GetList(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	if repo.lastFilters.MentorID != 0 {
		t.Fatalf("expected MentorID=0, got %d", repo.lastFilters.MentorID)
	}
}

func TestProjectHandler_GetMentorArchive_ForbiddenForNonMentor(t *testing.T) {
	repo := &stubProjectRepo{}
	h := NewProjectHandler(repo)

	cases := []*auth.CurrentUser{
		{Role: auth.RoleAnonymous},
		{ID: 1, Role: auth.RoleStudent},
		{ID: 2, Role: auth.RoleCoordinator},
	}
	for _, user := range cases {
		req := newRequestWithUser(http.MethodGet, "/api/mentor/projects/archive", user)
		w := httptest.NewRecorder()
		h.GetMentorArchive(w, req)
		if w.Code != http.StatusForbidden {
			t.Fatalf("user role %s: expected 403, got %d", user.Role, w.Code)
		}
	}
}

func TestProjectHandler_GetMentorArchive_FiltersByCurrentMentorAndCompletedStatus(t *testing.T) {
	repo := &stubProjectRepo{
		listProjects: []models.ProjectListItem{{ID: 7, Title: "Done", Status: models.ProjectStatusCompleted}},
		listTotal:    1,
	}
	h := NewProjectHandler(repo)

	user := &auth.CurrentUser{ID: 99, Role: auth.RoleMentor}
	req := newRequestWithUser(http.MethodGet, "/api/mentor/projects/archive?limit=10&offset=5", user)
	w := httptest.NewRecorder()
	h.GetMentorArchive(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	if repo.lastFilters.MentorID != 99 {
		t.Fatalf("expected MentorID=99, got %d", repo.lastFilters.MentorID)
	}
	if repo.lastFilters.Status != string(models.ProjectStatusCompleted) {
		t.Fatalf("expected Status=Завершён, got %q", repo.lastFilters.Status)
	}
	if repo.lastFilters.Limit != 10 || repo.lastFilters.Offset != 5 {
		t.Fatalf("expected limit=10/offset=5, got %d/%d", repo.lastFilters.Limit, repo.lastFilters.Offset)
	}

	var body struct {
		Data struct {
			Projects []models.ProjectListItem `json:"projects"`
			Total    int                      `json:"total"`
		} `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if body.Data.Total != 1 || len(body.Data.Projects) != 1 || body.Data.Projects[0].ID != 7 {
		t.Fatalf("unexpected body: %s", w.Body.String())
	}
}

