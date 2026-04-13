# Требования к изменениям базы данных и API

**Проект:** СУПП ВШПИ МФТИ  
**Дата:** 9 апреля 2026 (обновлено)  
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

Задачи привязаны к спринту и команде. Создаются студентом (для себя) или тимлидом (для любого члена команды). Каждая задача проходит аппрув ментора перед началом работы.

```sql
CREATE TABLE tasks (
    id              SERIAL PRIMARY KEY,
    sprint_id       INTEGER NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
    team_id         INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    assignee_id     INTEGER NOT NULL REFERENCES users(id),       -- исполнитель
    created_by_id   INTEGER NOT NULL REFERENCES users(id),       -- кто создал
    name            VARCHAR(500) NOT NULL,
    description     TEXT,                           -- описание задачи
    status          VARCHAR(50) NOT NULL DEFAULT 'Ожидает аппрува',
                    -- Значения: 'Ожидает аппрува', 'Назначена', 'Отклонена',
                    --           'В работе', 'На ревью', 'Возвращена', 'Готово'
    status_changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    -- Обновляется триггером при каждой смене status (для уведомлений)
    was_overdue     BOOLEAN NOT NULL DEFAULT FALSE, -- флаг: задача была просрочена
    hours_estimate  INTEGER DEFAULT 0,              -- плановые часы
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    mr_link         VARCHAR(500),                   -- ссылка на Merge Request
    work_description TEXT,                          -- описание выполненной работы
    mentor_comments JSONB NOT NULL DEFAULT '[]',     -- [{"action":"Аппрув","text":"..."}, ...]
                    -- Действия: 'Аппрув', 'Отклонение', 'Принятие', 'Возврат'
    history         JSONB NOT NULL DEFAULT '[]',     -- [{"day":5,"event":"review"}, ...]
                    -- События: 'review', 'returned', 'accepted'
                    -- day — номер дня от начала спринта. Вертикальные линии на баре Ганта
    deleted_at      TIMESTAMP,                      -- soft-delete: студент отменил задачу до аппрува
    deleted_by_id   INTEGER REFERENCES users(id),   -- кто отменил
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tasks_sprint_id ON tasks(sprint_id);
CREATE INDEX idx_tasks_team_id ON tasks(team_id);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);
```

**Бизнес-логика статусов:**
- `Ожидает аппрува` — задача создана студентом/тимлидом, ждёт подтверждения ментора
- `Назначена` — ментор аппрувил задачу, дата начала ещё не наступила
- `Отклонена` — ментор отклонил задачу (с комментарием в `mentor_comments`). Финальный статус. Не отображается на Ганте
- `В работе` — дата начала наступила (автоматически из "Назначена")
- `На ревью` — исполнитель отправил на проверку ментору
- `Возвращена` — ментор вернул задачу с ревью (с комментарием в `mentor_comments`). Студент может доработать
- `Готово` — ментор принял задачу. Финальный статус

**Отмена задачи:**
- Студент/тимлид может отменить задачу, пока она в статусе "Ожидает аппрува" (до аппрува ментора)
- После аппрува задача становится постоянной и не может быть отменена

**Флаг `was_overdue`:**
- Устанавливается в `TRUE` если `end_date` прошла, а статус не "На ревью" / "Готово"
- Сохраняется навсегда, даже если задача позже завершена
- Используется для визуального выделения (красная обводка статуса)

**Допустимые переходы (задача создаётся сразу в статусе "Ожидает аппрува"):**
```
Ожидает аппрува → Назначена (ментор аппрувил)
Ожидает аппрува → Отклонена (ментор отклонил, с комментарием)
Ожидает аппрува → [удалена] (студент/тимлид отменил задачу до аппрува)
Назначена → В работе (автоматически при наступлении start_date)
В работе → На ревью (студент отправил)
На ревью → Готово (ментор принял)
На ревью → Возвращена (ментор вернул, с комментарием)
Возвращена → На ревью (студент отправил повторно)
```

### 1.5 `team_reports` — Командные отчёты по спринтам

Командный отчёт заполняет тимлид. Один отчёт на команду на спринт. Оценка команде не ставится — ментор оценивает каждого участника индивидуально (см. `sprint_scores`).

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
    mentor_comment  TEXT,                           -- комментарий ментора к отчёту
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

### 1.5.1 `sprint_scores` — Индивидуальные оценки за спринт

Ментор оценивает каждого участника команды отдельно по итогам спринта.

