package models

import (
	"time"
)

type ApplicationStatus string

const (
	ApplicationStatusPending         ApplicationStatus = "Ожидает"
	ApplicationStatusUnqualified     ApplicationStatus = "Не подходит"
	ApplicationStatusNotRecommended  ApplicationStatus = "Не рекомендован"
	ApplicationStatusRecommended     ApplicationStatus = "Рекомендован"
	ApplicationStatusMentorAccepted  ApplicationStatus = "Принято ментором"
	ApplicationStatusAccepted        ApplicationStatus = "Принят"
	ApplicationStatusStudentDeclined ApplicationStatus = "Студент отклонил"
	ApplicationStatusAutoDeclined    ApplicationStatus = "Авто-отклонено"
	ApplicationStatusExcluded        ApplicationStatus = "Исключён"
)

type Application struct {
	ID              int               `json:"id"`
	ProjectID       int               `json:"projectId"`
	StudentID       int               `json:"studentId"`
	TeamID          *int              `json:"teamId,omitempty"`
	Priority        int               `json:"priority"`
	Status          ApplicationStatus `json:"status"`
	StatusChangedAt time.Time         `json:"statusChangedAt"`
	InvitedAt       *time.Time        `json:"invitedAt,omitempty"`
	RespondedAt     *time.Time        `json:"respondedAt,omitempty"`
	CreatedAt       time.Time         `json:"createdAt"`
	UpdatedAt       time.Time         `json:"updatedAt"`
}

type ApplicationWithProject struct {
	Application
	ProjectTitle string `json:"projectTitle"`
	Company      string `json:"company"`
	Courses      []int  `json:"courses,omitempty"`
	Student      User   `json:"student"`
}

type ProjectApplicantsResponse struct {
	ProjectID    int                      `json:"projectId"`
	Requirements ApplicantRequirements    `json:"requirements"`
	Qualified    ApplicantPriorityBuckets `json:"qualified"`
	Unqualified  ApplicantPriorityBuckets `json:"unqualified"`
	Teams        []ApplicantTeamBucket    `json:"teams"`
}

type ApplicantRequirements struct {
	MinCourse int     `json:"minCourse"`
	MinGPA    float64 `json:"minGpa"`
}

type ApplicantItem struct {
	ApplicationID int               `json:"applicationId"`
	StudentID     int               `json:"studentId"`
	Name          string            `json:"name"`
	Course        int               `json:"course"`
	GPA           float64           `json:"gpa"`
	Status        ApplicationStatus `json:"status"`
	TeamID        *int              `json:"teamId"`
}

type ApplicantPriorityBuckets struct {
	Priority1 []ApplicantItem `json:"priority1"`
	Priority2 []ApplicantItem `json:"priority2"`
	Priority3 []ApplicantItem `json:"priority3"`
	Priority4 []ApplicantItem `json:"priority4"`
	Priority5 []ApplicantItem `json:"priority5"`
}

type ApplicantTeamBucket struct {
	TeamID  int                   `json:"teamId"`
	Name    string                `json:"name"`
	MaxSize int                   `json:"maxSize"`
	Members []ApplicantTeamMember `json:"members"`
}

type ApplicantTeamMember struct {
	ApplicationID int               `json:"applicationId"`
	StudentID     int               `json:"studentId"`
	Name          string            `json:"name"`
	Status        ApplicationStatus `json:"status"`
}
