package handlers

import (
	"encoding/json"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/hsse/project-service/internal/auth"
	"github.com/hsse/project-service/internal/httputil"
	"github.com/hsse/project-service/internal/models"
	"github.com/hsse/project-service/internal/repository"
	"github.com/hsse/project-service/internal/service"
)

type UserHandler struct {
	repo           repository.UserRepositoryInterface
	profiles       repository.UserProfileRepositoryInterface
	files          repository.UserFileRepositoryInterface
	notifications  *service.NotificationService
	storage        *service.LocalFileStorage
	maxUploadBytes int64
}

func NewUserHandler(
	repo repository.UserRepositoryInterface,
	profiles repository.UserProfileRepositoryInterface,
	files repository.UserFileRepositoryInterface,
	notifications *service.NotificationService,
	storage *service.LocalFileStorage,
	maxUploadBytes int64,
) *UserHandler {
	return &UserHandler{
		repo:           repo,
		profiles:       profiles,
		files:          files,
		notifications:  notifications,
		storage:        storage,
		maxUploadBytes: maxUploadBytes,
	}
}

func (h *UserHandler) Create(w http.ResponseWriter, r *http.Request) {
	if !currentUser(r).HasAnyRole(auth.RoleCoordinator, auth.RoleMentor) {
		httputil.RespondError(w, http.StatusForbidden, "forbidden")
		return
	}
	var user models.User
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		httputil.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := h.repo.Create(r.Context(), &user); err != nil {
		respondServiceError(w, err)
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
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, user)
}

func (h *UserHandler) GetAll(w http.ResponseWriter, r *http.Request) {
	users, err := h.repo.GetAll(r.Context())
	if err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, users)
}

func (h *UserHandler) GetTeam(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	team, err := h.repo.GetTeam(r.Context(), id)
	if err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, team)
}

func (h *UserHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	profile, err := h.profiles.GetByUserID(r.Context(), id)
	if err != nil {
		profile = &models.UserProfile{UserID: id, Skills: models.StringList{}, Links: models.ProfileLinks{}}
	}
	httputil.RespondSuccess(w, http.StatusOK, profile)
}

func (h *UserHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	if currentUser(r).ID != id && !currentUser(r).HasAnyRole(auth.RoleCoordinator) {
		httputil.RespondError(w, http.StatusForbidden, "forbidden")
		return
	}
	var profile models.UserProfile
	if err := json.NewDecoder(r.Body).Decode(&profile); err != nil {
		httputil.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	profile.UserID = id
	if err := h.profiles.Upsert(r.Context(), &profile); err != nil {
		respondServiceError(w, err)
		return
	}
	updated, err := h.profiles.GetByUserID(r.Context(), id)
	if err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, updated)
}

func (h *UserHandler) UploadFile(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	if currentUser(r).ID != id && !currentUser(r).HasAnyRole(auth.RoleCoordinator) {
		httputil.RespondError(w, http.StatusForbidden, "forbidden")
		return
	}

	if err := r.ParseMultipartForm(h.maxUploadBytes); err != nil {
		httputil.RespondError(w, http.StatusBadRequest, "failed to parse multipart form")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, "file is required")
		return
	}
	defer file.Close()

	ext := strings.TrimPrefix(strings.ToLower(filepath.Ext(header.Filename)), ".")
	if ext != "pdf" && ext != "docx" {
		httputil.RespondError(w, http.StatusBadRequest, "only pdf and docx files are allowed")
		return
	}
	if header.Size > h.maxUploadBytes {
		httputil.RespondError(w, http.StatusBadRequest, "file is too large")
		return
	}

	storagePath, err := h.storage.Save(id, header.Filename, file)
	if err != nil {
		respondServiceError(w, err)
		return
	}

	userFile := &models.UserFile{
		UserID:      id,
		FileName:    header.Filename,
		FileSize:    int(header.Size),
		FileType:    ext,
		StoragePath: storagePath,
	}
	if err := h.files.Create(r.Context(), userFile); err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusCreated, userFile)
}

func (h *UserHandler) ListFiles(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	files, err := h.files.GetByUserID(r.Context(), id)
	if err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, files)
}

func (h *UserHandler) DeleteFile(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	if currentUser(r).ID != id && !currentUser(r).HasAnyRole(auth.RoleCoordinator) {
		httputil.RespondError(w, http.StatusForbidden, "forbidden")
		return
	}
	fileID, err := httputil.ParsePathInt(r, "fileId")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	userFile, err := h.files.GetByID(r.Context(), fileID)
	if err != nil {
		respondServiceError(w, err)
		return
	}
	if userFile.UserID != id {
		httputil.RespondError(w, http.StatusForbidden, "forbidden")
		return
	}
	_ = h.storage.Delete(userFile.StoragePath)
	if err := h.files.Delete(r.Context(), fileID); err != nil {
		respondServiceError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *UserHandler) Notifications(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	notifications, err := h.notifications.GetForUser(r.Context(), currentUser(r), id)
	if err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, notifications)
}
