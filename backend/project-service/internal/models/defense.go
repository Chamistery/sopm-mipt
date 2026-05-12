package models

import "time"

// Defense — финальная защита проектов. Pixel-port из admin.html
// (view-grading tab «Защиты», lines 1958-2010).
type Defense struct {
	ID            int          `json:"id"`
	Title         string       `json:"title"`
	StartsAt      time.Time    `json:"startsAt"`
	EndsAt        *time.Time   `json:"endsAt,omitempty"`
	Location      string       `json:"location,omitempty"`
	Description   string       `json:"description,omitempty"`
	SemesterLabel string       `json:"semesterLabel,omitempty"`
	Completed     bool         `json:"completed"`
	CreatedAt     time.Time    `json:"createdAt"`
	UpdatedAt     time.Time    `json:"updatedAt"`
	// ProjectIDs и ExpertIDs — заполняются для GET-эндпоинта.
	ProjectIDs []int          `json:"projectIds"`
	Experts    []DefenseExpert `json:"experts"`
	Projects   []DefenseProject `json:"projects"`
}

// DefenseExpert — лёгкая ссылка на ментора-эксперта.
type DefenseExpert struct {
	UserID    int    `json:"userId"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
}

// DefenseProject — лёгкая ссылка на защищаемый проект (название + N команд).
type DefenseProject struct {
	ProjectID  int    `json:"projectId"`
	Title      string `json:"title"`
	TeamsCount int    `json:"teamsCount"`
}
