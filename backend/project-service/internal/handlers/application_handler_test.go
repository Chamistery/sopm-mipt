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
)

type mockApplicationRepository struct {
	createFunc            func(ctx context.Context, app *models.Application) error
	getByIDFunc           func(ctx context.Context, id int) (*models.Application, error)
	getByStudentIDFunc    func(ctx context.Context, studentID int) ([]models.ApplicationWithProject, error)
	getByProjectIDFunc    func(ctx context.Context, projectID int) ([]models.Application, error)
	updateFunc            func(ctx context.Context, app *models.Application) error
	deleteFunc            func(ctx context.Context, id int) error
	updatePrioritiesFunc  func(ctx context.Context, studentID int, applications []models.Application) error
}

func (m *mockApplicationRepository) Create(ctx context.Context, app *models.Application) error {
	if m.createFunc != nil {
		return m.createFunc(ctx, app)
	}
	return nil
}

func (m *mockApplicationRepository) GetByID(ctx context.Context, id int) (*models.Application, error) {
	if m.getByIDFunc != nil {
		return m.getByIDFunc(ctx, id)
	}
	return nil, nil
}

func (m *mockApplicationRepository) GetByStudentID(ctx context.Context, studentID int) ([]models.ApplicationWithProject, error) {
	if m.getByStudentIDFunc != nil {
		return m.getByStudentIDFunc(ctx, studentID)
	}
	return []models.ApplicationWithProject{}, nil
}

func (m *mockApplicationRepository) GetByProjectID(ctx context.Context, projectID int) ([]models.Application, error) {
	if m.getByProjectIDFunc != nil {
		return m.getByProjectIDFunc(ctx, projectID)
	}
	return []models.Application{}, nil
}

func (m *mockApplicationRepository) Update(ctx context.Context, app *models.Application) error {
	if m.updateFunc != nil {
		return m.updateFunc(ctx, app)
	}
	return nil
}

func (m *mockApplicationRepository) Delete(ctx context.Context, id int) error {
	if m.deleteFunc != nil {
		return m.deleteFunc(ctx, id)
	}
	return nil
}

func (m *mockApplicationRepository) UpdatePriorities(ctx context.Context, studentID int, applications []models.Application) error {
	if m.updatePrioritiesFunc != nil {
		return m.updatePrioritiesFunc(ctx, studentID, applications)
	}
	return nil
}

