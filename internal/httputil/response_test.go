package httputil

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRespondJSON(t *testing.T) {
	tests := []struct {
		name       string
		status     int
		data       interface{}
		wantStatus int
		wantData   interface{}
	}{
		{
			name:       "simple object",
			status:     http.StatusOK,
			data:       map[string]string{"message": "success"},
			wantStatus: http.StatusOK,
			wantData:   map[string]interface{}{"message": "success"},
		},
		{
			name:       "array",
			status:     http.StatusCreated,
			data:       []string{"item1", "item2"},
			wantStatus: http.StatusCreated,
			wantData:   []interface{}{"item1", "item2"},
		},
		{
			name:       "nil data",
			status:     http.StatusNoContent,
			data:       nil,
			wantStatus: http.StatusNoContent,
			wantData:   nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()

			RespondJSON(w, tt.status, tt.data)

			if w.Code != tt.wantStatus {
				t.Errorf("RespondJSON() status = %v, want %v", w.Code, tt.wantStatus)
			}

			contentType := w.Header().Get("Content-Type")
			if contentType != "application/json" {
				t.Errorf("RespondJSON() Content-Type = %v, want application/json", contentType)
			}

			if tt.data != nil {
				var got interface{}
				if err := json.NewDecoder(w.Body).Decode(&got); err != nil {
					t.Fatalf("failed to decode response: %v", err)
				}

				gotJSON, _ := json.Marshal(got)
				wantJSON, _ := json.Marshal(tt.wantData)

				if string(gotJSON) != string(wantJSON) {
					t.Errorf("RespondJSON() body = %v, want %v", string(gotJSON), string(wantJSON))
				}
			}
		})
	}
}

func TestRespondError(t *testing.T) {
	tests := []struct {
		name       string
		status     int
		message    string
		wantStatus int
		wantError  string
	}{
		{
			name:       "not found",
			status:     http.StatusNotFound,
			message:    "Resource not found",
			wantStatus: http.StatusNotFound,
			wantError:  "Resource not found",
		},
		{
			name:       "bad request",
			status:     http.StatusBadRequest,
			message:    "Invalid input",
			wantStatus: http.StatusBadRequest,
			wantError:  "Invalid input",
		},
		{
			name:       "internal error",
			status:     http.StatusInternalServerError,
			message:    "Something went wrong",
			wantStatus: http.StatusInternalServerError,
			wantError:  "Something went wrong",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()

			RespondError(w, tt.status, tt.message)

			if w.Code != tt.wantStatus {
				t.Errorf("RespondError() status = %v, want %v", w.Code, tt.wantStatus)
			}

			var response ErrorResponse
			if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
				t.Fatalf("failed to decode response: %v", err)
			}

			if response.Error != tt.wantError {
				t.Errorf("RespondError() error = %v, want %v", response.Error, tt.wantError)
			}
		})
	}
}

func TestRespondSuccess(t *testing.T) {
	tests := []struct {
		name       string
		status     int
		data       interface{}
		wantStatus int
		wantData   interface{}
	}{
		{
			name:   "user object",
			status: http.StatusOK,
			data: map[string]interface{}{
				"id":   1,
				"name": "Test User",
			},
			wantStatus: http.StatusOK,
			wantData: map[string]interface{}{
				"id":   float64(1),
				"name": "Test User",
			},
		},
		{
			name:       "created",
			status:     http.StatusCreated,
			data:       map[string]string{"id": "123"},
			wantStatus: http.StatusCreated,
			wantData:   map[string]interface{}{"id": "123"},
		},
		{
			name:       "empty array",
			status:     http.StatusOK,
			data:       []string{},
			wantStatus: http.StatusOK,
			wantData:   []interface{}{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()

			RespondSuccess(w, tt.status, tt.data)

			if w.Code != tt.wantStatus {
				t.Errorf("RespondSuccess() status = %v, want %v", w.Code, tt.wantStatus)
			}

			var response SuccessResponse
			if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
				t.Fatalf("failed to decode response: %v", err)
			}

			gotJSON, _ := json.Marshal(response.Data)
			wantJSON, _ := json.Marshal(tt.wantData)

			if string(gotJSON) != string(wantJSON) {
				t.Errorf("RespondSuccess() data = %v, want %v", string(gotJSON), string(wantJSON))
			}
		})
	}
}
