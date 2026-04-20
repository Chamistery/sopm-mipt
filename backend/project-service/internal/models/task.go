package models

import (
	"database/sql/driver"
	"time"
)

type TaskStatus string

const (
	TaskStatusPendingApproval TaskStatus = "Ожидает аппрува"
	TaskStatusAssigned        TaskStatus = "Назначена"
	TaskStatusRejected        TaskStatus = "Отклонена"
	TaskStatusInProgress      TaskStatus = "В работе"
	TaskStatusInReview        TaskStatus = "На ревью"
	TaskStatusReturned        TaskStatus = "Возвращена"
	TaskStatusDone            TaskStatus = "Готово"
)

type MentorCommentAction string

const (
	MentorCommentApprove MentorCommentAction = "Аппрув"
	MentorCommentReject  MentorCommentAction = "Отклонение"
	MentorCommentAccept  MentorCommentAction = "Принятие"
	MentorCommentReturn  MentorCommentAction = "Возврат"
)

type TaskHistoryEvent string

const (
	TaskHistoryReview   TaskHistoryEvent = "review"
	TaskHistoryReturned TaskHistoryEvent = "returned"
	TaskHistoryAccepted TaskHistoryEvent = "accepted"
)

type MentorComment struct {
	Action    MentorCommentAction `json:"action"`
	Text      string              `json:"text"`
	CreatedAt time.Time           `json:"createdAt,omitempty"`
}

type MentorComments []MentorComment

func (m MentorComments) Value() (driver.Value, error) {
	return marshalJSONValue(m)
}

func (m *MentorComments) Scan(value interface{}) error {
	*m = MentorComments{}
	return scanJSONValue(value, m)
}

type TaskHistoryItem struct {
	Day   int              `json:"day"`
	Event TaskHistoryEvent `json:"event"`
}

type TaskHistory []TaskHistoryItem

func (h TaskHistory) Value() (driver.Value, error) {
	return marshalJSONValue(h)
}

func (h *TaskHistory) Scan(value interface{}) error {
	*h = TaskHistory{}
	return scanJSONValue(value, h)
}

type Task struct {
	ID              int            `json:"id"`
	SprintID        int            `json:"sprintId"`
	TeamID          int            `json:"teamId"`
	AssigneeID      int            `json:"assigneeId"`
	AssigneeName    string         `json:"assigneeName,omitempty"`
	CreatedByID     int            `json:"createdById"`
	Name            string         `json:"name"`
	Description     string         `json:"description,omitempty"`
	Status          TaskStatus     `json:"status"`
	StatusChangedAt time.Time      `json:"statusChangedAt"`
	WasOverdue      bool           `json:"wasOverdue"`
	HoursEstimate   int            `json:"hoursEstimate"`
	StartDate       string         `json:"startDate"`
	EndDate         string         `json:"endDate"`
	MRLink          string         `json:"mrLink,omitempty"`
	WorkDescription string         `json:"workDescription,omitempty"`
	MentorComments  MentorComments `json:"mentorComments"`
	History         TaskHistory    `json:"history"`
	DeletedAt       *time.Time     `json:"deletedAt,omitempty"`
	DeletedByID     *int           `json:"deletedById,omitempty"`
	CreatedAt       time.Time      `json:"createdAt"`
	UpdatedAt       time.Time      `json:"updatedAt"`
}