```sql
CREATE TABLE sprint_scores (
    id              SERIAL PRIMARY KEY,
    sprint_id       INTEGER NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
    team_id         INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    student_id      INTEGER NOT NULL REFERENCES users(id),
    score           INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
    comment         TEXT,                           -- комментарий ментора к оценке
    scored_by_id    INTEGER NOT NULL REFERENCES users(id), -- кто поставил (ментор)
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sprint_id, student_id)
);

CREATE INDEX idx_sprint_scores_sprint_id ON sprint_scores(sprint_id);
CREATE INDEX idx_sprint_scores_student_id ON sprint_scores(student_id);
CREATE INDEX idx_sprint_scores_team_id ON sprint_scores(team_id);
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
    mentor_confirmed BOOLEAN,                        -- NULL = ожидает, TRUE = подтверждена, FALSE = отклонена
    mentor_decline_reason TEXT,                       -- причина отклонения (если отклонена)
    confirmed_at    TIMESTAMP,                       -- когда ментор подтвердил/отклонил (для уведомлений)
    summary         TEXT,                            -- итоги (заполняется после)
    status          VARCHAR(50) NOT NULL DEFAULT 'Ожидает подтверждения',
                    -- Значения: 'Ожидает подтверждения', 'Подтверждена', 'Отклонена', 'Состоялась', 'Отменена'
                    -- Если встречу создал ментор — сразу 'Подтверждена'
                    -- Если создал тимлид — 'Ожидает подтверждения' пока ментор не подтвердит
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
    notifications_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    -- Последний просмотр уведомлений. События с timestamp > этого значения = непрочитанные
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

### 2.0 Удалить таблицу `templates`

Шаблоны проектов больше не используются. Все поля заявки хранятся как отдельные колонки в `projects`.

```sql
-- Сначала убрать FK из projects
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_template_id_fkey;
DROP TABLE IF EXISTS templates;
```

### 2.1 Таблица `projects` — изменения

**Удалить поля:**
```sql
ALTER TABLE projects DROP COLUMN IF EXISTS template_id;    -- шаблоны убраны
ALTER TABLE projects DROP COLUMN IF EXISTS field_values;   -- данные теперь в колонках
ALTER TABLE projects DROP COLUMN IF EXISTS max_slots;      -- вычисляется: num_teams × team_size_max
ALTER TABLE projects DROP COLUMN IF EXISTS creator_id;     -- не нужен, есть mentor_id
```

**Переименовать/изменить:**
```sql
-- course → courses (массив допустимых курсов, например {1, 4})
ALTER TABLE projects DROP COLUMN IF EXISTS course;
ALTER TABLE projects ADD COLUMN courses INTEGER[] DEFAULT '{}';  -- [1, 2, 4]
```

**Добавить поля (данные заявки — из Приложения 1 Положения):**
```sql
ALTER TABLE projects ADD COLUMN description TEXT;              -- краткое описание (для каталога)
ALTER TABLE projects ADD COLUMN full_description TEXT;          -- полное описание (до 2 стр.)
ALTER TABLE projects ADD COLUMN technologies JSONB DEFAULT '[]'; -- ["Python","Django","PostgreSQL"]
ALTER TABLE projects ADD COLUMN team_size_min INTEGER DEFAULT 3; -- мин. число студентов в команде
ALTER TABLE projects ADD COLUMN team_size_max INTEGER DEFAULT 5; -- макс. число студентов в команде
ALTER TABLE projects ADD COLUMN num_teams INTEGER DEFAULT 1;    -- количество команд
ALTER TABLE projects ADD COLUMN min_gpa NUMERIC(3,1);          -- мин. средний балл
ALTER TABLE projects ADD COLUMN edu_result TEXT;                -- образовательный результат
ALTER TABLE projects ADD COLUMN acceptance_criteria TEXT;        -- критерии приёмки
ALTER TABLE projects ADD COLUMN goal TEXT;                      -- цель проекта
ALTER TABLE projects ADD COLUMN expected_result TEXT;           -- ожидаемый результат (продукт)
ALTER TABLE projects ADD COLUMN competencies TEXT;              -- требования к компетенциям
ALTER TABLE projects ADD COLUMN resources TEXT;                 -- ресурсы, предоставляемые инициатором
ALTER TABLE projects ADD COLUMN duration_semesters INTEGER DEFAULT 1; -- срок реализации (в семестрах)
ALTER TABLE projects ADD COLUMN submitted_at TIMESTAMP;              -- когда заявка отправлена координатору (для уведомлений)
```

**Итоговая структура `projects` после изменений:**
```sql
-- Остаются из существующей таблицы:
--   id SERIAL PK, title, status, mentor_id, company, created_at, updated_at
-- Добавлены:
--   courses, description, full_description, technologies, team_size_min, team_size_max,
--   num_teams, min_gpa, edu_result, acceptance_criteria, goal, expected_result,
--   competencies, resources, duration_semesters
-- Удалены:
--   template_id, field_values, max_slots, creator_id, course

