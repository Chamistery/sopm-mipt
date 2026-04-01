package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/hsse/project-service/internal/httputil"
	"github.com/hsse/project-service/internal/models"
	"github.com/hsse/project-service/internal/repository"
	"github.com/hsse/project-service/internal/validation"
)

type UserHandler struct {
	repo repository.UserRepositoryInterface
}

func NewUserHandler(repo repository.UserRepositoryInterface) *UserHandler {
	return &UserHandler{repo: repo}
}

func (h *UserHandler) Create(w http.ResponseWriter, r *http.Request) {
	var user models.User
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		httputil.RespondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Trim whitespace
	user.FirstName = strings.TrimSpace(user.FirstName)
	user.LastName = strings.TrimSpace(user.LastName)
	user.Email = strings.TrimSpace(user.Email)
	user.Role = strings.TrimSpace(user.Role)
	user.Company = strings.TrimSpace(user.Company)
	user.Course = strings.TrimSpace(user.Course)
	user.Group = strings.TrimSpace(user.Group)
	user.Avatar = strings.TrimSpace(user.Avatar)

	// Validate input
	v := validation.NewValidator()
	v.RequiredString("firstName", user.FirstName)
	v.MaxLength("firstName", user.FirstName, 100)
	v.SafeString("firstName", user.FirstName)

	v.RequiredString("lastName", user.LastName)
	v.MaxLength("lastName", user.LastName, 100)
	v.SafeString("lastName", user.LastName)

	v.RequiredString("email", user.Email)
	v.MaxLength("email", user.Email, 255)
	v.Email("email", user.Email)

	v.RequiredString("role", user.Role)
	v.ValidRole("role", user.Role)

	v.MaxLength("company", user.Company, 200)
	v.SafeString("company", user.Company)

	v.MaxLength("course", user.Course, 200)
	v.SafeString("course", user.Course)

	v.MaxLength("group", user.Group, 100)
	v.SafeString("group", user.Group)

	v.MaxLength("avatar", user.Avatar, 500)

	if v.HasErrors() {
		httputil.RespondError(w, http.StatusBadRequest, v.Errors().Error())
		return
	}

	if err := h.repo.Create(r.Context(), &user); err != nil {
		httputil.RespondError(w, http.StatusInternalServerError, "Failed to create user")
		return
	}

	httputil.RespondSuccess(w, http.StatusCreated, user)
}

func (h *UserHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	user, err := h.repo.GetByID(r.Context(), id)
	if err != nil {
		httputil.RespondError(w, http.StatusNotFound, "User not found")
		return
	}

	httputil.RespondSuccess(w, http.StatusOK, user)
}

func (h *UserHandler) GetAll(w http.ResponseWriter, r *http.Request) {
	users, err := h.repo.GetAll(r.Context())
	if err != nil {
		httputil.RespondError(w, http.StatusInternalServerError, "Failed to fetch users")
		return
	}

	httputil.RespondSuccess(w, http.StatusOK, users)
}
