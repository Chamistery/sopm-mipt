import { test, expect } from '@playwright/test';

import { loginAs } from '../utils/login';

/*
 * Golden path для ментора: дашборд → клик по проекту → детали проекта,
 * где должна быть кнопка «Открыть распределение» и линки на Гант команды.
 */

test.describe('mentor golden path', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'mentor');
  });

  test('dashboard lists projects and opens detail page', async ({ page }) => {
    await page.goto('/mentor');

    await expect(page.getByRole('heading', { name: 'Мои проекты' })).toBeVisible({
      timeout: 15_000,
    });

    // Карточка проекта = <Link> на /mentor/projects/:id.
    const card = page.getByRole('link', { name: /СУПП ВШПИ МФТИ/i });
    await expect(card).toBeVisible();
    await card.click();

    await expect(page).toHaveURL(/\/mentor\/projects\/100/);
    await expect(page.getByRole('link', { name: 'Открыть распределение' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Гант команды' }).first()).toBeVisible();
  });
});
