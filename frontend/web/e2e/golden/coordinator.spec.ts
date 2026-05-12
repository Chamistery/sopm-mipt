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

    // 4 статистических карточки — название каждой строкой.
    await expect(page.getByText('Всего проектов')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('На утверждении', { exact: true })).toBeVisible();
    await expect(page.getByText('Активные')).toBeVisible();
    await expect(page.getByText('Завершённые')).toBeVisible();

    // В fixtures один проект «На утверждении» — должен оказаться в блоке
    // «Требует внимания» с кнопкой «Утвердить». Заголовок встречается
    // дважды (виджет нотификаций + section), берём конкретный по id.
    await expect(page.locator('#attention-title')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Утвердить' })).toBeVisible();
  });

  test('/admin/projects редиректит на дашборд (страница удалена)', async ({ page }) => {
    await page.goto('/admin/projects');
    await expect(page).toHaveURL(/\/admin$/, { timeout: 10_000 });
  });
});
