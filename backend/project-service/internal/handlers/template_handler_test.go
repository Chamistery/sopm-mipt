package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/hsse/project-service/internal/models"
)

type mockTemplateRepository struct {
	createFunc  func(ctx context.Context, template *models.Template) error
	getAllFunc  func(ctx context.Context) ([]models.Template, error)
	getByIDFunc func(ctx context.Context, id string) (*models.Template, error)
	updateFunc  func(ctx context.Context, template *models.Template) error
	deleteFunc  func(ctx context.Context, id string) error
}

func (m *mockTemplateRepository) Create(ctx context.Context, template *models.Template) error {
	if m.createFunc != nil {
		return m.createFunc(ctx, template)
	}
	return nil
}

func (m *mockTemplateRepository) GetAll(ctx context.Context) ([]models.Template, error) {
	if m.getAllFunc != nil {
		return m.getAllFunc(ctx)
	}
	return []models.Template{}, nil
}

func (m *mockTemplateRepository) GetByID(ctx context.Context, id string) (*models.Template, error) {
	if m.getByIDFunc != nil {
		return m.getByIDFunc(ctx, id)
	}
	return nil, nil
}

func (m *mockTemplateRepository) Update(ctx context.Context, template *models.Template) error {
	if m.updateFunc != nil {
		return m.updateFunc(ctx, template)
	}
	return nil
}

func (m *mockTemplateRepository) Delete(ctx context.Context, id string) error {
	if m.deleteFunc != nil {
		return m.deleteFunc(ctx, id)
	}
	return nil
}

