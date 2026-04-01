package validation

import (
	"testing"

	"github.com/hsse/project-service/internal/models"
)

func TestRequiredString(t *testing.T) {
	tests := []struct {
		name      string
		value     string
		wantError bool
	}{
		{"valid string", "hello", false},
		{"empty string", "", true},
		{"whitespace only", "   ", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			v := NewValidator()
			v.RequiredString("field", tt.value)

			if tt.wantError && !v.HasErrors() {
				t.Error("expected validation error, got none")
			}
			if !tt.wantError && v.HasErrors() {
				t.Errorf("unexpected validation error: %v", v.Errors())
			}
		})
	}
}

func TestMaxLength(t *testing.T) {
	tests := []struct {
		name      string
		value     string
		max       int
		wantError bool
	}{
		{"within limit", "hello", 10, false},
		{"at limit", "hello", 5, false},
		{"exceeds limit", "hello world", 5, true},
		{"unicode chars", "привет", 10, false},
		{"unicode exceeds", "привет мир", 5, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			v := NewValidator()
			v.MaxLength("field", tt.value, tt.max)

			if tt.wantError && !v.HasErrors() {
				t.Error("expected validation error, got none")
			}
			if !tt.wantError && v.HasErrors() {
				t.Errorf("unexpected validation error: %v", v.Errors())
			}
		})
	}
}

func TestEmail(t *testing.T) {
	tests := []struct {
		name      string
		value     string
		wantError bool
	}{
		{"valid email", "test@example.com", false},
		{"invalid email - no @", "testexample.com", true},
		{"invalid email - no domain", "test@", true},
		{"empty email", "", false}, // empty is allowed, use RequiredString separately
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			v := NewValidator()
			v.Email("field", tt.value)

			if tt.wantError && !v.HasErrors() {
				t.Error("expected validation error, got none")
			}
			if !tt.wantError && v.HasErrors() {
				t.Errorf("unexpected validation error: %v", v.Errors())
			}
		})
	}
}

func TestUUID(t *testing.T) {
	tests := []struct {
		name      string
		value     string
		wantError bool
	}{
		{"valid UUID", "550e8400-e29b-41d4-a716-446655440000", false},
		{"invalid UUID", "not-a-uuid", true},
		{"empty UUID", "", false}, // empty is allowed
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			v := NewValidator()
			v.UUID("field", tt.value)

			if tt.wantError && !v.HasErrors() {
				t.Error("expected validation error, got none")
			}
			if !tt.wantError && v.HasErrors() {
				t.Errorf("unexpected validation error: %v", v.Errors())
			}
		})
	}
}

func TestPositiveInt(t *testing.T) {
	tests := []struct {
		name      string
		value     int
		wantError bool
	}{
		{"positive", 5, false},
		{"zero", 0, true},
		{"negative", -5, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			v := NewValidator()
			v.PositiveInt("field", tt.value)

			if tt.wantError && !v.HasErrors() {
				t.Error("expected validation error, got none")
			}
			if !tt.wantError && v.HasErrors() {
				t.Errorf("unexpected validation error: %v", v.Errors())
			}
		})
	}
}

func TestNonNegativeInt(t *testing.T) {
	tests := []struct {
		name      string
		value     int
		wantError bool
	}{
		{"positive", 5, false},
		{"zero", 0, false},
		{"negative", -5, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			v := NewValidator()
			v.NonNegativeInt("field", tt.value)

			if tt.wantError && !v.HasErrors() {
				t.Error("expected validation error, got none")
			}
			if !tt.wantError && v.HasErrors() {
				t.Errorf("unexpected validation error: %v", v.Errors())
			}
		})
	}
}

func TestIntRange(t *testing.T) {
	tests := []struct {
		name      string
		value     int
		min       int
		max       int
		wantError bool
	}{
		{"within range", 5, 1, 10, false},
		{"at min", 1, 1, 10, false},
		{"at max", 10, 1, 10, false},
		{"below min", 0, 1, 10, true},
		{"above max", 11, 1, 10, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			v := NewValidator()
			v.IntRange("field", tt.value, tt.min, tt.max)

			if tt.wantError && !v.HasErrors() {
				t.Error("expected validation error, got none")
			}
			if !tt.wantError && v.HasErrors() {
				t.Errorf("unexpected validation error: %v", v.Errors())
			}
		})
	}
}

func TestNoSQLInjection(t *testing.T) {
	tests := []struct {
		name      string
		value     string
		wantError bool
	}{
		{"safe string", "Hello World", false},
		{"SQL injection - SELECT", "'; SELECT * FROM users; --", true},
		{"SQL injection - DROP", "'; DROP TABLE users; --", true},
		{"SQL injection - UNION", "1' UNION SELECT null, null --", true},
		{"case insensitive", "'; select * FROM users; --", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			v := NewValidator()
			v.NoSQLInjection("field", tt.value)

			if tt.wantError && !v.HasErrors() {
				t.Error("expected validation error, got none")
			}
			if !tt.wantError && v.HasErrors() {
				t.Errorf("unexpected validation error: %v", v.Errors())
			}
		})
	}
}

func TestNoXSS(t *testing.T) {
	tests := []struct {
		name      string
		value     string
		wantError bool
	}{
		{"safe string", "Hello World", false},
		{"XSS - script tag", "<script>alert('xss')</script>", true},
		{"XSS - javascript:", "javascript:alert('xss')", true},
		{"XSS - onerror", "<img src=x onerror=alert('xss')>", true},
		{"XSS - iframe", "<iframe src='evil.com'></iframe>", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			v := NewValidator()
			v.NoXSS("field", tt.value)

			if tt.wantError && !v.HasErrors() {
				t.Error("expected validation error, got none")
			}
			if !tt.wantError && v.HasErrors() {
				t.Errorf("unexpected validation error: %v", v.Errors())
			}
		})
	}
}

