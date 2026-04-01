package models

import (
	"time"
)

type ApplicationStatus string

const (
	ApplicationStatusPending  ApplicationStatus = "Ожидает"
	ApplicationStatusAccepted ApplicationStatus = "Принято"
	ApplicationStatusRejected ApplicationStatus = "Отклонено"
)

type Application struct {
	ID        int               `json:"id"`
	ProjectID int               `json:"projectId"`
	StudentID int               `json:"studentId"`
	Priority  int               `json:"priority"`
	Status    ApplicationStatus `json:"status"`
	CreatedAt time.Time         `json:"createdAt"`
	UpdatedAt time.Time         `json:"updatedAt"`
}

type ApplicationWithProject struct {
	Application
	ProjectTitle string `json:"projectTitle"`
	Company      string `json:"company"`
}
