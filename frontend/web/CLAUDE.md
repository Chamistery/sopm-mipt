# CLAUDE.md — конвенции для агентов в `frontend/web/`

Этот файл загружается автоматически в контекст Claude / Claude Code при работе
в этой папке. Если ты агент — прочитай его целиком прежде чем что-то менять.

## Что это за проект

React-фронт системы управления проектным практикумом ВШПИ МФТИ. Бэк — Go-сервис
в `backend/project-service/` того же репо. Контракт API живёт в `swagger.yaml`
бэка, типы клиента генерятся из него командой `npm run gen:api`.

Прототипы UI на vanilla HTML лежат в `frontend/prototypes/` — это **визуальный
референс**, на него опираются компоненты при переносе. Ничего из `prototypes/`
не импортируется в React-код.

## Что НЕ менять без ADR

- **Стек** (React, Vite, TanStack Query, React Router, Zustand). Замена любой
  библиотеки — отдельный PR с ADR в `docs/adr/`.
- **Дизайн-токены** в `src/styles/tokens.css`. Это МФТИ-айдентика, выверенная
  на прототипах. Новые цвета/размеры — добавляй, существующие — не трогай.
- **Унификация моделей с бэком**: статусы по-русски, ID числовые, даты ISO.
  См. ADR 0001.
- **Структура папок** `src/features/<feature>/`. Не плодить shared/utils/helpers.

## Стиль кода

- TypeScript **strict**, без `any` (только в тестах допустимо).
- Импорты типов через `import type` (включено в ESLint).
- Алиас `@/` указывает на `src/`. Используй его, не `../../../`.
- Пиши именованные экспорты, не `default`. Исключение — entrypoints (`main.tsx`).
- Компоненты — функции с явным `JSX.Element` возвратом.
- CSS Modules для компонент-скоупа (`Foo.module.css`), глобальное — только в
  `src/styles/`.
- Никаких комментариев «что делает код». Только зачем и почему, если неочевидно.

## Работа с API

- Не вызывай `fetch` напрямую — только через `apiFetch` из `src/api/client.ts`
  или сгенерированный SDK (`src/api/sdk.gen.ts`).
- Для серверного состояния — TanStack Query (`useQuery`, `useMutation`).
  `useState + useEffect + fetch` для серверных данных — **запрещено**.
- Ключи запросов — массивы вида `['user', userId, 'profile']`. Сущность,
  затем ID, затем под-ресурс.
- При мутации инвалидируй или patchaй кэш через `setQueryData` / `invalidateQueries`.

## Тесты

- Каждый новый компонент/хук — Vitest unit-тест в том же фолдере (`Foo.test.tsx`).
- Каждая страница — Playwright e2e в `e2e/<feature>.spec.ts`.
- Каждый компонент с состоянием — Storybook story (`Foo.stories.tsx`) минимум
  с loading / empty / error / data состояниями.
- CI красный = PR не мержится. Локально перед коммитом: `npm run ci`.

## Структура фичи

```
src/features/<feature>/
├── <Feature>Page.tsx        # главный компонент-страница
├── <Feature>Page.module.css
├── <Feature>Page.test.tsx
├── components/              # вложенные компоненты этой фичи
│   ├── Card.tsx
│   ├── Card.module.css
│   ├── Card.test.tsx
│   └── Card.stories.tsx
├── hooks/                   # фичи-специфичные хуки запросов
│   └── useFeatureData.ts
└── index.ts                 # public API фичи (что экспортит наружу)
```

## Что можно делать без согласования

- Добавлять новые фичи в `src/features/`.
- Расширять `src/api/*.ts` хелперами под существующие endpoint'ы.
- Добавлять Storybook стори, тесты, компоненты в свою фичу.
- Чинить баги в своей фиче.

## Что требует согласования (ADR + явного «ок» от пользователя)

- Поменять что-то в `src/api/client.ts`, `src/auth/`, `src/layout/`,
  `src/styles/tokens.css`, `src/router.tsx`.
- Добавить новую runtime-зависимость в `package.json`.
- Поменять имена/контракты публичных функций (export-нутые из фичи).
- Поменять roles/router/redirect-by-role.

## Чек-лист перед "готово"

- [ ] `npm run lint` — зелёный
- [ ] `npm run typecheck` — зелёный
- [ ] `npm run test` — зелёный
- [ ] `npm run build` — зелёный
- [ ] Новые компоненты — есть Storybook story
- [ ] Новые страницы — есть Playwright e2e
- [ ] CSS — через CSS Modules, без inline `style` (кроме placeholder/dev-страниц)
- [ ] Никаких `console.log` в коде (только `console.warn/error` где это осознанно)
- [ ] Никаких `any` в `src/` вне тестов
