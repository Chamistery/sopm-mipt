# Top-level Makefile for the СУПП ВШПИ МФТИ system.
#
# Wraps the root docker-compose.yml so contributors don't have to remember the
# flag combinations. The legacy backend/project-service/Makefile is unchanged
# and still useful for backend-only dev.

COMPOSE       ?= docker compose
COMPOSE_FILE  ?= docker-compose.yml
PG_CONTAINER  ?= sopm-postgres
PG_USER       ?= postgres
PG_DB         ?= sopm
SEED_FILE     ?= backend/project-service/seed/seed_demo.sql

.PHONY: help up down restart logs ps build rebuild-web seed config clean

help:  ## Show this help.
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

up:  ## Build images and start the full stack in the background.
	$(COMPOSE) -f $(COMPOSE_FILE) up -d --build

down:  ## Stop and remove containers (volumes preserved).
	$(COMPOSE) -f $(COMPOSE_FILE) down

restart:  ## Restart all services without rebuilding.
	$(COMPOSE) -f $(COMPOSE_FILE) restart

logs:  ## Tail logs from all services.
	$(COMPOSE) -f $(COMPOSE_FILE) logs -f

ps:  ## Show service status.
	$(COMPOSE) -f $(COMPOSE_FILE) ps

build:  ## Build images without starting.
	$(COMPOSE) -f $(COMPOSE_FILE) build

rebuild-web:  ## Rebuild and restart only the frontend container.
	$(COMPOSE) -f $(COMPOSE_FILE) up -d --build web

seed:  ## Apply the seed SQL into the running postgres (no-op if missing).
	@if [ ! -f "$(SEED_FILE)" ]; then \
		echo "seed file $(SEED_FILE) not found — skipping"; \
		exit 0; \
	fi
	docker exec -i $(PG_CONTAINER) psql -U $(PG_USER) -d $(PG_DB) < $(SEED_FILE)

config:  ## Validate the compose file syntax.
	$(COMPOSE) -f $(COMPOSE_FILE) config

clean:  ## Stop containers AND drop the named volumes (DESTRUCTIVE).
	$(COMPOSE) -f $(COMPOSE_FILE) down -v
