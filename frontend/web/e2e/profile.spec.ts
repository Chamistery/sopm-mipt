import { test, expect } from '@playwright/test';

/*
 * Smoke E2E: страница /profile.
 *
 * Без бэка не можем войти; проверяем минимум — неавторизованный заход
 * редиректит на /login и страница логина рендерится. Остальные сценарии
 * (загрузка/удаление файла) добавим после того, как поднимем мок-бэк
 * через MSW в Playwright (см. e2e/login.spec.ts).
 */
test('unauthenticated user lands on /login when going to /profile', async ({ page }) => {
  await page.goto('/profile');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Система управления/i);
});
