package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/hsse/project-service/internal/auth"
)

func TestAuthContext(t *testing.T) {
	var got *auth.CurrentUser

	handler := AuthContext(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
		got = auth.UserFromContext(r.Context())
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-User-Id", "42")
	req.Header.Set("X-User-Role", "mentor")

	handler.ServeHTTP(httptest.NewRecorder(), req)

	if got == nil || got.ID != 42 || got.Role != auth.RoleMentor {
		t.Fatalf("unexpected user in context: %#v", got)
	}
}
