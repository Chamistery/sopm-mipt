package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/hsse/project-service/internal/auth"
	"github.com/hsse/project-service/internal/httputil"
	"github.com/hsse/project-service/internal/models"
	"github.com/hsse/project-service/internal/repository"
)

type ProjectHandler struct {
	repo repository.ProjectRepositoryInterface
}

func NewProjectHandler(repo repository.ProjectRepositoryInterface) *ProjectHandler {
	return &ProjectHandler{repo: repo}
}

func (h *ProjectHandler) Create(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	if !user.HasAnyRole(auth.RoleMentor, auth.RoleCoordinator) {
		httputil.RespondError(w, http.StatusForbidden, "forbidden")
		return
	}

	var project models.Project
	if err := json.NewDecoder(r.Body).Decode(&project); err != nil {
		httputil.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if project.Status == "" {
		project.Status = models.ProjectStatusDraft
	}
	if project.MentorID == 0 && user.HasAnyRole(auth.RoleMentor) {
		project.MentorID = user.ID
	}

	if err := h.repo.Create(r.Context(), &project); err != nil {
		httputil.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	httputil.RespondSuccess(w, http.StatusCreated, project)
}

func (h *ProjectHandler) GetList(w http.ResponseWriter, r *http.Request) {
	limit := httputil.ParseQueryInt(r, "limit", 20)
	offset := httputil.ParseQueryInt(r, "offset", 0)
	if limit <= 0 {
		limit = 20
	}
	if limit > 200 {
		limit = 200
	}
	if offset < 0 {
		offset = 0
	}

	mentorID := httputil.ParseQueryInt(r, "mentorId", 0)
	if mentorID < 0 {
		mentorID = 0
	}

	projects, total, err := h.repo.GetList(r.Context(), repository.ProjectListFilters{
		Company:  httputil.ParseQueryString(r, "company"),
		Course:   httputil.ParseQueryString(r, "course"),
		Status:   httputil.ParseQueryString(r, "status"),
		MentorID: mentorID,
		Limit:    limit,
		Offset:   offset,
	})
	if err != nil {
		httputil.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, map[string]interface{}{
		"projects": projects,
		"total":    total,
		"limit":    limit,
		"offset":   offset,
	})
}

func (h *ProjectHandler) GetMentorArchive(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	if !user.HasAnyRole(auth.RoleMentor) {
		httputil.RespondError(w, http.StatusForbidden, "mentors only")
		return
	}

	limit := httputil.ParseQueryInt(r, "limit", 50)
	offset := httputil.ParseQueryInt(r, "offset", 0)
	if limit <= 0 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}
	if offset < 0 {
		offset = 0
	}

	projects, total, err := h.repo.GetList(r.Context(), repository.ProjectListFilters{
		MentorID: user.ID,
		Status:   string(models.ProjectStatusCompleted),
		Limit:    limit,
		Offset:   offset,
	})
	if err != nil {
		httputil.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, map[string]interface{}{
		"projects": projects,
		"total":    total,
		"limit":    limit,
		"offset":   offset,
	})
}

func (h *ProjectHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	project, err := h.repo.GetByID(r.Context(), id)
	if err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, project)
}

func (h *ProjectHandler) GetFull(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	project, err := h.repo.GetFull(r.Context(), id)
	if err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, project)
}

