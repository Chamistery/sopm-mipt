package service

import (
	"errors"
	"fmt"

	"github.com/hsse/project-service/internal/auth"
)

var (
	ErrUnauthorized = errors.New("authentication required")
	ErrForbidden    = errors.New("forbidden")
	ErrInvalidState = errors.New("invalid state transition")
	ErrNotFound     = errors.New("not found")
)

func RequireAuth(user *auth.CurrentUser) error {
	if user == nil || !user.IsAuthenticated() {
		return ErrUnauthorized
	}

	return nil
}

func RequireRoles(user *auth.CurrentUser, roles ...auth.Role) error {
	if err := RequireAuth(user); err != nil {
		return err
	}
	if !user.HasAnyRole(roles...) {
		return ErrForbidden
	}

	return nil
}

func RequireSelfOrRoles(user *auth.CurrentUser, userID int, roles ...auth.Role) error {
	if err := RequireAuth(user); err != nil {
		return err
	}
	if user.ID == userID || user.HasAnyRole(roles...) {
		return nil
	}

	return ErrForbidden
}

func WrapStateError(format string, args ...interface{}) error {
	return fmt.Errorf("%w: %s", ErrInvalidState, fmt.Sprintf(format, args...))
}
