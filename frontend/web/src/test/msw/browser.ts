/*
 * Browser MSW worker — заводится один раз из `main.tsx`, когда
 * `VITE_ENABLE_MSW=true`. Используется для Playwright e2e и для локальной
 * разработки без поднятого бэка (`VITE_ENABLE_MSW=true npm run dev`).
 *
 * ВАЖНО: импорт MSW динамический в main.tsx, чтобы prod-бандл не тянул
 * msw + mockServiceWorker.js.
 */

import { setupWorker } from 'msw/browser';

import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
