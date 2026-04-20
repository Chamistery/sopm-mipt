# SOPM Project Service

Backend-сервис для полного цикла проектной работы: каталог проектов, распределение студентов по командам, спринты, задачи, командные отчёты, встречи, профили, файлы и уведомления.

## Стек

- Go 1.24
- PostgreSQL 16
- Nginx
- Docker / Docker Compose
- `pgx/v5` для доступа к PostgreSQL

## Что изменилось в версии 2

- Убраны `templates` и динамические поля проектов
- `projects` теперь хранят полную карточку проектной заявки
- Добавлены `teams`, `team_members`, `sprints`, `tasks`, `team_reports`, `sprint_scores`, `meetings`, `user_profiles`, `user_files`
- Добавлен временный auth-context через заголовки `X-User-Id` и `X-User-Role`
- Добавлены API для распределения, Ганта, уведомлений и расширенных профилей

## Структура

```text
.
├── cmd/api/                  # entrypoint и маршруты
├── internal/auth/            # current user context
├── internal/config/          # env-конфиг
├── internal/database/        # pgx pool
├── internal/handlers/        # HTTP handlers
├── internal/httputil/        # парсинг query/path и JSON-ответы
├── internal/middleware/      # logger, cors, auth context
├── internal/models/          # доменные модели
├── internal/repository/      # SQL-доступ к PostgreSQL
├── internal/service/         # бизнес-логика и state transitions
├── migrations/               # полная схема БД
├── docker-compose.yml
├── Dockerfile
├── swagger.yaml
└── README.md
```

## Быстрый старт

### Docker Compose

```bash
make docker-up
```

Сервис будет доступен на `http://localhost:8080`.

### Локальный запуск

1. Поднимите PostgreSQL и создайте базу:

```sql
CREATE DATABASE sopm;
```

2. Примените миграцию:

```bash
make migrate-up
```

3. Настройте переменные окружения:

```bash
export SERVER_PORT=8080
export SERVER_HOST=0.0.0.0
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=postgres
export DB_PASSWORD=postgres
export DB_NAME=sopm
export DB_SSLMODE=disable
export STORAGE_DIR=./storage
export MAX_APPLICATION_CHOICES=5
export MAX_UPLOAD_BYTES=10485760
```

4. Запустите сервис:

```bash
make run
```

## Переменные окружения

| Переменная | Описание | Значение по умолчанию |
|------------|----------|-----------------------|
| `SERVER_PORT` | Порт HTTP сервера | `8080` |
| `SERVER_HOST` | Адрес bind | `0.0.0.0` |
| `DB_HOST` | Хост PostgreSQL | `localhost` |
| `DB_PORT` | Порт PostgreSQL | `5432` |
| `DB_USER` | Пользователь PostgreSQL | `postgres` |
| `DB_PASSWORD` | Пароль PostgreSQL | `postgres` |
| `DB_NAME` | Имя БД | `sopm` |
| `DB_SSLMODE` | SSL режим | `disable` |
| `STORAGE_DIR` | Локальный каталог для файлов | `./storage` |
| `MAX_APPLICATION_CHOICES` | Максимум приоритетов заявок | `5` |
| `MAX_UPLOAD_BYTES` | Лимит файла в байтах | `10485760` |

## Временная авторизация для разработки

Полноценный OAuth пока не подключён. Для проверки прав доступа используйте заголовки:

```http
X-User-Id: 12
X-User-Role: mentor
```

Поддерживаемые роли:

- `student`
- `teamlead`
- `mentor`
- `coordinator`
- `admin`

## Основные группы API

- `GET /health`
- `projects`: `/api/projects`, `/api/projects/{id}`, `/api/projects/{id}/full`, `/api/projects/{id}/applicants`
- `applications`: создание, приглашения, принятие, отклонение, исключение
- `teams`: команды, участники, `GET /api/teams/{id}/gantt`
- `sprints`: одиночное и batch-создание
- `tasks`: CRUD и статусные переходы
- `team-reports` и `sprint-scores`
- `meetings`
- `users`: профиль, команда, файлы, уведомления
- `distribution`: `POST /api/distribution/generate`, `GET /api/distribution/status`

Полная схема запросов и ответов описана в `swagger.yaml`.

## Файлы пользователей

- Поддерживаются только `pdf` и `docx`
- Максимальный размер файла задаётся через `MAX_UPLOAD_BYTES`
- Файлы сохраняются локально через storage-адаптер и индексируются в `user_files`

## Нотификации

Отдельной таблицы `notifications` нет. Блок уведомлений агрегируется на лету из:

- `tasks`
- `applications`
- `meetings`
- `team_reports`
- `projects`

Последнее время просмотра хранится в `user_profiles.notifications_seen_at`.

## Полезные команды

```bash
make build
make run
make test
make docker-up
make docker-down
make docker-logs
make migrate-up
make migrate-down
```

## Тесты

```bash
go test ./...
```

## Swagger / OpenAPI

`swagger.yaml` можно открыть в любом совместимом Swagger UI, например:

```bash
docker run -p 8081:8080 -e SWAGGER_JSON=/swagger.yaml -v "$(pwd)/swagger.yaml:/swagger.yaml" swaggerapi/swagger-ui
```

После запуска UI будет доступен на `http://localhost:8081`.