-- Пересоздать индекс:
DROP INDEX IF EXISTS idx_projects_company;
CREATE INDEX idx_projects_company ON projects(company);
CREATE INDEX idx_projects_courses ON projects USING GIN(courses);
```

**Примечание:** Поле `company` остаётся — это организация-инициатор ("МФТИ", "Яндекс", "Т-Банк").

### 2.2 Таблица `applications` — изменения

```sql
-- Приоритет теперь 1-5 (вместо 1-3). Количество задаётся конфигурацией (сейчас 5).
-- Студент обязан указать все 5 приоритетов.
-- После подачи приоритеты блокируются — изменить нельзя.

-- Добавить поля:
ALTER TABLE applications ADD COLUMN team_id INTEGER REFERENCES teams(id);
                    -- Привязка к конкретной команде (при рекомендации/распределении)
ALTER TABLE applications ADD COLUMN status_changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
                    -- Обновляется триггером при смене status (для уведомлений)
ALTER TABLE applications ADD COLUMN invited_at TIMESTAMP;
                    -- Когда ментор нажал ✓ (перевёл в 'Принято ментором')
ALTER TABLE applications ADD COLUMN responded_at TIMESTAMP;
                    -- Когда студент принял или отклонил приглашение

-- Статусы заявки (ДКА):
-- 'Ожидает'                — заявка подана, распределение не запускалось
-- 'Не подходит'            — не проходит по требованиям (курс/балл), внутренний статус
-- 'Не рекомендован'        — студент не находится ни в одной команде
-- 'Рекомендован'           — студент числится в списке конкретной команды (team_id заполнен)
-- 'Принято ментором'       — ментор нажал ✓, студент получил приглашение
-- 'Принят'                 — студент принял приглашение, зафиксирован в команде
-- 'Студент отклонил'       — студент отказался от приглашения (окончательно)
-- 'Авто-отклонено'         — студент принял приглашение в другой проект
-- 'Исключён'               — координатор исключил студента из проекта после принятия

ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_student_id_priority_key;
ALTER TABLE applications ADD CONSTRAINT applications_student_priority_unique UNIQUE(student_id, priority);
ALTER TABLE applications ADD CONSTRAINT applications_priority_range CHECK (priority >= 1 AND priority <= 5);
```

**ДКА статусов заявки:**
```
подал заявку
     ↓
 Ожидает ──────────────────────→ Не подходит (авто, по курсу/баллу)
     │                                │
     │ сервис распределения            │ ментор перетащил в команду
     ↓                                ↓
 Не рекомендован ←──────────── Рекомендован (team_id заполнен)
     │                     ↑          │
     │ ментор перетащил    │          │ ментор нажал ✓
     │ в команду           │          ↓
     └─────────────────────┘   Принято ментором
                                  │          │
                                  ↓          ↓
                              Принят    Студент отклонил (окончательно)
                                  │
                                  │ координатор исключил
                                  ↓
                          Исключён из проекта
