# Agent Playbook

Как нарезать задачи на агентов так, чтобы 4–5 параллельных Claude-агентов
не подрались между собой и выдавали ревьюаемый результат.

## Принципы

1. **Один агент = одна feature-папка.** Границы — `src/features/<feature>/`.
   Если агенту нужно править что-то в `_shared/`, `src/api/client.ts`,
   `src/auth/`, `src/layout/`, `src/styles/tokens.css` — это **отдельный
   маленький PR от тимлид-агента или человека**, никогда не в составе фичи.
2. **Изоляция через git worktree.** Каждый агент работает в `isolation: "worktree"`,
   на своей ветке от свежего `frontend-react`. Никаких параллельных правок
   в одной ветке.
3. **Маленькие PR.** Одна фича — один PR. Ревью большого PR'а агент сам
   не вытянет, человек тоже потонет.
4. **Бриф самодостаточный.** Подагент не видит твою историю общения с
   пользователем. Всё, что ему нужно — клади в текст брифа: путь к
   прототипу, путь к swagger.yaml, контракт ручек, дизайн-токены, конвенции.
5. **Доверяй, но проверяй.** Отчёт агента — это его _намерения_, не факт.
   Открывай diff и читай сам, прежде чем мерж.

## Шаблон брифа агента

```
ЗАДАЧА: <однострочное описание>

КОНТЕКСТ:
- Этот фронт: React 18 + TS strict + Vite + TanStack Query + React Router 6.
- Бэк: Go-сервис по соседству (backend/project-service/), API под /api.
- Прототип, который нужно переписать на React: frontend/prototypes/<file>.html.
- API-контракт: backend/project-service/swagger.yaml, релевантные ручки: <список>.
- Конвенции: web/CLAUDE.md (читать обязательно, особенно «Структура фичи»).

ГРАНИЦЫ:
- Меняй только src/features/<feature>/ и e2e/<feature>.spec.ts.
- НЕ трогай: src/api/client.ts, src/auth/, src/layout/, src/styles/tokens.css.
- Если нужно общее — оставь TODO в коде и опиши в отчёте.

РЕЗУЛЬТАТ ДОЛЖЕН ВКЛЮЧАТЬ:
- Реализованные компоненты с CSS Modules.
- Vitest unit-тесты на бизнес-логику и хуки.
- Playwright e2e тест на golden path фичи.
- Storybook story с loading/empty/error/data.
- Все команды зелёные: npm run lint && npm run typecheck && npm run test && npm run build.

ВНИМАНИЕ:
- Не используй `any` вне тестов.
- Не вызывай fetch напрямую — только apiFetch / сгенерированный SDK.
- Серверное состояние — TanStack Query, не useState+useEffect.
- Статусы задач — кириллица как в БД (см. ADR 0001).
```

## Параллельный запуск (Claude Code, multiple Agent calls)

В одном сообщении я отправляю несколько `Agent` тулзов с разными брифами и
`isolation: "worktree"`. Они стартуют одновременно, каждый в своей копии
репозитория на своей ветке. По завершении я:

1. Открываю diff каждой ветки.
2. Прогоняю их CI скриптом локально.
3. Фиксю стыки/конфликты, если правили общее.
4. Пушу ветки или мержу в `frontend-react`.

## Текущее распределение

| Feature папка      | Прототип                                          | Главные API-ручки                                                                                                 |
| ------------------ | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `student-catalog`  | `student.html`                                    | `GET /api/projects`, `POST /api/applications`                                                                     |
| `student-project`  | `student_assigned.html`, `teamlead_assigned.html` | `GET /api/users/{id}/team`, `GET /api/teams/{id}/gantt`, `POST/PUT /api/tasks/*`, `PUT /api/team-reports/*`       |
| `mentor-dashboard` | `mentor.html`                                     | `GET /api/projects?mentorId=`, `GET /api/projects/{id}/applicants`, `PUT /api/applications/*`, `PUT /api/tasks/*` |
| `coordinator`      | `admin.html`                                      | `POST /api/distribution/generate` (заглушка), `PUT /api/applications/{id}/exclude`                                |

## Что не делегировать агентам

- **Фундамент** (этот проект) — задаёт конвенции для всех остальных.
- **Изменения в `src/api/client.ts`, `src/auth/`, `src/layout/`** — кросс-фичные.
- **Решения о новых deps** — нужен ADR и согласование.
- **Bug bash через несколько фич** — лучше один человек посмотрит весь diff.
