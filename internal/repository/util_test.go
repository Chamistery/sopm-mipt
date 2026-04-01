package repository

import (
	"errors"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type mockScanner struct {
	data []interface{}
}

func (m *mockScanner) Scan(dest ...interface{}) error {
	if len(dest) != len(m.data) {
		return errors.New("mismatched scan arguments")
	}
	for i, d := range dest {
		switch v := d.(type) {
		case *int:
			*v = m.data[i].(int)
		case *string:
			*v = m.data[i].(string)
		}
	}
	return nil
}

type mockNoRowsScanner struct{}

func (m *mockNoRowsScanner) Scan(dest ...interface{}) error {
	return pgx.ErrNoRows
}

type mockErrorScanner struct{}

func (m *mockErrorScanner) Scan(dest ...interface{}) error {
	return errors.New("scan error")
}

func TestScanOne(t *testing.T) {
	tests := []struct {
		name       string
		scanner    Scanner
		entityName string
		wantErr    bool
		errMsg     string
	}{
		{
			name: "successful scan",
			scanner: &mockScanner{
				data: []interface{}{1, "test"},
			},
			entityName: "user",
			wantErr:    false,
		},
		{
			name:       "no rows error",
			scanner:    &mockNoRowsScanner{},
			entityName: "user",
			wantErr:    true,
			errMsg:     "user not found",
		},
		{
			name:       "scan error",
			scanner:    &mockErrorScanner{},
			entityName: "user",
			wantErr:    true,
			errMsg:     "failed to scan user: scan error",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var id int
			var name string

			scanFunc := func(s Scanner) error {
				return s.Scan(&id, &name)
			}

			err := ScanOne(tt.scanner, scanFunc, tt.entityName)

			if tt.wantErr {
				if err == nil {
					t.Errorf("ScanOne() error = nil, wantErr %v", tt.wantErr)
					return
				}
				if err.Error() != tt.errMsg {
					t.Errorf("ScanOne() error = %v, want %v", err.Error(), tt.errMsg)
				}
				return
			}

			if err != nil {
				t.Errorf("ScanOne() unexpected error = %v", err)
				return
			}

			if id != 1 || name != "test" {
				t.Errorf("ScanOne() scanned values incorrect: id=%v name=%v", id, name)
			}
		})
	}
}

func TestCheckRowsAffected(t *testing.T) {
	tests := []struct {
		name       string
		tag        pgconn.CommandTag
		entityName string
		wantErr    bool
		errMsg     string
	}{
		{
			name:       "rows affected",
			tag:        pgconn.NewCommandTag("UPDATE 1"),
			entityName: "user",
			wantErr:    false,
		},
		{
			name:       "multiple rows affected",
			tag:        pgconn.NewCommandTag("DELETE 5"),
			entityName: "project",
			wantErr:    false,
		},
		{
			name:       "no rows affected",
			tag:        pgconn.NewCommandTag("UPDATE 0"),
			entityName: "template",
			wantErr:    true,
			errMsg:     "template not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := CheckRowsAffected(tt.tag, tt.entityName)

			if tt.wantErr {
				if err == nil {
					t.Errorf("CheckRowsAffected() error = nil, wantErr %v", tt.wantErr)
					return
				}
				if err.Error() != tt.errMsg {
					t.Errorf("CheckRowsAffected() error = %v, want %v", err.Error(), tt.errMsg)
				}
				return
			}

			if err != nil {
				t.Errorf("CheckRowsAffected() unexpected error = %v", err)
			}
		})
	}
}
