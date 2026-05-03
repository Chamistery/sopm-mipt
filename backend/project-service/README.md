# SOPM Project Service

Backend-сервис для полного цикла проектной работы: каталог проектов, распределение студентов по командам, спринты, задачи, командные отчёты, встречи, профили, файлы и уведомления.

## Стек

- Go 1.24
- PostgreSQL 16
- Nginx (reverse proxy + rate limiting)
- Docker / Docker Compose
- `pgx/v5` для доступа к PostgreSQL

## Структура

```text
.
├── cmd/api/                  # entrypoint, маршруты, graceful shutdown
├── internal/auth/            # current user context (из заголовков)
├── internal/config/          # env-конфиг
├── internal/database/        # pgx pool
├── internal/handlers/        # HTTP handlers
├── internal/httputil/        # парсинг query/path и JSON-ответы
├── internal/middleware/      # logger, cors, auth context
├── internal/models/          # доменные модели
├── internal/repository/      # SQL-доступ к PostgreSQL
├── internal/service/         # бизнес-логика и state transitions
├── internal/validation/      # валидатор
├── migrations/
│   ├── 001_create_tables.up.sql    # схема БД (10 таблиц)
│   ├── 001_create_tables.down.sql  # откат схемы
│   └── 002_seed_data.sql           # демо-данные для фронтенда
├── docker-compose.yml
├── Dockerfile
├── Makefile
├── nginx.conf
└── swagger.yaml
```

## Быстрый старт

### Docker Compose (рекомендуется)

```bash
cd backend/project-service
make docker-up
```

API будет доступен на `http://localhost:8080`.

Проверка работоспособности:

```bash
curl http://localhost:8080/health
# OK
```

Если порт 8080 занят, задайте другой:

```bash
API_PORT=9090 make docker-up
# API на http://localhost:9090
```

### Загрузка демо-данных

После запуска контейнеров можно загрузить демо-данные (пользователи, проект, команда, спринты, задачи):

```bash
make seed
```

Или напрямую:

```bash
docker exec -i sopm-postgres psql -U postgres -d sopm < migrations/002_seed_data.sql
```

### Остановка

```bash
make docker-down
```

### Локальный запуск (без Docker)

Требуется Go 1.24+ и PostgreSQL 16+.

1. Поднимите PostgreSQL и создайте базу:

```sql
CREATE DATABASE sopm;
```

2. Примените миграцию:

```bash
make migrate-up
```

3. Настройте переменные окружения (или используйте defaults):

```bash
export DB_HOST=localhost DB_PORT=5432 DB_USER=postgres DB_PASSWORD=postgres DB_NAME=sopm
```

4. Запустите:

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
| `STORAGE_DIR` | Каталог для файлов пользователей | `./storage` |
| `MAX_APPLICATION_CHOICES` | Максимум приоритетов заявок | `5` |
| `MAX_UPLOAD_BYTES` | Лимит файла (байт) | `10485760` (10 МБ) |
| `API_PORT` | Порт nginx (docker-compose) | `8080` |
| `POSTGRES_PORT` | Внешний порт PostgreSQL | `5433` |

## Авторизация (dev-режим)

OAuth МФТИ пока не подключён. Текущий пользователь определяется из заголовков:

```http
X-User-Id: 1
X-User-Role: mentor
```

Роли: `student`, `teamlead`, `mentor`, `coordinator`, `admin`

## API Endpoints

### Health
- `GET /health` — проверка работоспособности

### Projects
- `POST /api/projects` — создать проект (mentor/coordinator)
- `GET /api/projects` — список проектов (фильтры: `company`, `course`, `status`, `limit`, `offset`)
- `GET /api/projects/{id}` — детали проекта
- `GET /api/projects/{id}/full` — проект + спринты + команды
- `GET /api/projects/{id}/applicants` — все заявки (для ментора)
- `PUT /api/projects/{id}` — обновить проект
- `DELETE /api/projects/{id}` — удалить проект (coordinator)

### Applications
- `POST /api/applications` — подать заявку (student)
- `GET /api/applications?studentId={id}` — заявки студента
- `GET /api/applications/project?projectId={id}` — заявки на проект
- `GET /api/applications/{id}` — детали заявки
- `PUT /api/applications/{id}/recommend` — рекомендовать в команду (mentor)
- `PUT /api/applications/{id}/unrecommend` — убрать из команды (mentor)
- `PUT /api/applications/{id}/invite` — пригласить (mentor)
- `PUT /api/applications/{id}/accept` — принять приглашение (student)
- `PUT /api/applications/{id}/decline` — отклонить (student, окончательно)
- `PUT /api/applications/{id}/exclude` — исключить (coordinator)
- `DELETE /api/applications/{id}` — удалить заявку

