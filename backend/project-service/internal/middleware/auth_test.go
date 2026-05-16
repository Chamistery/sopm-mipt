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

func TestAuthContextWithServiceToken_AllowedPath(t *testing.T) {
	var got *auth.CurrentUser
	handler := AuthContextWithServiceToken("secret")(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
		got = auth.UserFromContext(r.Context())
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/projects", nil)
	req.Header.Set("X-Internal-Service-Token", "secret")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}
	if got == nil || !got.IsService || got.Role != auth.RoleCoordinator {
		t.Fatalf("expected service user, got %#v", got)
	}
}

func TestAuthContextWithServiceToken_DisallowedPath(t *testing.T) {
	called := false
	handler := AuthContextWithServiceToken("secret")(http.HandlerFunc(func(_ http.ResponseWriter, _ *http.Request) {
		called = true
	}))

	req := httptest.NewRequest(http.MethodDelete, "/api/projects/1", nil)
	req.Header.Set("X-Internal-Service-Token", "secret")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for non-allowlisted path with valid token, got %d", rr.Code)
	}
	if called {
		t.Fatal("downstream handler should not be invoked when service-token is rejected")
	}
}

func TestAuthContextWithServiceToken_WrongToken_FallsBackToHeaders(t *testing.T) {
	var got *auth.CurrentUser
	handler := AuthContextWithServiceToken("secret")(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
		got = auth.UserFromContext(r.Context())
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/projects", nil)
	req.Header.Set("X-Internal-Service-Token", "wrong")
	req.Header.Set("X-User-Id", "7")
	req.Header.Set("X-User-Role", "student")
	handler.ServeHTTP(httptest.NewRecorder(), req)

	if got == nil || got.IsService {
		t.Fatalf("wrong token must not produce service user: %#v", got)
	}
	if got.ID != 7 || got.Role != auth.RoleStudent {
		t.Fatalf("expected fallback to headers (student/7), got %#v", got)
	}
}

func TestAuthContextWithServiceToken_EmptyExpected_Disabled(t *testing.T) {
	var got *auth.CurrentUser
	handler := AuthContextWithServiceToken("")(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
		got = auth.UserFromContext(r.Context())
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/projects", nil)
	req.Header.Set("X-Internal-Service-Token", "anything")
	req.Header.Set("X-User-Id", "1")
	req.Header.Set("X-User-Role", "mentor")
	handler.ServeHTTP(httptest.NewRecorder(), req)

	if got == nil || got.IsService {
		t.Fatalf("empty expectedToken should disable service-path: %#v", got)
	}
}
