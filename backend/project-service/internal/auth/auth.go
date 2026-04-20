package auth

import (
	"context"
	"net/http"
	"strconv"
	"strings"
)

type Role string

const (
	RoleAnonymous   Role = "anonymous"
	RoleStudent     Role = "student"
	RoleTeamLead    Role = "teamlead"
	RoleMentor      Role = "mentor"
	RoleCoordinator Role = "coordinator"
	RoleAdmin       Role = "admin"
)

type CurrentUser struct {
	ID   int  `json:"id"`
	Role Role `json:"role"`
}

type contextKey string

const currentUserKey contextKey = "current_user"

func ParseRole(value string) Role {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case string(RoleStudent):
		return RoleStudent
	case string(RoleTeamLead):
		return RoleTeamLead
	case string(RoleMentor):
		return RoleMentor
	case string(RoleCoordinator):
		return RoleCoordinator
	case string(RoleAdmin):
		return RoleAdmin
	default:
		return RoleAnonymous
	}
}

func NewCurrentUserFromHeaders(r *http.Request) *CurrentUser {
	id, _ := strconv.Atoi(strings.TrimSpace(r.Header.Get("X-User-Id")))
	role := ParseRole(r.Header.Get("X-User-Role"))
	if id <= 0 {
		return &CurrentUser{Role: RoleAnonymous}
	}

	return &CurrentUser{
		ID:   id,
		Role: role,
	}
}

func WithCurrentUser(ctx context.Context, user *CurrentUser) context.Context {
	return context.WithValue(ctx, currentUserKey, user)
}

func UserFromContext(ctx context.Context) *CurrentUser {
	user, ok := ctx.Value(currentUserKey).(*CurrentUser)
	if !ok || user == nil {
		return &CurrentUser{Role: RoleAnonymous}
	}

	return user
}

func (u *CurrentUser) IsAuthenticated() bool {
	return u != nil && u.ID > 0 && u.Role != RoleAnonymous
}

func (u *CurrentUser) HasAnyRole(roles ...Role) bool {
	if u == nil {
		return false
	}

	for _, role := range roles {
		if u.Role == role {
			return true
		}
	}

	return false
}