func TestApplicationHandler_Create(t *testing.T) {
	tests := []struct {
		name           string
		requestBody    interface{}
		mockCreateFunc func(ctx context.Context, app *models.Application) error
		wantStatus     int
	}{
		{
			name: "successful creation",
			requestBody: CreateApplicationRequest{
				ProjectID: 1,
				StudentID: 1,
				Priority:  1,
			},
			mockCreateFunc: func(ctx context.Context, app *models.Application) error {
				app.ID = 1
				return nil
			},
			wantStatus: http.StatusCreated,
		},
		{
			name: "missing project id",
			requestBody: CreateApplicationRequest{
				StudentID: 1,
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "missing student id",
			requestBody: CreateApplicationRequest{
				ProjectID: 1,
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:        "invalid json",
			requestBody: "invalid",
			wantStatus:  http.StatusBadRequest,
		},
		{
			name: "repository error",
			requestBody: CreateApplicationRequest{
				ProjectID: 1,
				StudentID: 1,
			},
			mockCreateFunc: func(ctx context.Context, app *models.Application) error {
				return errors.New("database error")
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := &mockApplicationRepository{
				createFunc: tt.mockCreateFunc,
			}
			handler := NewApplicationHandler(mockRepo)

			var body []byte
			if str, ok := tt.requestBody.(string); ok {
				body = []byte(str)
			} else {
				body, _ = json.Marshal(tt.requestBody)
			}

			req := httptest.NewRequest(http.MethodPost, "/api/applications", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			handler.Create(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("Create() status = %v, want %v", w.Code, tt.wantStatus)
			}
		})
	}
}

func TestApplicationHandler_GetByStudentID(t *testing.T) {
	tests := []struct {
		name                   string
		queryParams            string
		mockGetByStudentIDFunc func(ctx context.Context, studentID int) ([]models.ApplicationWithProject, error)
		wantStatus             int
	}{
		{
			name:        "successful retrieval",
			queryParams: "?studentId=1",
			mockGetByStudentIDFunc: func(ctx context.Context, studentID int) ([]models.ApplicationWithProject, error) {
				return []models.ApplicationWithProject{
					{
						Application: models.Application{ID: 1},
						ProjectTitle: "Test",
					},
				}, nil
			},
			wantStatus: http.StatusOK,
		},
		{
			name:        "missing student id",
			queryParams: "",
			wantStatus:  http.StatusBadRequest,
		},
		{
			name:        "zero student id",
			queryParams: "?studentId=0",
			wantStatus:  http.StatusBadRequest,
		},
		{
			name:        "repository error",
			queryParams: "?studentId=1",
			mockGetByStudentIDFunc: func(ctx context.Context, studentID int) ([]models.ApplicationWithProject, error) {
				return nil, errors.New("database error")
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := &mockApplicationRepository{
				getByStudentIDFunc: tt.mockGetByStudentIDFunc,
			}
			handler := NewApplicationHandler(mockRepo)

			req := httptest.NewRequest(http.MethodGet, "/api/applications"+tt.queryParams, nil)
			w := httptest.NewRecorder()

			handler.GetByStudentID(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("GetByStudentID() status = %v, want %v", w.Code, tt.wantStatus)
			}
		})
	}
}

func TestApplicationHandler_GetByProjectID(t *testing.T) {
	tests := []struct {
		name                   string
		queryParams            string
		mockGetByProjectIDFunc func(ctx context.Context, projectID int) ([]models.Application, error)
		wantStatus             int
	}{
		{
			name:        "successful retrieval",
			queryParams: "?projectId=1",
			mockGetByProjectIDFunc: func(ctx context.Context, projectID int) ([]models.Application, error) {
				return []models.Application{
					{ID: 1, ProjectID: projectID},
				}, nil
			},
			wantStatus: http.StatusOK,
		},
		{
			name:        "missing project id",
			queryParams: "",
			wantStatus:  http.StatusBadRequest,
		},
		{
			name:        "zero project id",
			queryParams: "?projectId=0",
			wantStatus:  http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := &mockApplicationRepository{
				getByProjectIDFunc: tt.mockGetByProjectIDFunc,
			}
			handler := NewApplicationHandler(mockRepo)

			req := httptest.NewRequest(http.MethodGet, "/api/applications"+tt.queryParams, nil)
			w := httptest.NewRecorder()

			handler.GetByProjectID(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("GetByProjectID() status = %v, want %v", w.Code, tt.wantStatus)
			}
		})
	}
}

func TestApplicationHandler_Update(t *testing.T) {
	tests := []struct {
		name           string
		applicationID  string
		requestBody    interface{}
		mockUpdateFunc func(ctx context.Context, app *models.Application) error
		mockGetByIDFunc func(ctx context.Context, id int) (*models.Application, error)
		wantStatus     int
	}{
		{
			name:          "successful update",
			applicationID: "1",
			requestBody: UpdateApplicationRequest{
				Priority: 2,
				Status:   "Принято",
			},
			mockUpdateFunc: func(ctx context.Context, app *models.Application) error {
				return nil
			},
			mockGetByIDFunc: func(ctx context.Context, id int) (*models.Application, error) {
				return &models.Application{ID: id, Priority: 2}, nil
			},
			wantStatus: http.StatusOK,
		},
		{
			name:          "invalid id",
			applicationID: "abc",
			wantStatus:    http.StatusBadRequest,
		},
		{
			name:          "application not found",
			applicationID: "999",
			requestBody: UpdateApplicationRequest{
				Priority: 2,
				Status:   "Принято",
			},
			mockUpdateFunc: func(ctx context.Context, app *models.Application) error {
				return errors.New("application not found")
			},
			wantStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := &mockApplicationRepository{
				updateFunc:  tt.mockUpdateFunc,
				getByIDFunc: tt.mockGetByIDFunc,
			}
			handler := NewApplicationHandler(mockRepo)

			var body []byte
			if tt.requestBody != nil {
				body, _ = json.Marshal(tt.requestBody)
			}

			req := httptest.NewRequest(http.MethodPut, "/api/applications/"+tt.applicationID, bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			req.SetPathValue("id", tt.applicationID)
			w := httptest.NewRecorder()

			handler.Update(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("Update() status = %v, want %v", w.Code, tt.wantStatus)
			}
		})
	}
}

func TestApplicationHandler_Delete(t *testing.T) {
	tests := []struct {
		name           string
		applicationID  string
		mockDeleteFunc func(ctx context.Context, id int) error
		wantStatus     int
	}{
		{
			name:          "successful deletion",
			applicationID: "1",
			mockDeleteFunc: func(ctx context.Context, id int) error {
				return nil
			},
			wantStatus: http.StatusNoContent,
		},
		{
			name:          "application not found",
			applicationID: "999",
			mockDeleteFunc: func(ctx context.Context, id int) error {
				return errors.New("application not found")
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name:          "invalid id",
			applicationID: "abc",
			wantStatus:    http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := &mockApplicationRepository{
				deleteFunc: tt.mockDeleteFunc,
			}
			handler := NewApplicationHandler(mockRepo)

			req := httptest.NewRequest(http.MethodDelete, "/api/applications/"+tt.applicationID, nil)
			req.SetPathValue("id", tt.applicationID)
			w := httptest.NewRecorder()

			handler.Delete(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("Delete() status = %v, want %v", w.Code, tt.wantStatus)
			}
		})
	}
}

func TestApplicationHandler_UpdatePriorities(t *testing.T) {
	tests := []struct {
		name                     string
		queryParams              string
		requestBody              interface{}
		mockUpdatePrioritiesFunc func(ctx context.Context, studentID int, applications []models.Application) error
		wantStatus               int
	}{
		{
			name:        "successful update",
			queryParams: "?studentId=1",
			requestBody: UpdatePrioritiesRequest{
				Applications: []struct {
					ID       int `json:"id"`
					Priority int `json:"priority"`
				}{
					{ID: 1, Priority: 1},
					{ID: 2, Priority: 2},
				},
			},
			mockUpdatePrioritiesFunc: func(ctx context.Context, studentID int, applications []models.Application) error {
				return nil
			},
			wantStatus: http.StatusNoContent,
		},
		{
			name:        "missing student id",
			queryParams: "",
			wantStatus:  http.StatusBadRequest,
		},
		{
			name:        "repository error",
			queryParams: "?studentId=1",
			requestBody: UpdatePrioritiesRequest{
				Applications: []struct {
					ID       int `json:"id"`
					Priority int `json:"priority"`
				}{
					{ID: 1, Priority: 1},
				},
			},
			mockUpdatePrioritiesFunc: func(ctx context.Context, studentID int, applications []models.Application) error {
				return errors.New("database error")
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := &mockApplicationRepository{
				updatePrioritiesFunc: tt.mockUpdatePrioritiesFunc,
			}
			handler := NewApplicationHandler(mockRepo)

			var body []byte
			if tt.requestBody != nil {
				body, _ = json.Marshal(tt.requestBody)
			}

			req := httptest.NewRequest(http.MethodPut, "/api/applications/priorities"+tt.queryParams, bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			handler.UpdatePriorities(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("UpdatePriorities() status = %v, want %v", w.Code, tt.wantStatus)
			}
		})
	}
}
