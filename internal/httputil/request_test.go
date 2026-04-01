package httputil

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestParsePathInt(t *testing.T) {
	tests := []struct {
		name      string
		pathValue string
		key       string
		wantValue int
		wantErr   bool
		errMsg    string
	}{
		{
			name:      "valid integer",
			pathValue: "123",
			key:       "id",
			wantValue: 123,
			wantErr:   false,
		},
		{
			name:      "empty value",
			pathValue: "",
			key:       "id",
			wantValue: 0,
			wantErr:   true,
			errMsg:    "id is required",
		},
		{
			name:      "invalid integer",
			pathValue: "abc",
			key:       "id",
			wantValue: 0,
			wantErr:   true,
			errMsg:    "id must be a valid integer",
		},
		{
			name:      "negative integer",
			pathValue: "-5",
			key:       "id",
			wantValue: -5,
			wantErr:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			req.SetPathValue(tt.key, tt.pathValue)

			got, err := ParsePathInt(req, tt.key)

			if tt.wantErr {
				if err == nil {
					t.Errorf("ParsePathInt() error = nil, wantErr %v", tt.wantErr)
					return
				}
				if err.Error() != tt.errMsg {
					t.Errorf("ParsePathInt() error = %v, want %v", err.Error(), tt.errMsg)
				}
				return
			}

			if err != nil {
				t.Errorf("ParsePathInt() unexpected error = %v", err)
				return
			}

			if got != tt.wantValue {
				t.Errorf("ParsePathInt() = %v, want %v", got, tt.wantValue)
			}
		})
	}
}

func TestParsePathString(t *testing.T) {
	tests := []struct {
		name      string
		pathValue string
		key       string
		wantValue string
		wantErr   bool
		errMsg    string
	}{
		{
			name:      "valid string",
			pathValue: "test-value",
			key:       "id",
			wantValue: "test-value",
			wantErr:   false,
		},
		{
			name:      "empty value",
			pathValue: "",
			key:       "id",
			wantValue: "",
			wantErr:   true,
			errMsg:    "id is required",
		},
		{
			name:      "string with spaces",
			pathValue: "test value",
			key:       "id",
			wantValue: "test value",
			wantErr:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			req.SetPathValue(tt.key, tt.pathValue)

			got, err := ParsePathString(req, tt.key)

			if tt.wantErr {
				if err == nil {
					t.Errorf("ParsePathString() error = nil, wantErr %v", tt.wantErr)
					return
				}
				if err.Error() != tt.errMsg {
					t.Errorf("ParsePathString() error = %v, want %v", err.Error(), tt.errMsg)
				}
				return
			}

			if err != nil {
				t.Errorf("ParsePathString() unexpected error = %v", err)
				return
			}

			if got != tt.wantValue {
				t.Errorf("ParsePathString() = %v, want %v", got, tt.wantValue)
			}
		})
	}
}

func TestParseQueryInt(t *testing.T) {
	tests := []struct {
		name         string
		queryParam   string
		queryValue   string
		key          string
		defaultValue int
		want         int
	}{
		{
			name:         "valid integer",
			queryParam:   "limit",
			queryValue:   "50",
			key:          "limit",
			defaultValue: 10,
			want:         50,
		},
		{
			name:         "empty value returns default",
			queryParam:   "",
			queryValue:   "",
			key:          "limit",
			defaultValue: 10,
			want:         10,
		},
		{
			name:         "invalid integer returns default",
			queryParam:   "limit",
			queryValue:   "abc",
			key:          "limit",
			defaultValue: 10,
			want:         10,
		},
		{
			name:         "zero value",
			queryParam:   "offset",
			queryValue:   "0",
			key:          "offset",
			defaultValue: 5,
			want:         0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			url := "/test"
			if tt.queryParam != "" {
				url += "?" + tt.queryParam + "=" + tt.queryValue
			}
			req := httptest.NewRequest(http.MethodGet, url, nil)

			got := ParseQueryInt(req, tt.key, tt.defaultValue)

			if got != tt.want {
				t.Errorf("ParseQueryInt() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestParseQueryString(t *testing.T) {
	tests := []struct {
		name        string
		queryParam  string
		queryValue  string
		key         string
		want        string
	}{
		{
			name:        "valid string",
			queryParam:  "company",
			queryValue:  "Яндекс",
			key:         "company",
			want:        "Яндекс",
		},
		{
			name:        "empty value",
			queryParam:  "",
			queryValue:  "",
			key:         "company",
			want:        "",
		},
		{
			name:        "missing parameter",
			queryParam:  "other",
			queryValue:  "value",
			key:         "company",
			want:        "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			url := "/test"
			if tt.queryParam != "" {
				url += "?" + tt.queryParam + "=" + tt.queryValue
			}
			req := httptest.NewRequest(http.MethodGet, url, nil)

			got := ParseQueryString(req, tt.key)

			if got != tt.want {
				t.Errorf("ParseQueryString() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestValidationError_Error(t *testing.T) {
	tests := []struct {
		name  string
		field string
		msg   string
		want  string
	}{
		{
			name:  "basic error",
			field: "id",
			msg:   "is required",
			want:  "id is required",
		},
		{
			name:  "validation error",
			field: "email",
			msg:   "must be valid",
			want:  "email must be valid",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := &ValidationError{
				Field:   tt.field,
				Message: tt.msg,
			}

			got := err.Error()

			if got != tt.want {
				t.Errorf("ValidationError.Error() = %v, want %v", got, tt.want)
			}
		})
	}
}
