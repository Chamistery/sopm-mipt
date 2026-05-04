package models

import (
	"database/sql/driver"
	"time"
)

type ProjectStatus string

const (
	ProjectStatusDraft     ProjectStatus = "Черновик"
	ProjectStatusPending   ProjectStatus = "На утверждении" // submitted by mentor, awaiting coordinator approval
	ProjectStatusApproved  ProjectStatus = "Утверждён"      // coordinator approved, before students get distributed
	ProjectStatusPublished ProjectStatus = "Опубликован"
	ProjectStatusActive    ProjectStatus = "Активный"
	ProjectStatusCompleted ProjectStatus = "Завершён"
	ProjectStatusArchived  ProjectStatus = "Архивный"
)

type StringList []string

func (s StringList) Value() (driver.Value, error) {
	return marshalJSONValue(s)
}

func (s *StringList) Scan(value interface{}) error {
	*s = StringList{}
	return scanJSONValue(value, s)
}

type IntList []int

type Project struct {
	ID                 int           `json:"id"`
	Title              string        `json:"title"`
	Status             ProjectStatus `json:"status"`
	MentorID           int           `json:"mentorId"`
	Company            string        `json:"company"`
	Courses            []int         `json:"courses"`
	Description        string        `json:"description"`
	FullDescription    string        `json:"fullDescription"`
	Technologies       StringList    `json:"technologies"`
	TeamSizeMin        int           `json:"teamSizeMin"`
	TeamSizeMax        int           `json:"teamSizeMax"`
	NumTeams           int           `json:"numTeams"`
	MinGPA             float64       `json:"minGpa"`
	EduResult          string        `json:"eduResult"`
	AcceptanceCriteria string        `json:"acceptanceCriteria"`
	Goal               string        `json:"goal"`
	ExpectedResult     string        `json:"expectedResult"`
	Competencies       string        `json:"competencies"`
	Resources          string        `json:"resources"`
	DurationSemesters    int           `json:"durationSemesters"`
	SubmittedAt          *time.Time    `json:"submittedAt,omitempty"`
	PredecessorProjectID *int          `json:"predecessorProjectId,omitempty"`
	CreatedAt            time.Time     `json:"createdAt"`
	UpdatedAt            time.Time     `json:"updatedAt"`
}

func (l IntList) Value() (driver.Value, error) {
	return marshalJSONValue(l)
}

func (l *IntList) Scan(value interface{}) error {
	*l = IntList{}
	return scanJSONValue(value, l)
}

type ProjectListItem struct {
	ID             int           `json:"id"`
	Title          string        `json:"title"`
	Status         ProjectStatus `json:"status"`
	MentorID       int           `json:"mentorId"`
	Company        string        `json:"company"`
	Courses        []int         `json:"courses"`
	TeamSizeMin    int           `json:"teamSizeMin"`
	TeamSizeMax    int           `json:"teamSizeMax"`
	NumTeams       int           `json:"numTeams"`
	FilledTeams    int           `json:"filledTeams"`
	AcceptedCount  int           `json:"acceptedCount"`
	SubmittedAt    *time.Time    `json:"submittedAt,omitempty"`
	CreatedAt      time.Time     `json:"createdAt"`
	UpdatedAt      time.Time     `json:"updatedAt"`
	Description    string        `json:"description"`
	Technologies   StringList    `json:"technologies"`
	MinGPA         float64       `json:"minGpa"`
	CurrentSprint  *Sprint       `json:"currentSprint,omitempty"`
	Mentor         *UserSummary  `json:"mentor,omitempty"`
	AvailableSlots int           `json:"availableSlots"`
}

type ProjectFull struct {
	Project Project  `json:"project"`
	Sprints []Sprint `json:"sprints"`
	Teams   []Team   `json:"teams"`
}
