package validation

import (
	"fmt"
	"net/mail"
	"regexp"
	"strings"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/hsse/project-service/internal/models"
)

// ValidationError represents a validation error
type ValidationError struct {
	Field   string
	Message string
}

func (e *ValidationError) Error() string {
	return fmt.Sprintf("%s: %s", e.Field, e.Message)
}

// ValidationErrors is a collection of validation errors
type ValidationErrors []ValidationError

func (ve ValidationErrors) Error() string {
	if len(ve) == 0 {
		return ""
	}

	var messages []string
	for _, err := range ve {
		messages = append(messages, err.Error())
	}

	return strings.Join(messages, "; ")
}

// HasErrors returns true if there are validation errors
func (ve ValidationErrors) HasErrors() bool {
	return len(ve) > 0
}

// Validator provides validation functions
type Validator struct {
	errors ValidationErrors
}

// NewValidator creates a new validator
func NewValidator() *Validator {
	return &Validator{
		errors: make(ValidationErrors, 0),
	}
}

// AddError adds a validation error
func (v *Validator) AddError(field, message string) {
	v.errors = append(v.errors, ValidationError{
		Field:   field,
		Message: message,
	})
}

// Errors returns all validation errors
func (v *Validator) Errors() ValidationErrors {
	return v.errors
}

// HasErrors returns true if there are validation errors
func (v *Validator) HasErrors() bool {
	return len(v.errors) > 0
}

// String validations

// RequiredString validates that a string is not empty after trimming
func (v *Validator) RequiredString(field, value string) {
	if strings.TrimSpace(value) == "" {
		v.AddError(field, "is required")
	}
}

// MaxLength validates maximum string length
func (v *Validator) MaxLength(field, value string, max int) {
	if utf8.RuneCountInString(value) > max {
		v.AddError(field, fmt.Sprintf("must not exceed %d characters", max))
	}
}

// MinLength validates minimum string length
func (v *Validator) MinLength(field, value string, min int) {
	if utf8.RuneCountInString(strings.TrimSpace(value)) < min {
		v.AddError(field, fmt.Sprintf("must be at least %d characters", min))
	}
}

// Email validates email format
func (v *Validator) Email(field, value string) {
	if value == "" {
		return
	}

	_, err := mail.ParseAddress(value)
	if err != nil {
		v.AddError(field, "must be a valid email address")
	}
}

// UUID validates UUID format
func (v *Validator) UUID(field, value string) {
	if value == "" {
		return
	}

	_, err := uuid.Parse(value)
	if err != nil {
		v.AddError(field, "must be a valid UUID")
	}
}

// Integer validations

// PositiveInt validates that an integer is positive
func (v *Validator) PositiveInt(field string, value int) {
	if value <= 0 {
		v.AddError(field, "must be a positive integer")
	}
}

// NonNegativeInt validates that an integer is non-negative
func (v *Validator) NonNegativeInt(field string, value int) {
	if value < 0 {
		v.AddError(field, "must be a non-negative integer")
	}
}

// IntRange validates that an integer is within a range
func (v *Validator) IntRange(field string, value, min, max int) {
	if value < min || value > max {
		v.AddError(field, fmt.Sprintf("must be between %d and %d", min, max))
	}
}

// Enum validations

// ValidProjectStatus validates project status
func (v *Validator) ValidProjectStatus(field string, status models.ProjectStatus) {
	if status == "" {
		return
	}

	validStatuses := []models.ProjectStatus{
		models.ProjectStatusDraft,
		models.ProjectStatusPublished,
		models.ProjectStatusActive,
		models.ProjectStatusCompleted,
		models.ProjectStatusArchived,
	}

	for _, validStatus := range validStatuses {
		if status == validStatus {
			return
		}
	}

	v.AddError(field, "must be a valid project status")
}

// ValidApplicationStatus validates application status
func (v *Validator) ValidApplicationStatus(field string, status models.ApplicationStatus) {
	if status == "" {
		return
	}

	validStatuses := []models.ApplicationStatus{
		models.ApplicationStatusPending,
		models.ApplicationStatusAccepted,
		models.ApplicationStatusRejected,
	}

	for _, validStatus := range validStatuses {
		if status == validStatus {
			return
		}
	}

	v.AddError(field, "must be a valid application status")
}

// ValidFieldType validates template field type
func (v *Validator) ValidFieldType(field string, fieldType models.FieldType) {
	if fieldType == "" {
		return
	}

	validTypes := []models.FieldType{
		models.FieldTypeText,
		models.FieldTypeMarkdown,
		models.FieldTypeNumber,
	}

	for _, validType := range validTypes {
		if fieldType == validType {
			return
		}
	}

	v.AddError(field, "must be a valid field type")
}

// Sanitization

var (
	// SQL injection patterns to detect (with word boundaries)
	sqlInjectionPattern = regexp.MustCompile(`(?i)(\bunion\s+select\b|\bselect\s+.*\s+from\b|\binsert\s+into\b|\bupdate\s+.*\s+set\b|\bdelete\s+from\b|\bdrop\s+table\b|\bcreate\s+table\b|\balter\s+table\b|\bexec\s*\(|\bexecute\s*\(|--|;.*--|\/\*|\*\/)`)
	// XSS patterns to detect (actual HTML/JS attacks)
	xssPattern = regexp.MustCompile(`(?i)(<script[>\s]|javascript:|onerror\s*=|onload\s*=|<iframe|<object|<embed)`)
)

// NoSQLInjection checks for SQL injection patterns
func (v *Validator) NoSQLInjection(field, value string) {
	if sqlInjectionPattern.MatchString(value) {
		v.AddError(field, "contains potentially malicious content")
	}
}

// NoXSS checks for XSS patterns
func (v *Validator) NoXSS(field, value string) {
	if xssPattern.MatchString(value) {
		v.AddError(field, "contains potentially malicious HTML/JavaScript")
	}
}

// SafeString validates that a string is safe (no SQL injection, no XSS)
func (v *Validator) SafeString(field, value string) {
	v.NoSQLInjection(field, value)
	v.NoXSS(field, value)
}

// Array validations

// MaxArrayLength validates maximum array length
func (v *Validator) MaxArrayLength(field string, length, max int) {
	if length > max {
		v.AddError(field, fmt.Sprintf("must not exceed %d items", max))
	}
}

// MinArrayLength validates minimum array length
func (v *Validator) MinArrayLength(field string, length, min int) {
	if length < min {
		v.AddError(field, fmt.Sprintf("must have at least %d items", min))
	}
}

// Custom validations

// ValidRole validates user role
func (v *Validator) ValidRole(field, role string) {
	if role == "" {
		return
	}

	validRoles := []string{"student", "mentor", "admin", "company"}
	for _, validRole := range validRoles {
		if strings.EqualFold(role, validRole) {
			return
		}
	}

	v.AddError(field, "must be one of: student, mentor, admin, company")
}

// UniqueStrings validates that all strings in a slice are unique
func (v *Validator) UniqueStrings(field string, values []string) {
	seen := make(map[string]bool)
	for _, val := range values {
		if seen[val] {
			v.AddError(field, "must contain unique values")
			return
		}
		seen[val] = true
	}
}
