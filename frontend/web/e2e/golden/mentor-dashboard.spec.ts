import { test, expect } from '@playwright/test';

import { loginAs } from '../utils/login';

/*
 * Golden path для нового дашборда ментора (pixel-port из mentor.html).
 *
 *   /mentor
 *      → H1 «Дашборд ментора»
 *      → подзаголовок «Весенний семестр 2025/2026… Программная инженерия»
 *      → CTA «+ Создать проект»
 *      → блок «Требует внимания»
 *      → секция «Мои проекты» + легенда (5 чипов)
 *      → как минимум 2 разных карточки (нормальная активная + draft/опубликован)
 *   → клик по team-row активной карточки → /mentor/teams/:id/gantt
 */

test.describe('mentor dashboard golden path', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'mentor');
  });

  test('renders header, legend, project cards and navigates by team click', async ({ page }) => {
    await page.goto('/mentor');

    await expect(page.getByRole('heading', { level: 1, name: 'Дашборд ментора' })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/Весенний семестр 2025\/2026/)).toBeVisible();
    await expect(page.getByText(/Программная инженерия/)).toBeVisible();
    await expect(page.getByRole('link', { name: /Создать проект/ })).toBeVisible();

    // Легенда — 5 подписей.
    await expect(page.getByText('Проверен')).toBeVisible();
    await expect(page.getByText('Ждёт проверки')).toBeVisible();
    await expect(page.getByText('Не сдан')).toBeVisible();
    await expect(page.getByText('Текущий')).toBeVisible();
    await expect(page.getByText('Будущий')).toBeVisible();

    await expect(page.getByRole('heading', { level: 2, name: 'Мои проекты' })).toBeVisible();

    // Активная карточка СУПП ВШПИ МФТИ
    const activeCard = page
      .locator('[data-project-id="100"]')
      .or(page.getByRole('heading', { level: 3, name: /СУПП ВШПИ МФТИ/i }));
    await expect(activeCard.first()).toBeVisible();

    // Карточка «Опубликован» (без активного спринта/команд) тоже видна
    await expect(
      page.getByRole('heading', { level: 3, name: /AI чат-бот для абитуриентов/i }),
    ).toBeVisible();

    // Клик по team-row активной карточки → /mentor/teams/300 (объединённая
    // страница команды; default-таб — Гант).
    const teamLink = page.locator('a[href="/mentor/teams/300"]');
    await expect(teamLink).toBeVisible();
    await teamLink.click();

    await expect(page).toHaveURL(/\/mentor\/teams\/300(\?.*)?$/);
  });
});