func TestTemplateHandler_Create(t *testing.T) {
	tests := []struct {
		name           string
		requestBody    interface{}
		mockCreateFunc func(ctx context.Context, template *models.Template) error
		wantStatus     int
		checkResponse  func(t *testing.T, body []byte)
	}{
		{
			name: "successful creation",
			requestBody: CreateTemplateRequest{
				Name:   "Test Template",
				Fields: models.TemplateFields{},
			},
			mockCreateFunc: func(ctx context.Context, template *models.Template) error {
				template.ID = "test-id"
				template.CreatedAt = time.Now()
				template.UpdatedAt = time.Now()
				return nil
			},
			wantStatus: http.StatusCreated,
			checkResponse: func(t *testing.T, body []byte) {
				var response map[string]interface{}
				if err := json.Unmarshal(body, &response); err != nil {
					t.Fatalf("failed to unmarshal response: %v", err)
				}
				data := response["data"].(map[string]interface{})
				if data["name"] != "Test Template" {
					t.Errorf("expected name 'Test Template', got %v", data["name"])
				}
			},
		},
		{
			name: "trim whitespace",
			requestBody: CreateTemplateRequest{
				Name:   "  Whitespace Test  ",
				Fields: models.TemplateFields{},
			},
			mockCreateFunc: func(ctx context.Context, template *models.Template) error {
				if template.Name != "Whitespace Test" {
					t.Errorf("expected trimmed name, got %v", template.Name)
				}
				return nil
			},
			wantStatus: http.StatusCreated,
		},
		{
			name: "empty name",
			requestBody: CreateTemplateRequest{
				Name:   "  ",
				Fields: models.TemplateFields{},
			},
			wantStatus: http.StatusBadRequest,
			checkResponse: func(t *testing.T, body []byte) {
				var response map[string]interface{}
				_ = json.Unmarshal(body, &response)
				if response["error"] != "Template name is required" {
					t.Errorf("unexpected error message: %v", response["error"])
				}
			},
		},
		{
			name:        "invalid json",
			requestBody: "invalid json",
			wantStatus:  http.StatusBadRequest,
		},
		{
			name: "repository error",
			requestBody: CreateTemplateRequest{
				Name:   "Test",
				Fields: models.TemplateFields{},
			},
			mockCreateFunc: func(ctx context.Context, template *models.Template) error {
				return errors.New("database error")
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := &mockTemplateRepository{
				createFunc: tt.mockCreateFunc,
			}
			handler := NewTemplateHandler(mockRepo)

			var body []byte
			if str, ok := tt.requestBody.(string); ok {
				body = []byte(str)
			} else {
				body, _ = json.Marshal(tt.requestBody)
			}

			req := httptest.NewRequest(http.MethodPost, "/api/templates", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			handler.Create(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("Create() status = %v, want %v", w.Code, tt.wantStatus)
			}

			if tt.checkResponse != nil {
				tt.checkResponse(t, w.Body.Bytes())
			}
		})
	}
}

func TestTemplateHandler_GetAll(t *testing.T) {
	tests := []struct {
		name            string
		mockGetAllFunc  func(ctx context.Context) ([]models.Template, error)
		wantStatus      int
		checkResponse   func(t *testing.T, body []byte)
	}{
		{
			name: "successful retrieval",
			mockGetAllFunc: func(ctx context.Context) ([]models.Template, error) {
				return []models.Template{
					{ID: "1", Name: "Template 1"},
					{ID: "2", Name: "Template 2"},
				}, nil
			},
			wantStatus: http.StatusOK,
			checkResponse: func(t *testing.T, body []byte) {
				var response map[string]interface{}
				_ = json.Unmarshal(body, &response)
				data := response["data"].([]interface{})
				if len(data) != 2 {
					t.Errorf("expected 2 templates, got %v", len(data))
				}
			},
		},
		{
			name: "empty list",
			mockGetAllFunc: func(ctx context.Context) ([]models.Template, error) {
				return []models.Template{}, nil
			},
			wantStatus: http.StatusOK,
		},
		{
			name: "repository error",
			mockGetAllFunc: func(ctx context.Context) ([]models.Template, error) {
				return nil, errors.New("database error")
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := &mockTemplateRepository{
				getAllFunc: tt.mockGetAllFunc,
			}
			handler := NewTemplateHandler(mockRepo)

			req := httptest.NewRequest(http.MethodGet, "/api/templates", nil)
			w := httptest.NewRecorder()

			handler.GetAll(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("GetAll() status = %v, want %v", w.Code, tt.wantStatus)
			}

			if tt.checkResponse != nil {
				tt.checkResponse(t, w.Body.Bytes())
			}
		})
	}
}

func TestTemplateHandler_GetByID(t *testing.T) {
	tests := []struct {
		name             string
		templateID       string
		mockGetByIDFunc  func(ctx context.Context, id string) (*models.Template, error)
		wantStatus       int
		checkResponse    func(t *testing.T, body []byte)
	}{
		{
			name:       "successful retrieval",
			templateID: "test-id",
			mockGetByIDFunc: func(ctx context.Context, id string) (*models.Template, error) {
				return &models.Template{
					ID:   id,
					Name: "Test Template",
				}, nil
			},
			wantStatus: http.StatusOK,
			checkResponse: func(t *testing.T, body []byte) {
				var response map[string]interface{}
				_ = json.Unmarshal(body, &response)
				data := response["data"].(map[string]interface{})
				if data["id"] != "test-id" {
					t.Errorf("expected id 'test-id', got %v", data["id"])
				}
			},
		},
		{
			name:       "template not found",
			templateID: "nonexistent",
			mockGetByIDFunc: func(ctx context.Context, id string) (*models.Template, error) {
				return nil, errors.New("template not found")
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name:       "empty id",
			templateID: "",
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := &mockTemplateRepository{
				getByIDFunc: tt.mockGetByIDFunc,
			}
			handler := NewTemplateHandler(mockRepo)

			req := httptest.NewRequest(http.MethodGet, "/api/templates/"+tt.templateID, nil)
			req.SetPathValue("id", tt.templateID)
			w := httptest.NewRecorder()

			handler.GetByID(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("GetByID() status = %v, want %v", w.Code, tt.wantStatus)
			}

			if tt.checkResponse != nil {
				tt.checkResponse(t, w.Body.Bytes())
			}
		})
	}
}

func TestTemplateHandler_Delete(t *testing.T) {
	tests := []struct {
		name           string
		templateID     string
		mockDeleteFunc func(ctx context.Context, id string) error
		wantStatus     int
	}{
		{
			name:       "successful deletion",
			templateID: "test-id",
			mockDeleteFunc: func(ctx context.Context, id string) error {
				return nil
			},
			wantStatus: http.StatusNoContent,
		},
		{
			name:       "template not found",
			templateID: "nonexistent",
			mockDeleteFunc: func(ctx context.Context, id string) error {
				return errors.New("template not found")
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name:       "empty id",
			templateID: "",
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := &mockTemplateRepository{
				deleteFunc: tt.mockDeleteFunc,
			}
			handler := NewTemplateHandler(mockRepo)

			req := httptest.NewRequest(http.MethodDelete, "/api/templates/"+tt.templateID, nil)
			req.SetPathValue("id", tt.templateID)
			w := httptest.NewRecorder()

			handler.Delete(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("Delete() status = %v, want %v", w.Code, tt.wantStatus)
			}
		})
	}
}
