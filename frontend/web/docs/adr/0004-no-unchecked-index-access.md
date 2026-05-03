# ADR 0004 — Отключаем `noUncheckedIndexedAccess`

**Дата:** 2026-05-03
**Статус:** Принято

## Контекст

Изначально (ADR 0003 и фундамент) включили `noUncheckedIndexedAccess: true`
ради ловли out-of-bounds на массивах и неизвестных ключей в `Record`.

На практике после первой волны feature-агентов выяснилось, что флаг почти
всегда срабатывает не на тех случаях, где он полезен:

- **CSS Modules.** Vite типизирует `*.module.css` как `Record<string, string>`.
  С флагом каждый `styles.foo` становится `string | undefined`. Это значит
  любой `Record<Status, string> = { Foo: styles.foo, ... }` падает с TS2322.
- **Status → className маппинги.** Паттерн `const X: Record<Status, string>`
  встречается во ВСЕХ фичах (StatusBadge, ProjectRow, StatsCard, …).
  Каждое обращение требует `?? ''` или `as string` boilerplate.
- **TanStack Query keys.** `['user', userId, 'profile']` индексируется
  внутренне; для нашего кода это не проблема, но любые helper'ы кеша
  страдают.

Реальная польза флага (`arr[0].x` без проверки на пустой массив) — нечастый
случай, и его легко поймать локально (`if (!item) return`, `at(0)`,
optional chaining).

## Решение

Выключить `noUncheckedIndexedAccess` в `tsconfig.app.json`. Все остальные
strict-флаги остаются включёнными.

## Последствия

- Никаких `?? ''` boilerplate в feature-коде.
- Сохраняется `strictNullChecks`, `noImplicitAny`, `strict` — основа
  безопасности.
- Программист сам отвечает за проверку границ массивов в hot paths
  (тесты + ревью).

## Альтернативы

- _Оставить флаг + переопределить тип CSS modules._ Не работает: любой
  `Record<X, string>` всё равно даёт `string | undefined` на доступ.
- _Каждое значение оборачивать `as string` / `?? ''`._ Захламляет код,
  снижает читаемость, не спасает от настоящих out-of-bounds.
- _Включить флаг только для отдельных файлов через комменты._ TypeScript
  не поддерживает per-file конфигурацию strict-флагов.
