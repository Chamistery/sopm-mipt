package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/hsse/project-service/internal/auth"
	"github.com/hsse/project-service/internal/httputil"
	"github.com/hsse/project-service/internal/models"
	"github.com/hsse/project-service/internal/repository"
)

type SprintScoreHandler struct {
	repo repository.SprintScoreRepositoryInterface
}

func NewSprintScoreHandler(repo repository.SprintScoreRepositoryInterface) *SprintScoreHandler {
	return &SprintScoreHandler{repo: repo}
}

// canEditScore разрешает редактирование оценок:
//   - mentor — только свою категорию (mentor) и КТУ.
//   - coordinator/admin — любую категорию.
//
// Трекер и эксперты сейчас редактируют через координатора (отдельных ролей
// в системе пока нет, см. project_roles_and_business_logic.md).
func canEditScore(user *auth.CurrentUser, category models.SprintScoreCategory) bool {
	if user.HasAnyRole(auth.RoleAdmin) {
		return true
	}
	if user.HasAnyRole(auth.RoleCoordinator) {
		return true
	}
	if user.HasAnyRole(auth.RoleMentor) {
		return category == "" || category == models.SprintScoreCategoryMentor
	}
	return false
}

func (h *SprintScoreHandler) Create(w http.ResponseWriter, r *http.Request) {
	var score models.SprintScore
	if err := json.NewDecoder(r.Body).Decode(&score); err != nil {
		httputil.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if score.Category != "" && !score.Category.Valid() {
		httputil.RespondError(w, http.StatusBadRequest, "invalid category")
		return
	}
	if !canEditScore(currentUser(r), score.Category) {
		httputil.RespondError(w, http.StatusForbidden, "forbidden")
		return
	}
	score.ScoredByID = currentUser(r).ID
	if err := h.repo.Create(r.Context(), &score); err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusCreated, score)
}

func (h *SprintScoreHandler) GetList(w http.ResponseWriter, r *http.Request) {
	sprintID := httputil.ParseQueryInt(r, "sprintId", 0)
	teamID := httputil.ParseQueryInt(r, "teamId", 0)
	studentID := httputil.ParseQueryInt(r, "studentId", 0)
	var (
		data interface{}
		err  error
	)
	switch {
	case studentID > 0:
		data, err = h.repo.GetByStudentID(r.Context(), studentID)
	case sprintID > 0 && teamID > 0:
		data, err = h.repo.GetBySprintAndTeam(r.Context(), sprintID, teamID)
	default:
		httputil.RespondError(w, http.StatusBadRequest, "provide studentId or sprintId+teamId")
		return
	}
	if err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, data)
}

func (h *SprintScoreHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	score, err := h.repo.GetByID(r.Context(), id)
	if err != nil {
		respondServiceError(w, err)
		return
	}
	if !canEditScore(currentUser(r), score.Category) {
		httputil.RespondError(w, http.StatusForbidden, "forbidden")
		return
	}
	if err := json.NewDecoder(r.Body).Decode(score); err != nil {
		httputil.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if score.Category != "" && !score.Category.Valid() {
		httputil.RespondError(w, http.StatusBadRequest, "invalid category")
		return
	}
	score.ID = id
	score.ScoredByID = currentUser(r).ID
	if err := h.repo.Update(r.Context(), score); err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, score)
}
