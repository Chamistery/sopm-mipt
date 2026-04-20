package models

import "time"

type Team struct {
	ID            int          `json:"id"`
	ProjectID     int          `json:"projectId"`
	Name          string       `json:"name"`
	LeaderID      *int         `json:"leaderId,omitempty"`
	Leader        *UserSummary `json:"leader,omitempty"`
	Members       []TeamMember `json:"members,omitempty"`
	CurrentSprint *Sprint      `json:"currentSprint,omitempty"`
	CreatedAt     time.Time    `json:"createdAt"`
	UpdatedAt     time.Time    `json:"updatedAt"`
}

type TeamMember struct {
	ID         int         `json:"id"`
	TeamID     int         `json:"teamId"`
	UserID     int         `json:"userId"`
	RoleInTeam string      `json:"roleInTeam,omitempty"`
	JoinedAt   time.Time   `json:"joinedAt"`
	IsLeader   bool        `json:"isLeader"`
	User       UserSummary `json:"user"`
}

type SprintStatus string

const (
	SprintStatusPlanned  SprintStatus = "Запланирован"
	SprintStatusActive   SprintStatus = "Активный"
	SprintStatusFinished SprintStatus = "Завершён"
)

type Sprint struct {
	ID        int          `json:"id"`
	ProjectID int          `json:"projectId"`
	Number    int          `json:"number"`
	StartDate string       `json:"startDate"`
	EndDate   string       `json:"endDate"`
	Status    SprintStatus `json:"status"`
	CreatedAt time.Time    `json:"createdAt"`
	UpdatedAt time.Time    `json:"updatedAt"`
}
