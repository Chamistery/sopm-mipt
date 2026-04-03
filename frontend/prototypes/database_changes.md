# Требования к изменениям базы данных и API

**Проект:** СУПП ВШПИ МФТИ  
**Дата:** 3 апреля 2026  
**От:** Frontend-команда (React)  
**Кому:** Backend-команда (Go / PostgreSQL)

---

## Контекст

Мы разработали интерактивные прототипы UI для ролей: студент, тимлид, ментор. Текущая БД покрывает только этап подачи заявок и распределения по проектам (таблицы `templates`, `projects`, `applications`, `users`). Для отображения контента на страницах необходимо добавить таблицы и API-ручки для: команд, спринтов, задач, отчётов, встреч и расширенных профилей.

Ниже описаны все необходимые изменения.

---

## 1. Новые таблицы

### 1.1 `teams` — Команды проектов

После распределения студенты объединяются в команды внутри проекта. У проекта может быть несколько команд.

```sql
CREATE TABLE teams (
    id              SERIAL PRIMARY KEY,
    project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,          -- "Команда 1", "Команда 2"
    leader_id       INTEGER REFERENCES users(id),   -- тимлид (выбирается командой)
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_teams_project_id ON teams(project_id);
```

### 1.2 `team_members` — Участники команд

Связь many-to-many между `users` и `teams` с указанием функциональной роли в команде.

```sql
CREATE TABLE team_members (
    id              SERIAL PRIMARY KEY,
    team_id         INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_in_team    VARCHAR(100),                   -- "Backend-разработчик", "Аналитик", "Тестировщик"
    joined_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, user_id)
);

CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
```

### 1.3 `sprints` — Спринты (итерации)

Спринты — свойство проекта. У разных проектов разное количество спринтов и разная длительность. Внутри одного проекта все команды на одной итерации.

```sql
CREATE TABLE sprints (
    id              SERIAL PRIMARY KEY,
    project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    number          INTEGER NOT NULL,               -- порядковый номер: 1, 2, 3...
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    status          VARCHAR(50) NOT NULL DEFAULT 'Запланирован',
                    -- Значения: 'Запланирован', 'Активный', 'Завершён'
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, number)
);

CREATE INDEX idx_sprints_project_id ON sprints(project_id);
CREATE INDEX idx_sprints_status ON sprints(status);
```

### 1.4 `tasks` — Задачи

Задачи привязаны к спринту и команде. Создаются студентом (для себя), тимлидом (для любого члена команды) или ментором.

```sql
CREATE TABLE tasks (
    id              SERIAL PRIMARY KEY,
    sprint_id       INTEGER NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
    team_id         INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    assignee_id     INTEGER NOT NULL REFERENCES users(id),       -- исполнитель
    created_by_id   INTEGER NOT NULL REFERENCES users(id),       -- кто создал
    name            VARCHAR(500) NOT NULL,
    description     TEXT,                           -- описание задачи
    status          VARCHAR(50) NOT NULL DEFAULT 'Новая',
                    -- Значения: 'Новая', 'В работе', 'Ревью', 'Готово', 'Истекла'
    hours_estimate  INTEGER DEFAULT 0,              -- плановые часы
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    mr_link         VARCHAR(500),                   -- ссылка на Merge Request
    work_description TEXT,                          -- описание выполненной работы
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tasks_sprint_id ON tasks(sprint_id);
CREATE INDEX idx_tasks_team_id ON tasks(team_id);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);
```

**Бизнес-логика статусов:**
- `Новая` — задача создана, дата начала ещё не наступила
- `В работе` — дата начала наступила, исполнитель работает
- `Ревью` — исполнитель отправил на проверку (после этого задача нередактируема)
- `Готово` — задача выполнена
- `Истекла` — дата окончания прошла, а задача не в статусе "Ревью" или "Готово"

### 1.5 `team_reports` — Командные отчёты по спринтам

Командный отчёт заполняет тимлид. Один отчёт на команду на спринт.

