/*
 * Bypass-UI логин для Playwright. Записывает persisted-state Zustand-стора
 * `sopm.auth.v1` в localStorage до загрузки страницы — после reload фронт
 * считает, что пользователь уже вошёл, и не редиректит на /login.
 *
 * userId-ы синхронизированы с MSW fixtures (см. src/test/msw/fixtures.ts).
 *
 * Используем initScript на уровне context, чтобы каждый последующий
 * `page.goto()` уже видел auth — иначе RequireAuth дёрнет /login раньше,
 * чем мы успеем добежать до первого assertion.
 */

import type { Page } from '@playwright/test';

export type RoleKey = 'student' | 'teamlead' | 'mentor' | 'coordinator';

export const E2E_USERS: Record<RoleKey, { userId: number; displayName: string }> = {
  student: { userId: 4, displayName: 'Стародубов Алексей' },
  teamlead: { userId: 3, displayName: 'Петров Иван' },
  mentor: { userId: 1, displayName: 'Тимохин Виктор' },
  coordinator: { userId: 2, displayName: 'Кузнецова Анна' },
};

export async function loginAs(page: Page, role: RoleKey): Promise<void> {
  const user = E2E_USERS[role];
  const persisted = JSON.stringify({
    state: { user: { userId: user.userId, role, displayName: user.displayName } },
    version: 0,
  });
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key as string, value as string);
    },
    ['sopm.auth.v1', persisted],
  );
}
