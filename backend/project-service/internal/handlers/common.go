package handlers

import (
	"errors"
	"net/http"
	"strings"

	"github.com/hsse/project-service/internal/auth"
	"github.com/hsse/project-service/internal/httputil"
	"github.com/hsse/project-service/internal/service"
)

func currentUser(r *http.Request) *auth.CurrentUser {
	return auth.UserFromContext(r.Context())
}

func respondServiceError(w http.ResponseWriter, err error) {
	switch {
	case err == nil:
		return
	case errors.Is(err, service.ErrUnauthorized):
		httputil.RespondError(w, http.StatusUnauthorized, err.Error())
	case errors.Is(err, service.ErrForbidden):
		httputil.RespondError(w, http.StatusForbidden, err.Error())
	case errors.Is(err, service.ErrInvalidState):
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
	default:
		if err != nil && strings.Contains(err.Error(), "not found") {
			httputil.RespondError(w, http.StatusNotFound, err.Error())
			return
		}
		httputil.RespondError(w, http.StatusInternalServerError, err.Error())
	}
}
