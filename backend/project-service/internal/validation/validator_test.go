package validation

import (
	"testing"

	"github.com/hsse/project-service/internal/models"
)

func TestValidatorAcceptsNewRolesAndStatuses(t *testing.T) {
	v := NewValidator()
	v.ValidRole("role", "teamlead")
	v.ValidApplicationStatus("application", models.ApplicationStatusMentorAccepted)
	v.ValidTaskStatus("task", models.TaskStatusInReview)
	v.ValidMeetingStatus("meeting", models.MeetingStatusConfirmed)

	if v.HasErrors() {
		t.Fatalf("expected no validation errors, got %v", v.Errors())
	}
}

func TestValidatorRejectsInvalidTaskStatus(t *testing.T) {
	v := NewValidator()
	v.ValidTaskStatus("task", models.TaskStatus("bad"))

	if !v.HasErrors() {
		t.Fatal("expected validation error")
	}
}
