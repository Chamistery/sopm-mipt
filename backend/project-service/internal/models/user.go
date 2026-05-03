package models

import (
	"database/sql/driver"
	"time"
)

type User struct {
	ID         int     `json:"id"`
	FirstName  string  `json:"firstName"`
	LastName   string  `json:"lastName"`
	MiddleName string  `json:"middleName,omitempty"`
	Email      string  `json:"email"`
	Role       string  `json:"role"`
	Company    string  `json:"company,omitempty"`
	Course     string  `json:"course,omitempty"`
	Group      string  `json:"group,omitempty"`
	Avatar     string  `json:"avatar,omitempty"`
	GPA        float64 `json:"gpa,omitempty"`
	Direction  string  `json:"direction,omitempty"`
}

type UserSummary struct {
	ID        int    `json:"id"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
}

type ProfileLink struct {
	Type string `json:"type"`
	URL  string `json:"url"`
}

type ProfileLinks []ProfileLink

func (p ProfileLinks) Value() (driver.Value, error) {
	return marshalJSONValue(p)
}

func (p *ProfileLinks) Scan(value interface{}) error {
	*p = ProfileLinks{}
	return scanJSONValue(value, p)
}

type UserProfile struct {
	UserID              int          `json:"userId"`
	Telegram            string       `json:"telegram,omitempty"`
	Phone               string       `json:"phone,omitempty"`
	About               string       `json:"about,omitempty"`
	Skills              StringList   `json:"skills"`
	Links               ProfileLinks `json:"links"`
	NotificationsSeenAt time.Time    `json:"notificationsSeenAt"`
	CreatedAt           time.Time    `json:"createdAt"`
	UpdatedAt           time.Time    `json:"updatedAt"`
}

type UserFile struct {
	ID          int       `json:"id"`
	UserID      int       `json:"userId"`
	FileName    string    `json:"fileName"`
	FileSize    int       `json:"fileSize"`
	FileType    string    `json:"fileType"`
	StoragePath string    `json:"storagePath"`
	UploadedAt  time.Time `json:"uploadedAt"`
}