```sql
CREATE TABLE team_reports (
    id              SERIAL PRIMARY KEY,
    sprint_id       INTEGER NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
    team_id         INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    summary         TEXT,                           -- "Что сделано" (общий результат)
    problems        TEXT,                           -- "Проблемы и риски"
    next_plan       TEXT,                           -- "План на следующий спринт"
    status          VARCHAR(50) NOT NULL DEFAULT 'Черновик',
                    -- Значения: 'Черновик', 'Отправлен', 'Проверен'
    mentor_comment  TEXT,                           -- комментарий ментора
    mentor_score    INTEGER CHECK (mentor_score >= 0 AND mentor_score <= 10),
    submitted_at    TIMESTAMP,                      -- когда отправлен на проверку
    reviewed_at     TIMESTAMP,                      -- когда ментор проверил
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sprint_id, team_id)
);

CREATE INDEX idx_team_reports_sprint_id ON team_reports(sprint_id);
CREATE INDEX idx_team_reports_team_id ON team_reports(team_id);
CREATE INDEX idx_team_reports_status ON team_reports(status);
```

### 1.6 `meetings` — Встречи

Встречи привязаны к команде. Назначать может ментор или тимлид.

```sql
CREATE TABLE meetings (
    id              SERIAL PRIMARY KEY,
    team_id         INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    sprint_id       INTEGER REFERENCES sprints(id), -- к какому спринту относится
    title           VARCHAR(500) NOT NULL,           -- тема встречи
    description     TEXT,                            -- повестка
    meeting_date    DATE NOT NULL,
    start_time      TIME NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    conference_link VARCHAR(500),                    -- ссылка на Zoom/Meet
    created_by_id   INTEGER NOT NULL REFERENCES users(id),
    summary         TEXT,                            -- итоги (заполняется после)
    status          VARCHAR(50) NOT NULL DEFAULT 'Запланирована',
                    -- Значения: 'Запланирована', 'Состоялась', 'Отменена'
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_meetings_team_id ON meetings(team_id);
CREATE INDEX idx_meetings_sprint_id ON meetings(sprint_id);
CREATE INDEX idx_meetings_meeting_date ON meetings(meeting_date);
```

### 1.7 `user_profiles` — Расширенные профили

Дополнительная информация о пользователе, которую он заполняет сам. Выделено в отдельную таблицу чтобы не менять `users`.

