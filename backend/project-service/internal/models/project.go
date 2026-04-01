package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"
)

type ProjectStatus string

const (
	ProjectStatusDraft     ProjectStatus = "Черновик"
	ProjectStatusPublished ProjectStatus = "Опубликован"
	ProjectStatusActive    ProjectStatus = "Активный"
	ProjectStatusCompleted ProjectStatus = "Завершен"
	ProjectStatusArchived  ProjectStatus = "Архивный"
)

type FieldValue struct {
	FieldID string `json:"fieldId"`
	Value   string `json:"value"`
}

type FieldValues []FieldValue

func (fv FieldValues) Value() (driver.Value, error) {
	return json.Marshal(fv)
}

func (fv *FieldValues) Scan(value interface{}) error {
	if value == nil {
		*fv = FieldValues{}
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}

	return json.Unmarshal(bytes, fv)
}

type Project struct {
	ID          int           `json:"id"`
	Title       string        `json:"title"`
	TemplateID  string        `json:"templateId"`
	FieldValues FieldValues   `json:"fieldValues"`
	Status      ProjectStatus `json:"status"`
	MentorID    int           `json:"mentorId"`
	CreatorID   int           `json:"creatorId"`
	MaxSlots    int           `json:"maxSlots"`
	Company     string        `json:"company"`
	Course      string        `json:"course"`
	CreatedAt   time.Time     `json:"createdAt"`
	UpdatedAt   time.Time     `json:"updatedAt"`
}

type ProjectListItem struct {
	ID          int           `json:"id"`
	Title       string        `json:"title"`
	Status      ProjectStatus `json:"status"`
	MentorID    int           `json:"mentorId"`
	Company     string        `json:"company"`
	Course      string        `json:"course"`
	MaxSlots    int           `json:"maxSlots"`
	FilledSlots int           `json:"filledSlots"`
	CreatedAt   time.Time     `json:"createdAt"`
}