// GetProposal возвращает JSONB-документ заявки выбранного проекта.
// Доступ: автор проекта (ментор) либо координатор/админ. Используется
// фронтом для «Заполнить по шаблону» при создании продолжения.
func (h *ProjectHandler) GetProposal(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	if !user.IsAuthenticated() {
		httputil.RespondError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	proposal, mentorID, err := h.repo.GetProposal(r.Context(), id)
	if err != nil {
		respondServiceError(w, err)
		return
	}

	canSeeOthers := user.HasAnyRole(auth.RoleCoordinator)
	if !canSeeOthers && user.ID != mentorID {
		httputil.RespondError(w, http.StatusForbidden, "forbidden")
		return
	}

	httputil.RespondSuccess(w, http.StatusOK, proposal)
}

func (h *ProjectHandler) GetPredecessor(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	if !user.IsAuthenticated() {
		httputil.RespondError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	predecessor, err := h.repo.GetPredecessor(r.Context(), id)
	if err != nil {
		respondServiceError(w, err)
		return
	}

	// predecessor == nil here means the project exists but has no predecessor.
	httputil.RespondSuccess(w, http.StatusOK, predecessor)
}

func (h *ProjectHandler) GetApplicants(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	project, err := h.repo.GetApplicants(r.Context(), id)
	if err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, project)
}

func (h *ProjectHandler) Update(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	if !user.HasAnyRole(auth.RoleMentor, auth.RoleCoordinator) {
		httputil.RespondError(w, http.StatusForbidden, "forbidden")
		return
	}

	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	var project models.Project
	if err := json.NewDecoder(r.Body).Decode(&project); err != nil {
		httputil.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	project.ID = id
	if err := h.repo.Update(r.Context(), &project); err != nil {
		respondServiceError(w, err)
		return
	}
	updated, err := h.repo.GetByID(r.Context(), id)
	if err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, updated)
}

// SubmitChangeRequest — ментор (или координатор/админ) отправляет
// заявку на изменение существующего проекта. Тело: `{ proposalData: <object> }`,
// произвольный JSON-документ той же формы, что и `proposalData` при
// создании проекта (см. ProposalData на фронте).
//
// Поведение:
//   * сохраняет proposalData в колонку pending_proposal_data
//   * выставляет pending_submitted_at = NOW(), pending_submitted_by_id = user.id
//   * сам проект (proposal_data, title, status …) НЕ трогает — это change
//     request, координатор решит, применять ли (отдельный endpoint позже).
//   * если pending уже был — перезаписываем (ментор передумал, отправил
//     новую версию).
//
// Доступ: ментор-владелец проекта, координатор или админ. Анонимам — 401.
type submitChangeRequestPayload struct {
	ProposalData *json.RawMessage `json:"proposalData"`
}

func (h *ProjectHandler) SubmitChangeRequest(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	if !user.IsAuthenticated() {
		httputil.RespondError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	var payload submitChangeRequestPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		httputil.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if payload.ProposalData == nil || len(*payload.ProposalData) == 0 {
		httputil.RespondError(w, http.StatusBadRequest, "proposalData is required")
		return
	}

	// Доступ: разрешён ментору данного проекта либо координатору/админу.
	// Чтобы понять «свой ли проект», тянем mentor_id через GetProposal
	// (он же делает 404, если проекта нет).
	_, mentorID, err := h.repo.GetProposal(r.Context(), id)
	if err != nil {
		respondServiceError(w, err)
		return
	}
	allowed := user.HasAnyRole(auth.RoleCoordinator) ||
		(user.HasAnyRole(auth.RoleMentor) && user.ID == mentorID)
	if !allowed {
		httputil.RespondError(w, http.StatusForbidden, "forbidden")
		return
	}

	updated, err := h.repo.SubmitChangeRequest(r.Context(), id, *payload.ProposalData, user.ID)
	if err != nil {
		respondServiceError(w, err)
		return
	}

	httputil.RespondSuccess(w, http.StatusOK, updated)
}

// ApproveChangeRequest применяет pending_proposal_data к проекту.
// Доступно только координатору и админу.
func (h *ProjectHandler) ApproveChangeRequest(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	if !user.IsAuthenticated() {
		httputil.RespondError(w, http.StatusUnauthorized, "authentication required")
		return
	}
	if !user.HasAnyRole(auth.RoleCoordinator) {
		httputil.RespondError(w, http.StatusForbidden, "coordinator or admin only")
		return
	}
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	updated, err := h.repo.ApproveChangeRequest(r.Context(), id)
	if err != nil {
		if errors.Is(err, repository.ErrNoPendingChange) {
			httputil.RespondError(w, http.StatusConflict, "no pending change request")
			return
		}
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, updated)
}

// RejectChangeRequest очищает pending_proposal_data без применения.
// Доступно только координатору и админу.
func (h *ProjectHandler) RejectChangeRequest(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	if !user.IsAuthenticated() {
		httputil.RespondError(w, http.StatusUnauthorized, "authentication required")
		return
	}
	if !user.HasAnyRole(auth.RoleCoordinator) {
		httputil.RespondError(w, http.StatusForbidden, "coordinator or admin only")
		return
	}
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	updated, err := h.repo.RejectChangeRequest(r.Context(), id)
	if err != nil {
		if errors.Is(err, repository.ErrNoPendingChange) {
			httputil.RespondError(w, http.StatusConflict, "no pending change request")
			return
		}
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, updated)
}

func (h *ProjectHandler) Delete(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	if !user.HasAnyRole(auth.RoleCoordinator) {
		httputil.RespondError(w, http.StatusForbidden, "forbidden")
		return
	}
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.repo.Delete(r.Context(), id); err != nil {
		respondServiceError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
