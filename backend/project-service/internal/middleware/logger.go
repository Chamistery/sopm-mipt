package middleware

import (
	"log"
	"net/http"
	"time"

	"github.com/hsse/project-service/internal/auth"
)

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func newResponseWriter(w http.ResponseWriter) *responseWriter {
	return &responseWriter{w, http.StatusOK}
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rw := newResponseWriter(w)
		next.ServeHTTP(rw, r)
		caller := ""
		if u := auth.UserFromContext(r.Context()); u.IsService {
			caller = " service=true"
		}
		log.Printf(
			"%s %s %d %s%s",
			r.Method,
			r.URL.Path,
			rw.statusCode,
			time.Since(start),
			caller,
		)
	})
}