### Teams
- `POST /api/teams` — создать команду (coordinator)
- `GET /api/teams?projectId={id}` — команды проекта
- `GET /api/teams/{id}` — детали команды (с участниками)
- `PUT /api/teams/{id}` — обновить (сменить лидера)
- `DELETE /api/teams/{id}` — удалить
- `POST /api/teams/{id}/members` — добавить участника
- `DELETE /api/teams/{teamId}/members/{userId}` — удалить участника
- `GET /api/teams/{id}/gantt?sprintId={id}` — данные для Ганта

### Sprints
- `POST /api/sprints` — создать спринт (mentor)
- `POST /api/sprints/batch` — batch-создание спринтов
- `GET /api/sprints?projectId={id}` — спринты проекта
- `GET /api/sprints/{id}` — детали спринта
- `PUT /api/sprints/{id}` — обновить

### Tasks
- `POST /api/tasks` — создать задачу (student/teamlead)
- `GET /api/tasks?sprintId={id}&teamId={id}` — задачи команды в спринте
- `GET /api/tasks/{id}` — детали задачи
- `PUT /api/tasks/{id}` — обновить (ограничения по статусу)
- `PUT /api/tasks/{id}/approve` — аппрувить (mentor)
- `PUT /api/tasks/{id}/reject` — отклонить (mentor, комментарий обязателен)
- `PUT /api/tasks/{id}/submit-review` — отправить на ревью (assignee)
- `PUT /api/tasks/{id}/accept` — принять (mentor)
- `PUT /api/tasks/{id}/return` — вернуть (mentor, комментарий обязателен)
- `DELETE /api/tasks/{id}` — отменить (только до аппрува)

### Team Reports
- `POST /api/team-reports` — создать отчёт (teamlead)
- `GET /api/team-reports?teamId={id}` — отчёты команды
- `GET /api/team-reports?teamId={id}&sprintId={id}` — отчёт за спринт
- `PUT /api/team-reports/{id}` — обновить (черновик/отправить)
- `PUT /api/team-reports/{id}/review` — проверить (mentor)

### Sprint Scores
- `POST /api/sprint-scores` — поставить оценку (mentor)
- `GET /api/sprint-scores?sprintId={id}&teamId={id}` — оценки команды за спринт
- `GET /api/sprint-scores?studentId={id}` — оценки студента
- `PUT /api/sprint-scores/{id}` — изменить оценку

### Meetings
- `POST /api/meetings` — создать встречу (mentor/teamlead)
- `GET /api/meetings?teamId={id}` — встречи команды
- `GET /api/meetings?teamId={id}&upcoming=true` — предстоящие
- `PUT /api/meetings/{id}` — обновить (итоги, подтверждение)
- `DELETE /api/meetings/{id}` — удалить

### Users
- `POST /api/users` — создать пользователя
- `GET /api/users` — список всех
- `GET /api/users/{id}` — детали
- `GET /api/users/{id}/team` — команда пользователя
- `GET /api/users/{id}/profile` — расширенный профиль
- `PUT /api/users/{id}/profile` — обновить профиль
- `POST /api/users/{id}/files` — загрузить файл (multipart, только pdf/docx)
- `GET /api/users/{id}/files` — список файлов
- `DELETE /api/users/{id}/files/{fileId}` — удалить файл
- `GET /api/users/{id}/notifications` — уведомления

### Distribution
- `POST /api/distribution/generate` — запустить распределение (coordinator)
- `GET /api/distribution/status` — статус распределения

## Бизнес-правила задач

- Задача создаётся в статусе "Ожидает аппрува"
- Студент может отменить задачу только до аппрува
- Ментор аппрувит/отклоняет (комментарий обязателен при отклонении)
- После аппрува задача автоматически переходит в "В работе" при наступлении start_date
- Студент отправляет на ревью, ментор принимает или возвращает (комментарий обязателен при возврате)
- Просроченные задачи помечаются `wasOverdue=true` (end_date прошла, а задача не на ревью/готово)

## Ограничения редактирования задач по статусу

| Статус | Кто может | Что можно менять |
|--------|-----------|-----------------|
| Ожидает аппрува | Автор | name, description, hours |
| Назначена | Автор/тимлид | name, description, hours. Даты — только ментор |
| В работе | Assignee | workDescription, mrLink. Даты — только ментор |
| Возвращена | Assignee | workDescription, mrLink |
| На ревью / Готово / Отклонена | — | Нередактируема |

## Уведомления

30 типов уведомлений, формируемых на лету из таблиц (без отдельной таблицы notifications). Покрыты все сценарии для студента, тимлида, ментора и координатора. Время последнего просмотра хранится в `user_profiles.notifications_seen_at`.

## Полезные команды

```bash
make help          # список всех команд
make docker-up     # запуск (build + start)
make docker-down   # остановка
make docker-logs   # логи
make seed          # загрузить демо-данные
make test          # тесты
make build         # сборка бинарника
make run           # локальный запуск
make migrate-up    # применить миграции (локальный PostgreSQL)
make migrate-down  # откатить миграции
```

## Тесты

```bash
make test
# или
go test ./...
```