```sql
CREATE TABLE user_profiles (
    user_id         INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    telegram        VARCHAR(100),
    phone           VARCHAR(50),
    about           TEXT,                           -- "О себе"
    skills          JSONB NOT NULL DEFAULT '[]',    -- ["Python", "Django", "PostgreSQL"]
    links           JSONB NOT NULL DEFAULT '[]',    -- [{"type":"GitHub","url":"https://..."}]
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 1.8 `user_files` — Файлы пользователей

Резюме, сертификаты и другие документы. Изображения не поддерживаются.

```sql
CREATE TABLE user_files (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name       VARCHAR(500) NOT NULL,
    file_size       INTEGER NOT NULL,               -- размер в байтах
    file_type       VARCHAR(50) NOT NULL,            -- "pdf", "docx"
    storage_path    VARCHAR(1000) NOT NULL,           -- путь в хранилище (Яндекс Диск или локально)
    uploaded_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_files_user_id ON user_files(user_id);
```

---

## 2. Изменения существующих таблиц

### 2.1 Таблица `projects` — новые поля

```sql
ALTER TABLE projects ADD COLUMN description TEXT;           -- краткое описание (для каталога)
ALTER TABLE projects ADD COLUMN full_description TEXT;       -- полное описание
ALTER TABLE projects ADD COLUMN technologies JSONB DEFAULT '[]';  -- ["Python","Django","PostgreSQL"]
ALTER TABLE projects ADD COLUMN team_size_min INTEGER DEFAULT 3;
ALTER TABLE projects ADD COLUMN team_size_max INTEGER DEFAULT 5;
ALTER TABLE projects ADD COLUMN min_gpa NUMERIC(3,1);       -- мин. средний балл
ALTER TABLE projects ADD COLUMN min_course INTEGER;          -- мин. курс
ALTER TABLE projects ADD COLUMN edu_result TEXT;             -- образовательный результат
ALTER TABLE projects ADD COLUMN acceptance_criteria TEXT;     -- критерии приёмки
ALTER TABLE projects ADD COLUMN num_teams INTEGER DEFAULT 1; -- количество команд
ALTER TABLE projects ADD COLUMN initiator_name VARCHAR(255); -- название организации-инициатора
```

### 2.2 Таблица `users` — новые поля

```sql
ALTER TABLE users ADD COLUMN middle_name VARCHAR(255);  -- отчество
ALTER TABLE users ADD COLUMN gpa NUMERIC(3,1);          -- средний балл
ALTER TABLE users ADD COLUMN direction VARCHAR(255);     -- "Программная инженерия"
```

---

## 3. Необходимые API-ручки (endpoints)

### 3.1 Команды

| Метод | URL | Описание | Кто вызывает |
|-------|-----|----------|-------------|
| `POST` | `/api/teams` | Создать команду в проекте | Координатор/Админ |
| `GET` | `/api/teams?projectId={id}` | Список команд проекта | Все |
| `GET` | `/api/teams/{id}` | Детали команды (с участниками) | Все |
| `PUT` | `/api/teams/{id}` | Обновить (сменить лидера) | Координатор/Админ |
| `DELETE` | `/api/teams/{id}` | Удалить команду | Координатор/Админ |
| `POST` | `/api/teams/{id}/members` | Добавить участника | Координатор/Ментор |
| `DELETE` | `/api/teams/{teamId}/members/{userId}` | Удалить участника | Координатор/Ментор |

**Ответ `GET /api/teams/{id}`:**
```json
{
  "id": 1,
  "projectId": 1,
  "name": "Команда 1",
  "leader": { "id": 5, "firstName": "Стародубов", "lastName": "А." },
  "members": [
    {
      "userId": 5,
      "firstName": "Стародубов",
      "lastName": "А.",
      "roleInTeam": "Backend-разработчик",
      "isLeader": true
    }
  ],
  "currentSprint": { "id": 2, "number": 2, "startDate": "2025-03-17", "endDate": "2025-04-13" }
}
```

### 3.2 Спринты

| Метод | URL | Описание | Кто вызывает |
|-------|-----|----------|-------------|
| `POST` | `/api/sprints` | Создать спринт(ы) для проекта | Ментор (при создании проекта) |
| `GET` | `/api/sprints?projectId={id}` | Список спринтов проекта | Все |
| `GET` | `/api/sprints/{id}` | Детали спринта | Все |
| `PUT` | `/api/sprints/{id}` | Обновить даты/статус | Ментор |

**Batch-создание спринтов (при создании проекта):**
```
POST /api/sprints/batch
Body: {
  "projectId": 1,
  "sprints": [
    { "number": 1, "startDate": "2025-02-24", "endDate": "2025-03-16" },
    { "number": 2, "startDate": "2025-03-17", "endDate": "2025-04-13" },
    { "number": 3, "startDate": "2025-04-14", "endDate": "2025-05-04" }
  ]
}
```

### 3.3 Задачи

| Метод | URL | Описание | Кто вызывает |
|-------|-----|----------|-------------|
| `POST` | `/api/tasks` | Создать задачу | Студент (себе), Тимлид (любому) |
| `GET` | `/api/tasks?sprintId={id}&teamId={id}` | Задачи спринта команды | Все в команде + Ментор |
| `GET` | `/api/tasks?sprintId={id}&assigneeId={id}` | Задачи пользователя в спринте | Сам пользователь |
| `GET` | `/api/tasks/{id}` | Детали задачи | Все в команде + Ментор |
| `PUT` | `/api/tasks/{id}` | Обновить задачу | Исполнитель, Тимлид |
| `DELETE` | `/api/tasks/{id}` | Удалить задачу | Автор задачи, Тимлид |

**Важные бизнес-правила:**
- Студент может создавать задачи только себе (`assignee_id = текущий user_id`)
- Тимлид может создавать задачи любому члену своей команды
- После перевода в статус `Ревью` задачу нельзя редактировать
- Ментор видит все задачи, но не может их редактировать
- `start_date` и `end_date` задачи должны быть в пределах спринта

**Ответ `GET /api/tasks?sprintId=2&teamId=1`:**
```json
{
  "tasks": [
    {
      "id": 1,
      "sprintId": 2,
      "teamId": 1,
      "assigneeId": 5,
      "assigneeName": "Стародубов А.",
      "createdById": 5,
      "name": "API управления проектами",
      "description": "Реализовать CRUD-операции для проектов",
      "status": "Готово",
      "hoursEstimate": 12,
      "startDate": "2025-03-17",
      "endDate": "2025-03-23",
      "mrLink": "!42",
      "workDescription": "Реализовал REST API с 7 эндпоинтами",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

### 3.4 Командные отчёты

| Метод | URL | Описание | Кто вызывает |
|-------|-----|----------|-------------|
| `POST` | `/api/team-reports` | Создать отчёт (черновик) | Тимлид |
| `GET` | `/api/team-reports?teamId={id}` | Отчёты команды по всем спринтам | Все в команде + Ментор |
| `GET` | `/api/team-reports?teamId={id}&sprintId={id}` | Отчёт за конкретный спринт | Все |
| `PUT` | `/api/team-reports/{id}` | Обновить (черновик/отправить) | Тимлид |
| `PUT` | `/api/team-reports/{id}/review` | Проверить отчёт (оценка + комментарий) | Ментор |

**Тело запроса `PUT /api/team-reports/{id}`:**
```json
{
  "summary": "Реализован модуль авторизации...",
  "problems": "Задержка с VDI-сервером...",
  "nextPlan": "Деплой, модуль оценивания...",
  "status": "Отправлен"
}
```

**Тело запроса `PUT /api/team-reports/{id}/review`:**
```json
{
  "mentorComment": "Хорошая работа. Увеличьте покрытие тестами.",
  "mentorScore": 8
}
```

### 3.5 Встречи

| Метод | URL | Описание | Кто вызывает |
|-------|-----|----------|-------------|
| `POST` | `/api/meetings` | Назначить встречу | Ментор, Тимлид |
| `GET` | `/api/meetings?teamId={id}` | Встречи команды | Все в команде + Ментор |
| `GET` | `/api/meetings?teamId={id}&upcoming=true` | Только предстоящие | Все |
| `PUT` | `/api/meetings/{id}` | Обновить (итоги, отмена) | Ментор, Тимлид |
| `DELETE` | `/api/meetings/{id}` | Удалить встречу | Автор |

**Тело запроса `POST /api/meetings`:**
```json
{
  "teamId": 1,
  "sprintId": 2,
  "title": "Обзор спринта 2",
  "description": "Демо API и макета дашборда. Планирование спринта 3.",
  "meetingDate": "2025-04-01",
  "startTime": "16:00",
  "durationMinutes": 60,
  "conferenceLink": "https://zoom.us/j/..."
}
```

### 3.6 Профили пользователей

| Метод | URL | Описание | Кто вызывает |
|-------|-----|----------|-------------|
| `GET` | `/api/users/{id}/profile` | Получить расширенный профиль | Все |
| `PUT` | `/api/users/{id}/profile` | Обновить профиль | Сам пользователь |
| `POST` | `/api/users/{id}/files` | Загрузить файл (multipart) | Сам пользователь |
| `GET` | `/api/users/{id}/files` | Список файлов | Все |
| `DELETE` | `/api/users/{id}/files/{fileId}` | Удалить файл | Сам пользователь |

**Тело `PUT /api/users/{id}/profile`:**
```json
{
  "telegram": "@starodubov_a",
  "phone": "+7 999 123-45-67",
  "about": "Backend-разработчик, интересуюсь DevOps",
  "skills": ["Python", "Django", "PostgreSQL", "Docker", "REST API"],
  "links": [
    { "type": "GitLab", "url": "https://gitlab.com/starodubov" },
    { "type": "GitHub", "url": "https://github.com/starodubov-a" }
  ]
}
```

### 3.7 Дополнительные ручки для фронтенда

| Метод | URL | Описание | Для чего |
|-------|-----|----------|----------|
| `GET` | `/api/users/{id}/team` | Получить команду пользователя (текущий проект) | Страница "Текущий проект" |
| `GET` | `/api/projects/{id}/full` | Проект + спринты + команды | Дашборд ментора |
| `GET` | `/api/users/{id}/notifications` | Уведомления для блока "Требует внимания" | Дашборд |
| `GET` | `/api/teams/{id}/gantt?sprintId={id}` | Все данные для Ганта (задачи + участники + спринт) | Диаграмма Ганта |

**Ответ `GET /api/teams/{id}/gantt?sprintId=2`:**
```json
{
  "sprint": {
    "id": 2, "number": 2,
    "startDate": "2025-03-17", "endDate": "2025-04-13"
  },
  "members": [
    { "userId": 5, "name": "Стародубов А.", "roleInTeam": "Backend-разработчик", "isLeader": true }
  ],
  "tasks": [
    {
      "id": 1, "assigneeId": 5, "name": "API управления проектами",
      "status": "Готово", "hoursEstimate": 12,
      "startDate": "2025-03-17", "endDate": "2025-03-23",
      "mrLink": "!42", "description": "...", "workDescription": "..."
    }
  ]
}
```

---

## 4. Диаграмма связей (обновлённая)

```
templates (1) ───────── (N) projects
                             │
                  ┌──────────┼──────────┐
                  │          │          │
               (N) sprints  (N) teams  (N) applications
                  │          │
                  │     (N) team_members ──── users
                  │          │
                  ├──── (N) tasks ──────────── users (assignee)
                  │          │
                  ├──── (N) team_reports
                  │
                  └──── (N) meetings

users (1) ──── (1) user_profiles
users (1) ──── (N) user_files
```

---

## 5. Триггеры для новых таблиц

Добавить `updated_at` триггер для всех новых таблиц (по аналогии с существующими):

```sql
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sprints_updated_at BEFORE UPDATE ON sprints
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_reports_updated_at BEFORE UPDATE ON team_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON meetings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 6. Приоритеты реализации

### Этап 1 (критично для MVP)
1. `teams` + `team_members` — без команд ничего не работает после распределения
2. `sprints` — основа для задач и отчётов
3. `tasks` — диаграмма Ганта, основной рабочий инструмент
4. Изменения в `projects` — для каталога проектов студента

### Этап 2 (отчётность)
5. `team_reports` — командные отчёты тимлида + проверка ментором
6. `meetings` — планирование и отслеживание встреч

### Этап 3 (профили)
7. `user_profiles` — расширенные профили
8. `user_files` — загрузка резюме и документов
9. Изменения в `users` — дополнительные поля

---

## 7. Замечания по безопасности и валидации

- **Авторизация:** Каждая ручка должна проверять, что текущий пользователь имеет доступ (студент видит только свою команду, ментор — только свои проекты и т.д.)
- **Валидация дат задач:** `start_date` и `end_date` задачи должны быть в пределах `start_date`/`end_date` спринта
- **Ограничение на файлы:** Только PDF и DOCX, максимум 10 МБ, без изображений
- **Статусные переходы:** Задача не может вернуться из `Ревью` в `В работе`. Отчёт не может вернуться из `Отправлен` в `Черновик`
- **UNIQUE constraints:** Один командный отчёт на команду на спринт. Один участник в одной команде