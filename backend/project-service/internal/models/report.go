package models

import "time"

type TeamReportStatus string

const (
	TeamReportStatusDraft     TeamReportStatus = "Черновик"
	TeamReportStatusSubmitted TeamReportStatus = "Отправлен"
	TeamReportStatusReviewed  TeamReportStatus = "Проверен"
)

type TeamReport struct {
	ID            int              `json:"id"`
	SprintID      int              `json:"sprintId"`
	TeamID        int              `json:"teamId"`
	Summary       string           `json:"summary,omitempty"`
	Problems      string           `json:"problems,omitempty"`
	NextPlan      string           `json:"nextPlan,omitempty"`
	Status        TeamReportStatus `json:"status"`
	MentorComment string           `json:"mentorComment,omitempty"`
	SubmittedAt   *time.Time       `json:"submittedAt,omitempty"`
	ReviewedAt    *time.Time       `json:"reviewedAt,omitempty"`
	CreatedAt     time.Time        `json:"createdAt"`
	UpdatedAt     time.Time        `json:"updatedAt"`
}

type SprintScore struct {
	ID         int          `json:"id"`
	SprintID   int          `json:"sprintId"`
	TeamID     int          `json:"teamId"`
	StudentID  int          `json:"studentId"`
	Student    *UserSummary `json:"student,omitempty"`
	Score      int          `json:"score"`
	Comment    string       `json:"comment,omitempty"`
	ScoredByID int          `json:"scoredById"`
	CreatedAt  time.Time    `json:"createdAt"`
	UpdatedAt  time.Time    `json:"updatedAt"`
}
