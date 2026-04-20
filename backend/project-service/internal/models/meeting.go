package models

import "time"

type MeetingStatus string

const (
	MeetingStatusPending   MeetingStatus = "Ожидает подтверждения"
	MeetingStatusConfirmed MeetingStatus = "Подтверждена"
	MeetingStatusDeclined  MeetingStatus = "Отклонена"
	MeetingStatusCompleted MeetingStatus = "Состоялась"
	MeetingStatusCancelled MeetingStatus = "Отменена"
)

type Meeting struct {
	ID                  int           `json:"id"`
	TeamID              int           `json:"teamId"`
	SprintID            *int          `json:"sprintId,omitempty"`
	Title               string        `json:"title"`
	Description         string        `json:"description,omitempty"`
	MeetingDate         string        `json:"meetingDate"`
	StartTime           string        `json:"startTime"`
	DurationMinutes     int           `json:"durationMinutes"`
	ConferenceLink      string        `json:"conferenceLink,omitempty"`
	CreatedByID         int           `json:"createdById"`
	MentorConfirmed     *bool         `json:"mentorConfirmed,omitempty"`
	MentorDeclineReason string        `json:"mentorDeclineReason,omitempty"`
	ConfirmedAt         *time.Time    `json:"confirmedAt,omitempty"`
	Summary             string        `json:"summary,omitempty"`
	Status              MeetingStatus `json:"status"`
	CreatedAt           time.Time     `json:"createdAt"`
	UpdatedAt           time.Time     `json:"updatedAt"`
}

type Notification struct {
	Code      string    `json:"code"`
	Title     string    `json:"title"`
	Message   string    `json:"message"`
	Entity    string    `json:"entity"`
	EntityID  int       `json:"entityId"`
	CreatedAt time.Time `json:"createdAt"`
}
