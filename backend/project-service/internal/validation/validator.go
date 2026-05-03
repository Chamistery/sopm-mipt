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

type ValidationError struct {
	Field   string
	Message string
}

func (e *ValidationError) Error() string {
	return fmt.Sprintf("%s: %s", e.Field, e.Message)
}

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

func (ve ValidationErrors) HasErrors() bool {
	return len(ve) > 0
}

type Validator struct {
	errors ValidationErrors
}

func NewValidator() *Validator {
	return &Validator{
		errors: make(ValidationErrors, 0),
	}
}

func (v *Validator) AddError(field, message string) {
	v.errors = append(v.errors, ValidationError{
		Field:   field,
		Message: message,
	})
}

func (v *Validator) Errors() ValidationErrors {
	return v.errors
}

func (v *Validator) HasErrors() bool {
	return len(v.errors) > 0
}

func (v *Validator) RequiredString(field, value string) {
	if strings.TrimSpace(value) == "" {
		v.AddError(field, "is required")
	}
}

func (v *Validator) MaxLength(field, value string, max int) {
	if utf8.RuneCountInString(value) > max {
		v.AddError(field, fmt.Sprintf("must not exceed %d characters", max))
	}
}

func (v *Validator) MinLength(field, value string, min int) {
	if utf8.RuneCountInString(strings.TrimSpace(value)) < min {
		v.AddError(field, fmt.Sprintf("must be at least %d characters", min))
	}
}

func (v *Validator) Email(field, value string) {
	if value == "" {
		return
	}

	_, err := mail.ParseAddress(value)
	if err != nil {
		v.AddError(field, "must be a valid email address")
	}
}

func (v *Validator) UUID(field, value string) {
	if value == "" {
		return
	}

	_, err := uuid.Parse(value)
	if err != nil {
		v.AddError(field, "must be a valid UUID")
	}
}

func (v *Validator) PositiveInt(field string, value int) {
	if value <= 0 {
		v.AddError(field, "must be a positive integer")
	}
}

func (v *Validator) NonNegativeInt(field string, value int) {
	if value < 0 {
		v.AddError(field, "must be a non-negative integer")
	}
}

func (v *Validator) IntRange(field string, value, min, max int) {
	if value < min || value > max {
		v.AddError(field, fmt.Sprintf("must be between %d and %d", min, max))
	}
}

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

func (v *Validator) ValidApplicationStatus(field string, status models.ApplicationStatus) {
	if status == "" {
		return
	}

	validStatuses := []models.ApplicationStatus{
		models.ApplicationStatusPending,
		models.ApplicationStatusUnqualified,
		models.ApplicationStatusNotRecommended,
		models.ApplicationStatusRecommended,
		models.ApplicationStatusMentorAccepted,
		models.ApplicationStatusAccepted,
		models.ApplicationStatusStudentDeclined,
		models.ApplicationStatusAutoDeclined,
		models.ApplicationStatusExcluded,
	}

	for _, validStatus := range validStatuses {
		if status == validStatus {
			return
		}
	}

	v.AddError(field, "must be a valid application status")
}

var (
	sqlInjectionPattern = regexp.MustCompile(`(?i)(\bunion\s+select\b|\bselect\s+.*\s+from\b|\binsert\s+into\b|\bupdate\s+.*\s+set\b|\bdelete\s+from\b|\bdrop\s+table\b|\bcreate\s+table\b|\balter\s+table\b|\bexec\s*\(|\bexecute\s*\(|--|;.*--|\/\*|\*\/)`)
	xssPattern          = regexp.MustCompile(`(?i)(<script[>\s]|javascript:|onerror\s*=|onload\s*=|<iframe|<object|<embed)`)
)

func (v *Validator) NoSQLInjection(field, value string) {
	if sqlInjectionPattern.MatchString(value) {
		v.AddError(field, "contains potentially malicious content")
	}
}

func (v *Validator) NoXSS(field, value string) {
	if xssPattern.MatchString(value) {
		v.AddError(field, "contains potentially malicious HTML/JavaScript")
	}
}

func (v *Validator) SafeString(field, value string) {
	v.NoSQLInjection(field, value)
	v.NoXSS(field, value)
}

func (v *Validator) MaxArrayLength(field string, length, max int) {
	if length > max {
		v.AddError(field, fmt.Sprintf("must not exceed %d items", max))
	}
}

func (v *Validator) MinArrayLength(field string, length, min int) {
	if length < min {
		v.AddError(field, fmt.Sprintf("must have at least %d items", min))
	}
}

func (v *Validator) ValidRole(field, role string) {
	if role == "" {
		return
	}

	validRoles := []string{"student", "teamlead", "mentor", "coordinator", "admin"}
	for _, validRole := range validRoles {
		if strings.EqualFold(role, validRole) {
			return
		}
	}

	v.AddError(field, "must be one of: student, teamlead, mentor, coordinator, admin")
}

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

func (v *Validator) ValidTaskStatus(field string, status models.TaskStatus) {
	if status == "" {
		return
	}
	validStatuses := []models.TaskStatus{
		models.TaskStatusPendingApproval,
		models.TaskStatusAssigned,
		models.TaskStatusRejected,
		models.TaskStatusInProgress,
		models.TaskStatusInReview,
		models.TaskStatusReturned,
		models.TaskStatusDone,
	}
	for _, validStatus := range validStatuses {
		if status == validStatus {
			return
		}
	}
	v.AddError(field, "must be a valid task status")
}

func (v *Validator) ValidSprintStatus(field string, status models.SprintStatus) {
	if status == "" {
		return
	}
	validStatuses := []models.SprintStatus{
		models.SprintStatusPlanned,
		models.SprintStatusActive,
		models.SprintStatusFinished,
	}
	for _, validStatus := range validStatuses {
		if status == validStatus {
			return
		}
	}
	v.AddError(field, "must be a valid sprint status")
}

func (v *Validator) ValidTeamReportStatus(field string, status models.TeamReportStatus) {
	if status == "" {
		return
	}
	validStatuses := []models.TeamReportStatus{
		models.TeamReportStatusDraft,
		models.TeamReportStatusSubmitted,
		models.TeamReportStatusReviewed,
	}
	for _, validStatus := range validStatuses {
		if status == validStatus {
			return
		}
	}
	v.AddError(field, "must be a valid team report status")
}

func (v *Validator) ValidMeetingStatus(field string, status models.MeetingStatus) {
	if status == "" {
		return
	}
	validStatuses := []models.MeetingStatus{
		models.MeetingStatusPending,
		models.MeetingStatusConfirmed,
		models.MeetingStatusDeclined,
		models.MeetingStatusCompleted,
		models.MeetingStatusCancelled,
	}
	for _, validStatus := range validStatuses {
		if status == validStatus {
			return
		}
	}
	v.AddError(field, "must be a valid meeting status")
}
