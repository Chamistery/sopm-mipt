.PHONY: help build run docker-up docker-down docker-logs migrate-up migrate-down seed clean test lint

help:
	@echo "Available commands:"
	@echo "  make build        - Build the application"
	@echo "  make run          - Run the application locally"
	@echo "  make docker-up    - Start Docker Compose services"
	@echo "  make docker-down  - Stop Docker Compose services"
	@echo "  make docker-logs  - Follow service logs"
	@echo "  make migrate-up   - Apply database migrations"
	@echo "  make migrate-down - Rollback database migrations"
	@echo "  make seed         - Load demo data into database"
	@echo "  make test         - Run tests"
	@echo "  make clean        - Clean build artifacts"

build:
	go build -o server ./cmd/api

run:
	go run ./cmd/api/main.go

docker-up:
	docker compose up --build -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

migrate-up:
	PGPASSWORD=postgres psql -h localhost -p $${POSTGRES_PORT:-5433} -U postgres -d sopm -f migrations/001_create_tables.up.sql

migrate-down:
	PGPASSWORD=postgres psql -h localhost -p $${POSTGRES_PORT:-5433} -U postgres -d sopm -f migrations/001_create_tables.down.sql

seed:
	PGPASSWORD=postgres psql -h localhost -p $${POSTGRES_PORT:-5433} -U postgres -d sopm -f migrations/002_seed_data.sql

clean:
	rm -f server
	go clean

test:
	go test ./...

lint:
	golangci-lint run
