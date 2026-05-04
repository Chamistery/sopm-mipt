# syntax=docker/dockerfile:1.6
#
# Multi-stage build for the СУПП ВШПИ frontend.
#
# IMPORTANT: build context is the **repository root** (not frontend/web/),
# because `npm run gen:api` reads ../../backend/project-service/swagger.yaml
# via the openapi-ts.config.ts. All paths inside the Dockerfile are therefore
# expressed relative to the repo root.
#
# See root docker-compose.yml — service `web` sets `context: .`.

# --- Stage 1: build the static bundle ----------------------------------------
FROM node:20-alpine AS build

WORKDIR /app

# Install deps first to maximize Docker layer cache reuse.
COPY frontend/web/package.json frontend/web/package-lock.json ./
RUN npm ci

# Copy frontend sources and the swagger schema the codegen depends on.
# Mirroring the repo layout (frontend/web/ + backend/project-service/) keeps
# the relative ../../ path inside openapi-ts.config.ts working.
COPY frontend/web/ ./frontend/web/
COPY backend/project-service/swagger.yaml ./backend/project-service/swagger.yaml

# node_modules already lives at /app — link it into frontend/web/ so the
# project's package scripts (which run from frontend/web/) find it.
RUN ln -sfn /app/node_modules /app/frontend/web/node_modules

WORKDIR /app/frontend/web
RUN npm run gen:api \
 && npm run build

# --- Stage 2: runtime nginx serving the bundle -------------------------------
FROM nginx:1.27-alpine AS runtime

# Replace the stock config with our SPA + API-proxy config.
COPY frontend/web/nginx.conf /etc/nginx/nginx.conf

# Static assets.
COPY --from=build /app/frontend/web/dist /usr/share/nginx/html

EXPOSE 80

# nginx:alpine already sets a sane CMD; keep it explicit for clarity.
CMD ["nginx", "-g", "daemon off;"]
