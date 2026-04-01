package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/hsse/project-service/internal/models"
	"github.com/hsse/project-service/internal/repository"
)

type mockProjectRepository struct {
	createFunc  func(ctx context.Context, project *models.Project) error
	getListFunc func(ctx context.Context, filters repository.ProjectListFilters) ([]models.ProjectListItem, int, error)
	getByIDFunc func(ctx context.Context, id int) (*models.Project, error)
	updateFunc  func(ctx context.Context, project *models.Project) error
	deleteFunc  func(ctx context.Context, id int) error
}

func (m *mockProjectRepository) Create(ctx context.Context, project *models.Project) error {
	if m.createFunc != nil {
		return m.createFunc(ctx, project)
	}
	return nil
}

func (m *mockProjectRepository) GetList(ctx context.Context, filters repository.ProjectListFilters) ([]models.ProjectListItem, int, error) {
	if m.getListFunc != nil {
		return m.getListFunc(ctx, filters)
	}
	return []models.ProjectListItem{}, 0, nil
}

func (m *mockProjectRepository) GetByID(ctx context.Context, id int) (*models.Project, error) {
	if m.getByIDFunc != nil {
		return m.getByIDFunc(ctx, id)
	}
	return nil, nil
}

func (m *mockProjectRepository) Update(ctx context.Context, project *models.Project) error {
	if m.updateFunc != nil {
		return m.updateFunc(ctx, project)
	}
	return nil
}

func (m *mockProjectRepository) Delete(ctx context.Context, id int) error {
	if m.deleteFunc != nil {
		return m.deleteFunc(ctx, id)
	}
	return nil
}

func TestProjectHandler_Create(t *testing.T) {
	tests := []struct {
		name           string
		requestBody    interface{}
		mockCreateFunc func(ctx context.Context, project *models.Project) error
		wantStatus     int
		checkProject   func(t *testing.T, project *models.Project)
	}{
		{
			name: "successful creation",
			requestBody: CreateProjectRequest{
				Title:      "Test Project",
				TemplateID: "template-1",
				MentorID:   1,
				CreatorID:  1,
				MaxSlots:   5,
				Company:    "Test Company",
				Course:     "4",
			},
			mockCreateFunc: func(ctx context.Context, project *models.Project) error {
				project.ID = 1
				return nil
			},
			wantStatus: http.StatusCreated,
			checkProject: func(t *testing.T, project *models.Project) {
				if project.Title != "Test Project" {
					t.Errorf("expected title 'Test Project', got %v", project.Title)
				}
				if project.Status != models.ProjectStatusDraft {
					t.Errorf("expected status 'Черновик', got %v", project.Status)
				}
			},
		},
		{
			name: "trim whitespace",
			requestBody: CreateProjectRequest{
				Title:      "  Test  ",
				TemplateID: "  template-1  ",
				Company:    "  Company  ",
				Course:     "  4  ",
			},
			mockCreateFunc: func(ctx context.Context, project *models.Project) error {
				if project.Title != "Test" || project.Company != "Company" {
					t.Errorf("whitespace not trimmed: title=%v, company=%v", project.Title, project.Company)
				}
				return nil
			},
			wantStatus: http.StatusCreated,
		},
		{
			name: "missing required fields",
			requestBody: CreateProjectRequest{
				Title: "",
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:        "invalid json",
			requestBody: "invalid",
			wantStatus:  http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := &mockProjectRepository{
				createFunc: tt.mockCreateFunc,
			}
			handler := NewProjectHandler(mockRepo)

			var body []byte
			if str, ok := tt.requestBody.(string); ok {
				body = []byte(str)
			} else {
				body, _ = json.Marshal(tt.requestBody)
			}

			req := httptest.NewRequest(http.MethodPost, "/api/projects", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			handler.Create(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("Create() status = %v, want %v", w.Code, tt.wantStatus)
			}

			if tt.checkProject != nil && w.Code == http.StatusCreated {
				var response map[string]interface{}
				_ = json.Unmarshal(w.Body.Bytes(), &response)
				data := response["data"].(map[string]interface{})

				project := &models.Project{
					Title:  data["title"].(string),
					Status: models.ProjectStatus(data["status"].(string)),
				}
				tt.checkProject(t, project)
			}
		})
	}
}

func TestProjectHandler_GetList(t *testing.T) {
	tests := []struct {
		name            string
		queryParams     string
		mockGetListFunc func(ctx context.Context, filters repository.ProjectListFilters) ([]models.ProjectListItem, int, error)
		wantStatus      int
		checkFilters    func(t *testing.T, filters repository.ProjectListFilters)
		checkResponse   func(t *testing.T, body []byte)
	}{
		{
			name:        "default pagination",
			queryParams: "",
			mockGetListFunc: func(ctx context.Context, filters repository.ProjectListFilters) ([]models.ProjectListItem, int, error) {
				if filters.Limit != 20 || filters.Offset != 0 {
					t.Errorf("expected default limit=20, offset=0, got limit=%v, offset=%v", filters.Limit, filters.Offset)
				}
				return []models.ProjectListItem{}, 0, nil
			},
			wantStatus: http.StatusOK,
		},
		{
			name:        "custom pagination",
			queryParams: "?limit=50&offset=10",
			mockGetListFunc: func(ctx context.Context, filters repository.ProjectListFilters) ([]models.ProjectListItem, int, error) {
				if filters.Limit != 50 || filters.Offset != 10 {
					t.Errorf("expected limit=50, offset=10, got limit=%v, offset=%v", filters.Limit, filters.Offset)
				}
				return []models.ProjectListItem{}, 0, nil
			},
			wantStatus: http.StatusOK,
		},
		{
			name:        "with filters",
			queryParams: "?company=Яндекс&course=4&status=Опубликован",
			mockGetListFunc: func(ctx context.Context, filters repository.ProjectListFilters) ([]models.ProjectListItem, int, error) {
				if filters.Company != "Яндекс" || filters.Course != "4" || filters.Status != "Опубликован" {
					t.Errorf("filters not passed correctly")
				}
				return []models.ProjectListItem{{ID: 1, Title: "Test"}}, 1, nil
			},
			wantStatus: http.StatusOK,
			checkResponse: func(t *testing.T, body []byte) {
				var response map[string]interface{}
				_ = json.Unmarshal(body, &response)
				data := response["data"].(map[string]interface{})
				if int(data["total"].(float64)) != 1 {
					t.Errorf("expected total=1, got %v", data["total"])
				}
			},
		},
		{
			name:        "invalid limit becomes default",
			queryParams: "?limit=-5",
			mockGetListFunc: func(ctx context.Context, filters repository.ProjectListFilters) ([]models.ProjectListItem, int, error) {
				if filters.Limit != 20 {
					t.Errorf("expected limit=20, got %v", filters.Limit)
				}
				return []models.ProjectListItem{}, 0, nil
			},
			wantStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := &mockProjectRepository{
				getListFunc: tt.mockGetListFunc,
			}
			handler := NewProjectHandler(mockRepo)

			req := httptest.NewRequest(http.MethodGet, "/api/projects"+tt.queryParams, nil)
			w := httptest.NewRecorder()

			handler.GetList(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("GetList() status = %v, want %v", w.Code, tt.wantStatus)
			}

			if tt.checkResponse != nil {
				tt.checkResponse(t, w.Body.Bytes())
			}
		})
	}
}

