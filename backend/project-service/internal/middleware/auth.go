package middleware

import (
	"net/http"

	"github.com/hsse/project-service/internal/auth"
)

func AuthContext(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user := auth.NewCurrentUserFromHeaders(r)
		next.ServeHTTP(w, r.WithContext(auth.WithCurrentUser(r.Context(), user)))
	})
}
