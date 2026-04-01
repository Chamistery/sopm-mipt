.PHONY: help build run docker-up docker-down migrate-up migrate-down clean

help:
	@echo "Available commands:"
	@echo "  make build        - Build the application"
	@echo "  make run          - Run the application"
	@echo "  make docker-up    - Start Docker Compose services"
	@echo "  make docker-down  - Stop Docker Compose services"
	@echo "  make migrate-up   - Apply database migrations"
	@echo "  make migrate-down - Rollback database migrations"
	@echo "  make clean        - Clean build artifacts"

build:
	go build -o server ./cmd/api

run:
	go run ./cmd/api/main.go

docker-up:
	docker-compose up --build -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

migrate-up:
	psql -h localhost -U postgres -d sopm -f migrations/001_create_tables.up.sql

migrate-down:
	psql -h localhost -U postgres -d sopm -f migrations/001_create_tables.down.sql

clean:
	rm -f server
	go clean

test:
	go test -v ./...

lint:
	golangci-lint run
