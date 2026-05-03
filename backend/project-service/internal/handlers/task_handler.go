package handlers

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/hsse/project-service/internal/auth"
	"github.com/hsse/project-service/internal/httputil"
	"github.com/hsse/project-service/internal/models"
	"github.com/hsse/project-service/internal/repository"
	"github.com/hsse/project-service/internal/service"
)

type TaskHandler struct {
	service *service.TaskService
	teams   repository.TeamRepositoryInterface
	sprints repository.SprintRepositoryInterface
}

func NewTaskHandler(
	service *service.TaskService,
	teams repository.TeamRepositoryInterface,
	sprints repository.SprintRepositoryInterface,
) *TaskHandler {
	return &TaskHandler{service: service, teams: teams, sprints: sprints}
}

func (h *TaskHandler) Create(w http.ResponseWriter, r *http.Request) {
	var task models.Task
	if err := json.NewDecoder(r.Body).Decode(&task); err != nil {
		httputil.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := h.service.Create(r.Context(), currentUser(r), &task); err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusCreated, task)
}

func (h *TaskHandler) GetList(w http.ResponseWriter, r *http.Request) {
	tasks, err := h.service.List(r.Context(), currentUser(r), repository.TaskFilters{
		SprintID:   httputil.ParseQueryInt(r, "sprintId", 0),
		TeamID:     httputil.ParseQueryInt(r, "teamId", 0),
		AssigneeID: httputil.ParseQueryInt(r, "assigneeId", 0),
	})
	if err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, map[string]interface{}{"tasks": tasks})
}

func (h *TaskHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	task, err := h.service.GetByID(r.Context(), currentUser(r), id)
	if err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, task)
}

func (h *TaskHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	var task models.Task
	if err := json.NewDecoder(r.Body).Decode(&task); err != nil {
		httputil.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	task.ID = id
	updated, err := h.service.Update(r.Context(), currentUser(r), &task)
	if err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, updated)
}

func (h *TaskHandler) Approve(w http.ResponseWriter, r *http.Request) {
	h.withCommentTransition(w, r, h.service.Approve)
}
func (h *TaskHandler) Reject(w http.ResponseWriter, r *http.Request) {
	h.withCommentTransition(w, r, h.service.Reject)
}
func (h *TaskHandler) Accept(w http.ResponseWriter, r *http.Request) {
	h.withCommentTransition(w, r, h.service.Accept)
}
func (h *TaskHandler) Return(w http.ResponseWriter, r *http.Request) {
	h.withCommentTransition(w, r, h.service.Return)
}

func (h *TaskHandler) SubmitReview(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	task, err := h.service.SubmitReview(r.Context(), currentUser(r), id)
	if err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, task)
}

func (h *TaskHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.service.Delete(r.Context(), currentUser(r), id); err != nil {
		respondServiceError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *TaskHandler) Gantt(w http.ResponseWriter, r *http.Request) {
	teamID, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	sprintID := httputil.ParseQueryInt(r, "sprintId", 0)
	team, err := h.teams.GetByID(r.Context(), teamID)
	if err != nil {
		respondServiceError(w, err)
		return
	}
	sprint, err := h.sprints.GetByID(r.Context(), sprintID)
	if err != nil {
		respondServiceError(w, err)
		return
	}
	tasks, err := h.service.List(r.Context(), currentUser(r), repository.TaskFilters{SprintID: sprintID, TeamID: teamID})
	if err != nil {
		respondServiceError(w, err)
		return
	}
	ganttTasks := make([]models.Task, 0, len(tasks))
	for _, task := range tasks {
		if task.Status == models.TaskStatusRejected {
			continue
		}
		ganttTasks = append(ganttTasks, task)
	}

	members := make([]map[string]interface{}, 0, len(team.Members))
	for _, member := range team.Members {
		members = append(members, map[string]interface{}{
			"userId":     member.UserID,
			"name":       member.User.FirstName + " " + member.User.LastName,
			"roleInTeam": member.RoleInTeam,
			"isLeader":   member.IsLeader,
		})
	}

	httputil.RespondSuccess(w, http.StatusOK, map[string]interface{}{
		"sprint":  sprint,
		"members": members,
		"tasks":   ganttTasks,
	})
}

func (h *TaskHandler) withCommentTransition(
	w http.ResponseWriter,
	r *http.Request,
	transition func(context.Context, *auth.CurrentUser, int, string) (*models.Task, error),
) {
	id, err := httputil.ParsePathInt(r, "id")
	if err != nil {
		httputil.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	var payload struct {
		Comment string `json:"comment"`
	}
	_ = json.NewDecoder(r.Body).Decode(&payload)
	task, err := transition(r.Context(), currentUser(r), id, payload.Comment)
	if err != nil {
		respondServiceError(w, err)
		return
	}
	httputil.RespondSuccess(w, http.StatusOK, task)
}