```

**Переходы:**
- `Ожидает` → `Не рекомендован` (сервис распределения не поместил в команду)
- `Ожидает` → `Рекомендован` (сервис распределения поместил в команду)
- `Ожидает` → `Не подходит` (автоматически при подаче, если не проходит по требованиям)
- `Не подходит` → `Рекомендован` (ментор вручную перетащил в команду)
- `Не рекомендован` → `Рекомендован` (ментор перетащил в команду)
- `Рекомендован` → `Не рекомендован` (ментор убрал из команды)
- `Рекомендован` → `Принято ментором` (ментор нажал ✓)
- `Принято ментором` → `Принят` (студент принял приглашение)
- `Принято ментором` → `Студент отклонил` (студент отказался, окончательно)
- `Принято ментором` → `Авто-отклонено` (студент принял приглашение в другой проект)
- `Принят` → `Исключён` (координатор исключил)

**Важно:**
- Статус `Не подходит` — внутренний, студенту не отображается
- При принятии приглашения в один проект все остальные заявки этого студента со статусом `Принято ментором` переводятся в `Авто-отклонено`
- Отказ студента окончательный — повторное приглашение невозможно
- `Рекомендован` ↔ `Не рекомендован` — двусторонний переход (ментор перетаскивает туда-обратно)

### 2.3 Таблица `users` — новые поля

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
| `POST` | `/api/teams` | Создать команду в проекте | Координатор |
| `GET` | `/api/teams?projectId={id}` | Список команд проекта | Все |
| `GET` | `/api/teams/{id}` | Детали команды (с участниками) | Все |
| `PUT` | `/api/teams/{id}` | Обновить (сменить лидера) | Координатор |
| `DELETE` | `/api/teams/{id}` | Удалить команду | Координатор |
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
| `POST` | `/api/tasks` | Создать задачу (статус: Ожидает аппрува) | Студент (себе), Тимлид (любому) |
| `GET` | `/api/tasks?sprintId={id}&teamId={id}` | Задачи спринта команды | Все в команде + Ментор |
| `GET` | `/api/tasks?sprintId={id}&assigneeId={id}` | Задачи пользователя в спринте | Сам пользователь |
| `GET` | `/api/tasks/{id}` | Детали задачи | Все в команде + Ментор |
| `PUT` | `/api/tasks/{id}` | Обновить задачу | Исполнитель, Тимлид |
| `PUT` | `/api/tasks/{id}/approve` | Аппрувить задачу (→ Назначена) | Ментор |
| `PUT` | `/api/tasks/{id}/reject` | Отклонить задачу (→ Отклонена) | Ментор |
| `PUT` | `/api/tasks/{id}/submit-review` | Отправить на ревью (→ На ревью) | Исполнитель |
| `PUT` | `/api/tasks/{id}/accept` | Принять задачу (→ Готово) | Ментор |
| `PUT` | `/api/tasks/{id}/return` | Вернуть задачу (→ Возвращена) | Ментор |
| `DELETE` | `/api/tasks/{id}` | Отменить задачу (только в статусе "Ожидает аппрува") | Автор (студент/тимлид, до аппрува) |

**Важные бизнес-правила:**
- Студент может создавать задачи только себе (`assignee_id = текущий user_id`)
- Тимлид может создавать задачи любому члену своей команды
- **Каждая новая задача проходит аппрув ментора** перед началом работы
- Ментор может отклонить задачу (с комментарием в `mentor_comments`)
- После "На ревью" задачу нельзя редактировать; ментор принимает или возвращает
- После "Возвращена" студент может доработать и отправить повторно на ревью
- Ментор видит все задачи, но не может редактировать поля (только менять статус и даты)
- `start_date` и `end_date` задачи — меняет только ментор

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
      "mentorComments": [{"action": "Аппрув", "text": "Задача понятная."}, {"action": "Принятие", "text": "Отличная работа."}],
      "history": [{"day": 5, "event": "review"}, {"day": 6, "event": "accepted"}],
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
  "mentorComment": "Хорошая работа. Увеличьте покрытие тестами."
}
```

### 3.4.1 Индивидуальные оценки за спринт

| Метод | URL | Описание | Кто вызывает |
|-------|-----|----------|-------------|
| `POST` | `/api/sprint-scores` | Поставить оценку студенту за спринт | Ментор |
| `GET` | `/api/sprint-scores?sprintId={id}&teamId={id}` | Оценки всех участников команды за спринт | Ментор, участники команды |
| `GET` | `/api/sprint-scores?studentId={id}` | Все оценки студента (по спринтам) | Студент, Ментор |
| `PUT` | `/api/sprint-scores/{id}` | Изменить оценку | Ментор |

