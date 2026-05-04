# СУПП ВШПИ — фронтенд (React)

React-приложение для системы управления проектным практикумом ВШПИ МФТИ.

## Стек

- **React 18** + **TypeScript** (strict)
- **Vite 5** — dev-server и сборка
- **TanStack Query** — серверное состояние
- **React Router 6** — роутинг
- **Zustand** — клиентский state (auth)
- **Vitest** — unit-тесты
- **Playwright** — e2e
- **Storybook 8** — каталог компонентов
- **@hey-api/openapi-ts** — кодген клиента из `swagger.yaml` бэка

## Быстрый старт

```bash
cd frontend/web
nvm use            # читает .nvmrc → node 20
npm ci
npm run dev        # http://localhost:5173 (proxy → http://localhost:8080)
```

Параллельно поднимите бэк:

```bash
cd backend/project-service
make docker-up
make seed
```

После этого зайдите на `/login`, выберите любого пользователя из списка
(они приходят из `GET /api/users`) и попадёте на дашборд по роли.

## Команды

| Команда              | Что делает                                                            |
| -------------------- | --------------------------------------------------------------------- |
| `npm run dev`        | dev-сервер с HMR                                                      |
| `npm run build`      | production-сборка в `dist/`                                           |
| `npm run preview`    | поднять `dist/` для проверки                                          |
| `npm run lint`       | ESLint                                                                |
| `npm run typecheck`  | `tsc -b --noEmit`                                                     |
| `npm run test`       | Vitest (unit)                                                         |
| `npm run test:watch` | Vitest watch                                                          |
| `npm run e2e`        | Playwright                                                            |
| `npm run storybook`  | Storybook на :6006                                                    |
| `npm run gen:api`    | сгенерировать TS-типы из `../../backend/project-service/swagger.yaml` |
| `npm run ci`         | lint + typecheck + test + build                                       |

## Структура

```
frontend/web/
├── src/
│   ├── api/                 # API client + кодеген (sdk.gen.ts)
│   ├── auth/                # store, RequireAuth, useCurrentUser
│   ├── layout/              # Sidebar, AppShell, RoleSwitcher
│   ├── features/            # одна папка = одна фича
│   │   ├── auth/            # LoginPage
│   │   ├── profile/         # ProfilePage
│   │   ├── student-catalog/ # будет
│   │   ├── student-project/ # будет
│   │   ├── mentor-dashboard/# будет
│   │   ├── coordinator/     # будет
│   │   └── errors/          # NotFoundPage, PlaceholderPage
│   ├── styles/              # tokens.css + global.css
│   ├── test/                # vitest setup
│   ├── main.tsx             # entry
│   └── router.tsx           # роуты
├── e2e/                     # Playwright тесты
├── .storybook/              # Storybook конфиг
├── docs/
│   ├── adr/                 # Architecture Decision Records
│   └── AGENT_PLAYBOOK.md    # как нарезать задачу на агента
└── CLAUDE.md                # конвенции для Claude/агентов в этой папке
```

## Подключение к бэку

Frontend вызывает бэк через `/api` (Vite proxy в dev'е, тот же origin в проде).
Авторизация в dev-режиме — через заголовки `X-User-Id` и `X-User-Role`,
которые `apiClient` подставляет из zustand-store автоматически.

См. [`docs/adr/0002-auth-dev-mode.md`](docs/adr/0002-auth-dev-mode.md).

## Конвенции

См. [`CLAUDE.md`](CLAUDE.md) и [`docs/AGENT_PLAYBOOK.md`](docs/AGENT_PLAYBOOK.md).
