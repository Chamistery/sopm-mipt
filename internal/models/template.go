package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"
)

type FieldType string

const (
	FieldTypeText     FieldType = "Текст"
	FieldTypeMarkdown FieldType = "Маркдаун"
	FieldTypeNumber   FieldType = "Число"
)

type TemplateField struct {
	ID       string    `json:"id"`
	Name     string    `json:"name"`
	Type     FieldType `json:"type"`
	Required bool      `json:"required"`
}

type TemplateFields []TemplateField

func (tf TemplateFields) Value() (driver.Value, error) {
	return json.Marshal(tf)
}

func (tf *TemplateFields) Scan(value interface{}) error {
	if value == nil {
		*tf = TemplateFields{}
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}

	return json.Unmarshal(bytes, tf)
}

type Template struct {
	ID        string         `json:"id"`
	Name      string         `json:"name"`
	Fields    TemplateFields `json:"fields"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
}