**Тело запроса `POST /api/sprint-scores`:**
```json
{
  "sprintId": 2,
  "teamId": 1,
  "studentId": 5,
  "score": 8,
  "comment": "Отличная работа над API. Хорошее покрытие тестами."
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

### 3.8 Распределение и приглашения

| Метод | URL | Описание | Кто вызывает |
|-------|-----|----------|-------------|
| `GET` | `/api/projects/{id}/applicants` | Все заявки на проект (группировка по приоритету и соответствию требованиям) | Ментор |
| `PUT` | `/api/applications/{id}/recommend` | Переместить студента в команду (→ Рекомендован, указать `teamId`) | Ментор |
| `PUT` | `/api/applications/{id}/unrecommend` | Убрать студента из команды (→ Не рекомендован, очистить `teamId`) | Ментор |
| `PUT` | `/api/applications/{id}/invite` | Пригласить студента (→ Принято ментором, ✓) | Ментор |
| `PUT` | `/api/applications/{id}/accept` | Студент принимает приглашение (→ Принят) | Студент |
| `PUT` | `/api/applications/{id}/decline` | Студент отказывается (→ Студент отклонил, окончательно) | Студент |
| `PUT` | `/api/applications/{id}/exclude` | Исключить из проекта (→ Исключён) | Координатор |
| `POST` | `/api/distribution/generate` | Запустить сервис чернового распределения | Координатор |
| `GET` | `/api/distribution/status` | Статус распределения (не начато/в процессе/завершено) | Координатор |

**Ответ `GET /api/projects/{id}/applicants`:**
```json
{
  "projectId": 1,
  "requirements": { "minCourse": 2, "minGpa": 6.0 },
  "qualified": {
    "priority1": [{"applicationId": 10, "studentId": 5, "name": "Стародубов А.", "course": 2, "gpa": 7.2, "status": "Рекомендован", "teamId": 1}],
    "priority2": [],
    "priority3": [],
    "priority4": [],
    "priority5": []
  },
  "unqualified": {
    "priority1": [],
    "priority2": [{"applicationId": 22, "studentId": 15, "name": "Орлов В.П.", "course": 1, "gpa": 4.8, "status": "Не подходит", "teamId": null}],
    "priority3": [],
    "priority4": [],
    "priority5": []
  },
  "teams": [
    {
      "teamId": 1, "name": "Команда 1", "maxSize": 5,
      "members": [
        {"applicationId": 10, "studentId": 5, "name": "Стародубов А.", "status": "Принят"},
        {"applicationId": 12, "studentId": 7, "name": "Кузнецов М.", "status": "Рекомендован"}
      ]
    }
  ]
}
```

**Бизнес-правила:**
- Ментор видит ВСЕ заявки на свой проект, разбитые на подходящих/не подходящих × 5 приоритетов
- Перетаскивание в команду: `Ожидает`/`Не рекомендован`/`Не подходит` → `Рекомендован` (заполняется `teamId`)
- Перетаскивание из команды: `Рекомендован` → `Не рекомендован` (очищается `teamId`)
- Приглашение (✓): только из `Рекомендован` → `Принято ментором`
- Студент может получить приглашения от нескольких менторов одновременно
- При принятии одного: все `Принято ментором` в других проектах → `Авто-отклонено`
- Отказ студента окончательный
- Исключение: только координатор, только из статуса `Принят`

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
      "mrLink": "!42", "description": "...", "workDescription": "...",
      "mentorComments": [{"action": "Аппрув", "text": "..."}, {"action": "Принятие", "text": "..."}],
      "history": [{"day": 5, "event": "review"}, {"day": 6, "event": "accepted"}]
    }
  ]
}
```

---

## 4. Диаграмма связей (обновлённая)

```
                        projects
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
- **Статусные переходы задач:** Строгий граф переходов (см. раздел 1.4). Задача обязательно проходит аппрув ментора. Возврат с ревью только ментором.
- **Приглашения:** Отказ студента окончательный. При принятии — каскадное отклонение остальных
- **UNIQUE constraints:** Один командный отчёт на команду на спринт. Один участник в одной команде
- **Приоритеты заявок:** количество (сейчас 5) задаётся конфигурацией, CHECK constraint на `priority`

---

## 8. Дополнительные поля для поддержки уведомлений

Отдельной таблицы `notifications` нет. Уведомления формируются запросами из существующих таблиц. Для этого нужны следующие поля:

### 8.1 Таблица `tasks` — дополнительные поля

```sql
ALTER TABLE tasks ADD COLUMN status_changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
    -- Обновляется при каждой смене статуса. Используется для определения "новых" уведомлений.

