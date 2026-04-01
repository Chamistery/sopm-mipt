package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCORS(t *testing.T) {
	tests := []struct {
		name           string
		method         string
		handler        http.Handler
		wantStatusCode int
		checkHeaders   func(t *testing.T, w *httptest.ResponseRecorder)
	}{
		{
			name:   "OPTIONS request",
			method: http.MethodOptions,
			handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				t.Error("handler should not be called for OPTIONS request")
			}),
			wantStatusCode: http.StatusOK,
			checkHeaders: func(t *testing.T, w *httptest.ResponseRecorder) {
				if w.Header().Get("Access-Control-Allow-Origin") != "*" {
					t.Errorf("CORS header Access-Control-Allow-Origin = %v, want *", w.Header().Get("Access-Control-Allow-Origin"))
				}
				if w.Header().Get("Access-Control-Allow-Methods") != "GET, POST, PUT, DELETE, OPTIONS" {
					t.Errorf("CORS header Access-Control-Allow-Methods incorrect")
				}
				if w.Header().Get("Access-Control-Allow-Headers") != "Content-Type, Authorization" {
					t.Errorf("CORS header Access-Control-Allow-Headers incorrect")
				}
			},
		},
		{
			name:   "GET request",
			method: http.MethodGet,
			handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
			}),
			wantStatusCode: http.StatusOK,
			checkHeaders: func(t *testing.T, w *httptest.ResponseRecorder) {
				if w.Header().Get("Access-Control-Allow-Origin") != "*" {
					t.Errorf("CORS header Access-Control-Allow-Origin = %v, want *", w.Header().Get("Access-Control-Allow-Origin"))
				}
			},
		},
		{
			name:   "POST request",
			method: http.MethodPost,
			handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusCreated)
			}),
			wantStatusCode: http.StatusCreated,
			checkHeaders: func(t *testing.T, w *httptest.ResponseRecorder) {
				if w.Header().Get("Access-Control-Allow-Origin") != "*" {
					t.Errorf("CORS header not set correctly")
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := CORS(tt.handler)

			req := httptest.NewRequest(tt.method, "/test", nil)
			w := httptest.NewRecorder()

			handler.ServeHTTP(w, req)

			if w.Code != tt.wantStatusCode {
				t.Errorf("CORS middleware status = %v, want %v", w.Code, tt.wantStatusCode)
			}

			if tt.checkHeaders != nil {
				tt.checkHeaders(t, w)
			}
		})
	}
}
