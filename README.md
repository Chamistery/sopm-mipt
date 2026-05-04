# СУПП ВШПИ МФТИ

Система управления проектным практикумом Высшей школы программной инженерии МФТИ. Полный цикл: каталог проектов, распределение студентов по командам, спринты, задачи, командные отчёты, встречи, профили, файлы и уведомления.

## Стек

- **Frontend:** React 18 + TypeScript, Vite 5, TanStack Query, React Router 6, Zustand
- **Backend:** Go 1.24, pgx, goqu
- **БД:** PostgreSQL 16
- **Инфраструктура:** Docker Compose, nginx (отдаёт SPA + проксирует API)

## Quickstart (prod-style, всё в одном compose)

Требуется только Docker (с плагином `compose`).

```bash
make up                 # собрать образы и поднять postgres + project-service + web
open http://localhost:8080
```

Поднимет три контейнера:

| Сервис            | Назначение                                                      |
| ----------------- | --------------------------------------------------------------- |
| `sopm-postgres`   | PostgreSQL 16, миграции применяются автоматически на init       |
| `sopm-project-service` | Go API на порту 8080 (внутри docker-сети)                  |
| `sopm-web`        | nginx: SPA на `/`, проксирует `/api` и `/health` на бэкенд       |

Дополнительные команды:

```bash
make ps             # статус сервисов
make logs           # tail всех логов
make rebuild-web    # пересобрать только фронт после изменений в frontend/web
make down           # остановить (данные в volume сохраняются)
make clean          # остановить и удалить volume'ы (ВНИМАНИЕ: уничтожает БД)
make seed           # применить seed-SQL, если он есть
```

Переменные окружения (опционально, заданы дефолты):

- `PORT` — внешний порт для web (по умолчанию `8080`)
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` — креды БД

## Backend-only dev

Для backend-разработки удобнее старый compose, который слушает БД на хосте:

```bash
cd backend/project-service
make docker-up
```

Подробнее — [backend/project-service/README.md](backend/project-service/README.md).

## Frontend dev (Vite)

```bash
cd frontend/web
nvm use            # node 20 из .nvmrc
npm ci
npm run dev        # http://localhost:5173, проксирует /api на :8080
```

Подробнее — [frontend/web/README.md](frontend/web/README.md).

## Структура репозитория

```text
.
├── backend/project-service/     # Go API + миграции + dev compose
├── frontend/
│   ├── web/                     # React-приложение (Vite)
│   │   ├── Dockerfile           # multi-stage build → nginx:alpine
│   │   └── nginx.conf           # SPA + API-proxy конфиг
│   └── prototypes/              # HTML-прототипы и architecture.md
├── docker-compose.yml           # ← prod-style bring-up
├── Makefile                     # ← обёртка над docker compose
└── README.md
```

## Документация

- [Архитектура и стек](frontend/prototypes/architecture.md)
- [API (swagger)](backend/project-service/swagger.yaml)
- [Backend README](backend/project-service/README.md)
- [Frontend README](frontend/web/README.md)
