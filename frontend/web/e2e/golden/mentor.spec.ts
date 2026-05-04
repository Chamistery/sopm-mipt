import { test, expect } from '@playwright/test';

import { loginAs } from '../utils/login';

/*
 * Legacy «mentor golden path» — раньше тестировал переход на ProjectDetailPage.
 * После rewrite дашборда ментора (pixel-port из mentor.html) детальная
 * страница проекта больше не достижима с дашборда: ментор кликает сразу на
 * команду или на «ожидает запуска».
 *
 * Новый golden — `mentor-dashboard.spec.ts`. Этот файл оставлен как
 * smoke-test заголовка, чтобы поломки страницы дашборда были видны в
 * двух местах.
 */

test.describe('mentor dashboard smoke', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'mentor');
  });

  test('dashboard heading is visible', async ({ page }) => {
    await page.goto('/mentor');

    await expect(page.getByRole('heading', { level: 1, name: 'Дашборд ментора' })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('link', { name: /Создать проект/ })).toBeVisible();
  });
});