ALTER TABLE tasks ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE tasks ADD COLUMN deleted_by_id INTEGER REFERENCES users(id);
    -- Soft-delete: при отмене задачи студентом (уведомление #18 для ментора).
    -- Задача не удаляется физически, а помечается deleted_at.
    -- Запрос: WHERE deleted_at IS NOT NULL AND deleted_at > mentor.notifications_seen_at
```

**Запросы для уведомлений:**
- #1 (задача аппрувнута): `WHERE assignee_id=? AND status='Назначена' AND status_changed_at > ?`
- #2 (задача отклонена): `WHERE assignee_id=? AND status='Отклонена' AND status_changed_at > ?`
- #3 (возвращена): `WHERE assignee_id=? AND status='Возвращена' AND status_changed_at > ?`
- #4 (принята): `WHERE assignee_id=? AND status='Готово' AND status_changed_at > ?`
- #5 (назначена тимлидом): `WHERE assignee_id=? AND created_by_id!=assignee_id AND created_at > ?`
- #7 (дедлайн): `WHERE assignee_id=? AND status IN ('В работе') AND end_date - CURRENT_DATE <= 2`
- #16 (на аппрув): `WHERE status='Ожидает аппрува' AND status_changed_at > ?` (по team→project→mentor)
- #17 (на ревью): `WHERE status='На ревью' AND status_changed_at > ?`
- #18 (отменена): `WHERE deleted_at IS NOT NULL AND deleted_at > ?`

### 8.2 Таблица `applications` — дополнительные поля

```sql
ALTER TABLE applications ADD COLUMN status_changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
    -- Обновляется при каждой смене статуса.

ALTER TABLE applications ADD COLUMN invited_at TIMESTAMP;
    -- Когда ментор нажал ✓ (перевёл в 'Принято ментором').

ALTER TABLE applications ADD COLUMN responded_at TIMESTAMP;
    -- Когда студент принял или отклонил приглашение.
```

**Запросы:**
- #6 (приглашение): `WHERE student_id=? AND status='Принято ментором' AND invited_at > ?`
- #19 (принял): `WHERE status='Принят' AND responded_at > ?` (по project→mentor)
- #20 (отклонил): `WHERE status='Студент отклонил' AND responded_at > ?`
- #23 (все приняты): подзапрос: все applications команды в статусе 'Принят'

### 8.3 Таблица `meetings` — дополнительные поля

```sql
ALTER TABLE meetings ADD COLUMN confirmed_at TIMESTAMP;
    -- Когда ментор подтвердил или отклонил встречу.
```

**Запросы:**
- #8 (встреча создана ментором): `WHERE created_by_id=mentor_id AND created_at > ?` (для студентов)
- #10 (подтверждена): `WHERE mentor_confirmed=TRUE AND confirmed_at > ?`
- #11 (отклонена): `WHERE mentor_confirmed=FALSE AND confirmed_at > ?`
- #22 (нет встречи): `WHERE sprint_id=? AND team_id=?` → если 0 строк и до конца спринта <= 7 дней
- #24 (от тимлида): `WHERE created_by_id!=mentor_id AND mentor_confirmed IS NULL`

### 8.4 Таблица `team_reports` — поля достаточны

Существующих полей `submitted_at` и `reviewed_at` достаточно:
- #9 (отчёт проверен): `WHERE reviewed_at > ?`
- #21 (отчёт отправлен): `WHERE submitted_at > ?`

### 8.5 Таблица `projects` — дополнительные поля

```sql
ALTER TABLE projects ADD COLUMN submitted_at TIMESTAMP;
    -- Когда заявка отправлена координатору на утверждение.
```

**Запрос:**
- #25 (новая заявка): `WHERE submitted_at IS NOT NULL AND submitted_at > ?`

### 8.6 Таблица `users` (или `user_profiles`) — дополнительные поля

```sql
ALTER TABLE user_profiles ADD COLUMN notifications_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
    -- Последний момент когда пользователь просмотрел уведомления.
    -- Все события с timestamp > notifications_seen_at считаются непрочитанными.
    -- Обновляется при открытии блока "Требует внимания".
```

### 8.7 Триггер для `status_changed_at`

```sql
-- Для tasks: обновлять status_changed_at при изменении status
CREATE OR REPLACE FUNCTION update_status_changed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status != OLD.status THEN
        NEW.status_changed_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_status_changed
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_status_changed_at();

CREATE TRIGGER applications_status_changed
    BEFORE UPDATE ON applications
    FOR EACH ROW
    EXECUTE FUNCTION update_status_changed_at();
```

---

## 9. Вопросы к обсуждению

1. **Хранение файлов:** Яндекс Диск API или локальный storage?
2. **Уведомления:** Отдельная таблица `notifications` или генерация на лету?
3. **Конфигурация приоритетов:** Хранить макс. число приоритетов (5) в конфиге или в БД?
4. **Алгоритм чернового распределения:** Критерии сортировки в сервисе распределения?
5. **Авторизация:** OAuth МФТИ — как интегрировать?
6. **Формула оценки:** Веса и компоненты будут определены позже