func TestProjectHandler_GetByID(t *testing.T) {
	tests := []struct {
		name            string
		projectID       string
		mockGetByIDFunc func(ctx context.Context, id int) (*models.Project, error)
		wantStatus      int
	}{
		{
			name:      "successful retrieval",
			projectID: "1",
			mockGetByIDFunc: func(ctx context.Context, id int) (*models.Project, error) {
				return &models.Project{ID: id, Title: "Test"}, nil
			},
			wantStatus: http.StatusOK,
		},
		{
			name:      "project not found",
			projectID: "999",
			mockGetByIDFunc: func(ctx context.Context, id int) (*models.Project, error) {
				return nil, errors.New("project not found")
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name:       "invalid id",
			projectID:  "abc",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "empty id",
			projectID:  "",
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := &mockProjectRepository{
				getByIDFunc: tt.mockGetByIDFunc,
			}
			handler := NewProjectHandler(mockRepo)

			req := httptest.NewRequest(http.MethodGet, "/api/projects/"+tt.projectID, nil)
			req.SetPathValue("id", tt.projectID)
			w := httptest.NewRecorder()

			handler.GetByID(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("GetByID() status = %v, want %v", w.Code, tt.wantStatus)
			}
		})
	}
}

func TestProjectHandler_Delete(t *testing.T) {
	tests := []struct {
		name           string
		projectID      string
		mockDeleteFunc func(ctx context.Context, id int) error
		wantStatus     int
	}{
		{
			name:      "successful deletion",
			projectID: "1",
			mockDeleteFunc: func(ctx context.Context, id int) error {
				return nil
			},
			wantStatus: http.StatusNoContent,
		},
		{
			name:      "project not found",
			projectID: "999",
			mockDeleteFunc: func(ctx context.Context, id int) error {
				return errors.New("project not found")
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name:       "invalid id",
			projectID:  "invalid",
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := &mockProjectRepository{
				deleteFunc: tt.mockDeleteFunc,
			}
			handler := NewProjectHandler(mockRepo)

			req := httptest.NewRequest(http.MethodDelete, "/api/projects/"+tt.projectID, nil)
			req.SetPathValue("id", tt.projectID)
			w := httptest.NewRecorder()

			handler.Delete(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("Delete() status = %v, want %v", w.Code, tt.wantStatus)
			}
		})
	}
}