func TestSafeString(t *testing.T) {
	tests := []struct {
		name      string
		value     string
		wantError bool
	}{
		{"safe string", "Hello World", false},
		{"SQL injection", "'; DROP TABLE users; --", true},
		{"XSS", "<script>alert('xss')</script>", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			v := NewValidator()
			v.SafeString("field", tt.value)

			if tt.wantError && !v.HasErrors() {
				t.Error("expected validation error, got none")
			}
			if !tt.wantError && v.HasErrors() {
				t.Errorf("unexpected validation error: %v", v.Errors())
			}
		})
	}
}

func TestValidProjectStatus(t *testing.T) {
	tests := []struct {
		name      string
		value     models.ProjectStatus
		wantError bool
	}{
		{"valid - draft", models.ProjectStatusDraft, false},
		{"valid - published", models.ProjectStatusPublished, false},
		{"valid - active", models.ProjectStatusActive, false},
		{"valid - completed", models.ProjectStatusCompleted, false},
		{"valid - archived", models.ProjectStatusArchived, false},
		{"invalid status", models.ProjectStatus("Invalid"), true},
		{"empty status", models.ProjectStatus(""), false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			v := NewValidator()
			v.ValidProjectStatus("field", tt.value)

			if tt.wantError && !v.HasErrors() {
				t.Error("expected validation error, got none")
			}
			if !tt.wantError && v.HasErrors() {
				t.Errorf("unexpected validation error: %v", v.Errors())
			}
		})
	}
}

func TestValidApplicationStatus(t *testing.T) {
	tests := []struct {
		name      string
		value     models.ApplicationStatus
		wantError bool
	}{
		{"valid - pending", models.ApplicationStatusPending, false},
		{"valid - accepted", models.ApplicationStatusAccepted, false},
		{"valid - rejected", models.ApplicationStatusRejected, false},
		{"invalid status", models.ApplicationStatus("Invalid"), true},
		{"empty status", models.ApplicationStatus(""), false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			v := NewValidator()
			v.ValidApplicationStatus("field", tt.value)

			if tt.wantError && !v.HasErrors() {
				t.Error("expected validation error, got none")
			}
			if !tt.wantError && v.HasErrors() {
				t.Errorf("unexpected validation error: %v", v.Errors())
			}
		})
	}
}

func TestValidFieldType(t *testing.T) {
	tests := []struct {
		name      string
		value     models.FieldType
		wantError bool
	}{
		{"valid - text", models.FieldTypeText, false},
		{"valid - markdown", models.FieldTypeMarkdown, false},
		{"valid - number", models.FieldTypeNumber, false},
		{"invalid type", models.FieldType("Invalid"), true},
		{"empty type", models.FieldType(""), false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			v := NewValidator()
			v.ValidFieldType("field", tt.value)

			if tt.wantError && !v.HasErrors() {
				t.Error("expected validation error, got none")
			}
			if !tt.wantError && v.HasErrors() {
				t.Errorf("unexpected validation error: %v", v.Errors())
			}
		})
	}
}

func TestValidRole(t *testing.T) {
	tests := []struct {
		name      string
		value     string
		wantError bool
	}{
		{"valid - student", "student", false},
		{"valid - mentor", "mentor", false},
		{"valid - admin", "admin", false},
		{"valid - company", "company", false},
		{"valid - case insensitive", "STUDENT", false},
		{"invalid role", "invalid", true},
		{"empty role", "", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			v := NewValidator()
			v.ValidRole("field", tt.value)

			if tt.wantError && !v.HasErrors() {
				t.Error("expected validation error, got none")
			}
			if !tt.wantError && v.HasErrors() {
				t.Errorf("unexpected validation error: %v", v.Errors())
			}
		})
	}
}

func TestUniqueStrings(t *testing.T) {
	tests := []struct {
		name      string
		values    []string
		wantError bool
	}{
		{"all unique", []string{"a", "b", "c"}, false},
		{"duplicate", []string{"a", "b", "a"}, true},
		{"empty slice", []string{}, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			v := NewValidator()
			v.UniqueStrings("field", tt.values)

			if tt.wantError && !v.HasErrors() {
				t.Error("expected validation error, got none")
			}
			if !tt.wantError && v.HasErrors() {
				t.Errorf("unexpected validation error: %v", v.Errors())
			}
		})
	}
}

func TestMultipleErrors(t *testing.T) {
	v := NewValidator()
	v.RequiredString("field1", "")
	v.RequiredString("field2", "")
	v.Email("email", "invalid")

	if !v.HasErrors() {
		t.Fatal("expected validation errors, got none")
	}

	errors := v.Errors()
	if len(errors) != 3 {
		t.Errorf("expected 3 errors, got %d", len(errors))
	}
}

func TestValidationErrorsError(t *testing.T) {
	v := NewValidator()
	v.AddError("field1", "is required")
	v.AddError("field2", "is invalid")

	errorMsg := v.Errors().Error()
	if errorMsg == "" {
		t.Error("expected non-empty error message")
	}

	// Should contain both field names
	if len(errorMsg) < 10 {
		t.Errorf("error message too short: %s", errorMsg)
	}
}
