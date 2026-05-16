package middleware

import (
	"crypto/subtle"
	"net/http"

	"github.com/hsse/project-service/internal/auth"
)

// AuthContext проставляет CurrentUser из заголовков X-User-Id / X-User-Role.
// Используйте, когда нет необходимости в service-to-service авторизации.
func AuthContext(next http.Handler) http.Handler {
	return AuthContextWithServiceToken("")(next)
}

// AuthContextWithServiceToken возвращает middleware, которое сначала
// проверяет X-Internal-Service-Token. Если он непустой и совпадает с
// expectedToken, ставится CurrentUser с правами координатора и флагом
// IsService=true. Иначе fallback на обычный X-User-* парсинг.
//
// Пустой expectedToken отключает service-token аутентификацию (полезно
// в dev/test), сохраняя обычный header-based auth.
func AuthContextWithServiceToken(expectedToken string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			var user *auth.CurrentUser
			if expectedToken != "" {
				provided := r.Header.Get("X-Internal-Service-Token")
				if provided != "" && subtle.ConstantTimeCompare([]byte(provided), []byte(expectedToken)) == 1 {
					user = &auth.CurrentUser{
						ID:        0,
						Role:      auth.RoleCoordinator,
						IsService: true,
					}
				}
			}
			if user == nil {
				user = auth.NewCurrentUserFromHeaders(r)
			}
			next.ServeHTTP(w, r.WithContext(auth.WithCurrentUser(r.Context(), user)))
		})
	}
}
