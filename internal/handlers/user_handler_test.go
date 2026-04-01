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

type mockUserRepository struct {
	createFunc  func(ctx context.Context, user *models.User) error
	getByIDFunc func(ctx context.Context, id int) (*models.User, error)
	getAllFunc  func(ctx context.Context) ([]models.User, error)
}

func (m *mockUserRepository) Create(ctx context.Context, user *models.User) error {
	if m.createFunc != nil {
		return m.createFunc(ctx, user)
	}
	return nil
}

func (m *mockUserRepository) GetByID(ctx context.Context, id int) (*models.User, error) {
	if m.getByIDFunc != nil {
		return m.getByIDFunc(ctx, id)
	}
	return nil, nil
}

func (m *mockUserRepository) GetAll(ctx context.Context) ([]models.User, error) {
	if m.getAllFunc != nil {
		return m.getAllFunc(ctx)
	}
	return []models.User{}, nil
}

func TestUserHandler_Create(t *testing.T) {
	tests := []struct {
		name           string
		requestBody    interface{}
		mockCreateFunc func(ctx context.Context, user *models.User) error
		wantStatus     int
		checkUser      func(t *testing.T, user *models.User)
	}{
		{
			name: "successful creation",
			requestBody: models.User{
				FirstName: "Test",
				LastName:  "User",
				Email:     "test@example.com",
				Role:      "student",
			},
			mockCreateFunc: func(ctx context.Context, user *models.User) error {
				user.ID = 1
				return nil
			},
			wantStatus: http.StatusCreated,
			checkUser: func(t *testing.T, user *models.User) {
				if user.FirstName != "Test" {
					t.Errorf("expected FirstName 'Test', got %v", user.FirstName)
				}
			},
		},
		{
			name: "trim whitespace",
			requestBody: models.User{
				FirstName: "  Test  ",
				LastName:  "  User  ",
				Email:     "  test@example.com  ",
				Role:      "student",
			},
			mockCreateFunc: func(ctx context.Context, user *models.User) error {
				if user.FirstName != "Test" || user.LastName != "User" || user.Email != "test@example.com" {
					t.Errorf("whitespace not trimmed: first=%v, last=%v, email=%v", user.FirstName, user.LastName, user.Email)
				}
				return nil
			},
			wantStatus: http.StatusCreated,
		},
		{
			name:        "invalid json",
			requestBody: "invalid",
			wantStatus:  http.StatusBadRequest,
		},
		{
			name: "repository error",
			requestBody: models.User{
				FirstName: "Test",
				LastName:  "User",
				Email:     "test@example.com",
				Role:      "student",
			},
			mockCreateFunc: func(ctx context.Context, user *models.User) error {
				return errors.New("database error")
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := &mockUserRepository{
				createFunc: tt.mockCreateFunc,
			}
			handler := NewUserHandler(mockRepo)

			var body []byte
			if str, ok := tt.requestBody.(string); ok {
				body = []byte(str)
			} else {
				body, _ = json.Marshal(tt.requestBody)
			}

			req := httptest.NewRequest(http.MethodPost, "/api/users", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			handler.Create(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("Create() status = %v, want %v", w.Code, tt.wantStatus)
			}

			if tt.checkUser != nil && w.Code == http.StatusCreated {
				var response map[string]interface{}
				_ = json.Unmarshal(w.Body.Bytes(), &response)
				data := response["data"].(map[string]interface{})

				user := &models.User{
					FirstName: data["firstName"].(string),
				}
				tt.checkUser(t, user)
			}
		})
	}
}

func TestUserHandler_GetByID(t *testing.T) {
	tests := []struct {
		name            string
		userID          string
		mockGetByIDFunc func(ctx context.Context, id int) (*models.User, error)
		wantStatus      int
	}{
		{
			name:   "successful retrieval",
			userID: "1",
			mockGetByIDFunc: func(ctx context.Context, id int) (*models.User, error) {
				return &models.User{
					ID:        id,
					FirstName: "Test",
					LastName:  "User",
					Email:     "test@example.com",
					Role:      "student",
				}, nil
			},
			wantStatus: http.StatusOK,
		},
		{
			name:   "user not found",
			userID: "999",
			mockGetByIDFunc: func(ctx context.Context, id int) (*models.User, error) {
				return nil, errors.New("user not found")
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name:       "invalid id",
			userID:     "abc",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "empty id",
			userID:     "",
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := &mockUserRepository{
				getByIDFunc: tt.mockGetByIDFunc,
			}
			handler := NewUserHandler(mockRepo)

			req := httptest.NewRequest(http.MethodGet, "/api/users/"+tt.userID, nil)
			req.SetPathValue("id", tt.userID)
			w := httptest.NewRecorder()

			handler.GetByID(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("GetByID() status = %v, want %v", w.Code, tt.wantStatus)
			}
		})
	}
}

func TestUserHandler_GetAll(t *testing.T) {
	tests := []struct {
		name           string
		mockGetAllFunc func(ctx context.Context) ([]models.User, error)
		wantStatus     int
		checkResponse  func(t *testing.T, body []byte)
	}{
		{
			name: "successful retrieval",
			mockGetAllFunc: func(ctx context.Context) ([]models.User, error) {
				return []models.User{
					{ID: 1, FirstName: "User1"},
					{ID: 2, FirstName: "User2"},
				}, nil
			},
			wantStatus: http.StatusOK,
			checkResponse: func(t *testing.T, body []byte) {
				var response map[string]interface{}
				_ = json.Unmarshal(body, &response)
				data := response["data"].([]interface{})
				if len(data) != 2 {
					t.Errorf("expected 2 users, got %v", len(data))
				}
			},
		},
		{
			name: "empty list",
			mockGetAllFunc: func(ctx context.Context) ([]models.User, error) {
				return []models.User{}, nil
			},
			wantStatus: http.StatusOK,
		},
		{
			name: "repository error",
			mockGetAllFunc: func(ctx context.Context) ([]models.User, error) {
				return nil, errors.New("database error")
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := &mockUserRepository{
				getAllFunc: tt.mockGetAllFunc,
			}
			handler := NewUserHandler(mockRepo)

			req := httptest.NewRequest(http.MethodGet, "/api/users", nil)
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
