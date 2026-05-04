import { test, expect } from '@playwright/test';

import { loginAs } from '../utils/login';

/*
 * Golden path для координатора: дашборд /admin (4 stats card + блок «На
 * утверждении» с 1 fixture-проектом в статусе «На утверждении»), переход
 * на /admin/projects (таблица).
 */

test.describe('coordinator golden path', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'coordinator');
  });

  test('dashboard renders stats grid and pending-projects block', async ({ page }) => {
    await page.goto('/admin');

    await expect(page.getByRole('heading', { name: 'Координация практикума' })).toBeVisible({
      timeout: 15_000,
    });

    // 4 статистических карточки — название каждой строкой.
    await expect(page.getByText('Всего проектов')).toBeVisible();
    await expect(page.getByText('На утверждении', { exact: true })).toBeVisible();
    await expect(page.getByText('Активные')).toBeVisible();
    await expect(page.getByText('Завершённые')).toBeVisible();

    // В fixtures один проект «На утверждении» — должен оказаться в блоке
    // «Требует внимания» с кнопкой «Утвердить». Заголовок встречается
    // дважды (виджет нотификаций + section), берём конкретный по id.
    await expect(page.locator('#attention-title')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Утвердить' })).toBeVisible();
  });

  test('projects table is reachable from the dashboard', async ({ page }) => {
    await page.goto('/admin');
    await page.getByRole('link', { name: 'Проекты' }).first().click();
    await expect(page).toHaveURL(/\/admin\/projects/);
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10_000 });
  });
});
