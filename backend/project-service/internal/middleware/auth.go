package middleware

import (
	"crypto/subtle"
	"net/http"

	"github.com/hsse/project-service/internal/auth"
	"github.com/hsse/project-service/internal/httputil"
)

// serviceAllowlist описывает, какие (method, path) разрешено вызывать
// под service-token'ом. Сам distribution_service после варианта B
// делает только три read-only запроса; всё остальное закрыто, даже
// при правильном токене — defence-in-depth на случай компрометации
// сервиса распределения или утечки токена.
var serviceAllowlist = map[string]map[string]struct{}{
	http.MethodGet: {
		"/api/projects":             {},
		"/api/users":                {},
		"/api/applications/project": {},
	},
}

func isAllowedForService(method, path string) bool {
	paths, ok := serviceAllowlist[method]
	if !ok {
		return false
	}
	_, allowed := paths[path]
	return allowed
}

// AuthContext проставляет CurrentUser из заголовков X-User-Id / X-User-Role.
// Используйте, когда нет необходимости в service-to-service авторизации.
func AuthContext(next http.Handler) http.Handler {
	return AuthContextWithServiceToken("")(next)
}

// AuthContextWithServiceToken возвращает middleware, которое сначала
// проверяет X-Internal-Service-Token. Если он непустой и совпадает с
// expectedToken, *и* (метод, путь) есть в allowlist'е сервисов —
// ставится CurrentUser с правами координатора и флагом IsService=true.
// Если токен валидный, но path не из allowlist'а — 403, чтобы токен
// нельзя было использовать для повышенных привилегий. Если токен
// отсутствует — fallback на обычный X-User-* парсинг.
//
// Пустой expectedToken отключает service-token аутентификацию (полезно
// в dev/test), сохраняя обычный header-based auth.
func AuthContextWithServiceToken(expectedToken string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			provided := r.Header.Get("X-Internal-Service-Token")
			if expectedToken != "" && provided != "" &&
				subtle.ConstantTimeCompare([]byte(provided), []byte(expectedToken)) == 1 {
				if !isAllowedForService(r.Method, r.URL.Path) {
					httputil.RespondError(w, http.StatusForbidden,
						"service-token is not allowed for this endpoint")
					return
				}
				user := &auth.CurrentUser{
					ID:        0,
					Role:      auth.RoleCoordinator,
					IsService: true,
				}
				next.ServeHTTP(w, r.WithContext(auth.WithCurrentUser(r.Context(), user)))
				return
			}
			user := auth.NewCurrentUserFromHeaders(r)
			next.ServeHTTP(w, r.WithContext(auth.WithCurrentUser(r.Context(), user)))
		})
	}
}
