package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestLogger(t *testing.T) {
	tests := []struct {
		name           string
		handler        http.Handler
		wantStatusCode int
	}{
		{
			name: "successful request",
			handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
			}),
			wantStatusCode: http.StatusOK,
		},
		{
			name: "not found request",
			handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusNotFound)
			}),
			wantStatusCode: http.StatusNotFound,
		},
		{
			name: "internal server error",
			handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusInternalServerError)
			}),
			wantStatusCode: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := Logger(tt.handler)

			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			w := httptest.NewRecorder()

			handler.ServeHTTP(w, req)

			if w.Code != tt.wantStatusCode {
				t.Errorf("Logger middleware status = %v, want %v", w.Code, tt.wantStatusCode)
			}
		})
	}
}

func TestResponseWriter(t *testing.T) {
	w := httptest.NewRecorder()
	rw := newResponseWriter(w)

	if rw.statusCode != http.StatusOK {
		t.Errorf("newResponseWriter() initial statusCode = %v, want %v", rw.statusCode, http.StatusOK)
	}

	rw.WriteHeader(http.StatusNotFound)

	if rw.statusCode != http.StatusNotFound {
		t.Errorf("WriteHeader() statusCode = %v, want %v", rw.statusCode, http.StatusNotFound)
	}

	if w.Code != http.StatusNotFound {
		t.Errorf("underlying ResponseWriter Code = %v, want %v", w.Code, http.StatusNotFound)
	}
}
