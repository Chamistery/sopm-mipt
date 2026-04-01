package config

import (
	"os"
	"testing"
)

func TestLoad(t *testing.T) {
	tests := []struct {
		name     string
		envVars  map[string]string
		wantPort string
		wantHost string
		wantDB   string
	}{
		{
			name:     "default values",
			envVars:  map[string]string{},
			wantPort: "8080",
			wantHost: "0.0.0.0",
			wantDB:   "sopm",
		},
		{
			name: "custom values",
			envVars: map[string]string{
				"SERVER_PORT": "3000",
				"SERVER_HOST": "localhost",
				"DB_NAME":     "testdb",
			},
			wantPort: "3000",
			wantHost: "localhost",
			wantDB:   "testdb",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			os.Clearenv()

			for key, value := range tt.envVars {
				_ = os.Setenv(key, value)
			}

			cfg := Load()

			if cfg.Server.Port != tt.wantPort {
				t.Errorf("Load() Server.Port = %v, want %v", cfg.Server.Port, tt.wantPort)
			}

			if cfg.Server.Host != tt.wantHost {
				t.Errorf("Load() Server.Host = %v, want %v", cfg.Server.Host, tt.wantHost)
			}

			if cfg.Database.DBName != tt.wantDB {
				t.Errorf("Load() Database.DBName = %v, want %v", cfg.Database.DBName, tt.wantDB)
			}
		})
	}
}

func TestDatabaseConfig_DSN(t *testing.T) {
	tests := []struct {
		name   string
		config DatabaseConfig
		want   string
	}{
		{
			name: "basic configuration",
			config: DatabaseConfig{
				Host:     "localhost",
				Port:     "5432",
				User:     "postgres",
				Password: "password",
				DBName:   "testdb",
				SSLMode:  "disable",
			},
			want: "host=localhost port=5432 user=postgres password=password dbname=testdb sslmode=disable",
		},
		{
			name: "production configuration",
			config: DatabaseConfig{
				Host:     "db.example.com",
				Port:     "5432",
				User:     "app_user",
				Password: "secure_pass",
				DBName:   "production_db",
				SSLMode:  "require",
			},
			want: "host=db.example.com port=5432 user=app_user password=secure_pass dbname=production_db sslmode=require",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.config.DSN()

			if got != tt.want {
				t.Errorf("DatabaseConfig.DSN() = %v, want %v", got, tt.want)
			}
		})
	}
}

func Test_getEnv(t *testing.T) {
	tests := []struct {
		name         string
		key          string
		defaultValue string
		envValue     string
		want         string
	}{
		{
			name:         "environment variable exists",
			key:          "TEST_VAR",
			defaultValue: "default",
			envValue:     "custom",
			want:         "custom",
		},
		{
			name:         "environment variable does not exist",
			key:          "NONEXISTENT_VAR",
			defaultValue: "default",
			envValue:     "",
			want:         "default",
		},
		{
			name:         "empty default value",
			key:          "ANOTHER_VAR",
			defaultValue: "",
			envValue:     "",
			want:         "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_ = os.Unsetenv(tt.key)

			if tt.envValue != "" {
				_ = os.Setenv(tt.key, tt.envValue)
				defer func() { _ = os.Unsetenv(tt.key) }()
			}

			got := getEnv(tt.key, tt.defaultValue)

			if got != tt.want {
				t.Errorf("getEnv() = %v, want %v", got, tt.want)
			}
		})
	}
}
