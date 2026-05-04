import { test, expect } from '@playwright/test';

import { loginAs } from '../utils/login';

/*
 * Golden path для ментора в режиме Гант-ревью на объединённой
 * странице команды: переход на /mentor/teams/300?tab=gantt → видит
 * Гант c режимом mentor → кликает по задаче «Аналитика flow
 * распределения» (статус «Ожидает аппрува») → жмёт «Аппрувить» в
 * попапе → MSW в ответ меняет статус на «Назначена», query
 * инвалидируется и в таблице «к разбору» задача больше не висит.
 *
 * Команда 300 / спринт 201 (Активный) — см. fixtures.ts.
 */

test.describe('mentor gantt golden path', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'mentor');
  });

  test('mentor opens gantt, approves a pending-approval task via popup', async ({ page }) => {
    await page.goto('/mentor/teams/300?tab=gantt&sprintId=201');

    // Шапка — H1 = название команды
    await expect(page.getByRole('heading', { level: 1, name: /Команда/ })).toBeVisible({
      timeout: 15_000,
    });

    // Гант реально отрендерился — есть aria-label="Диаграмма Ганта"
    const gantt = page.getByRole('region', { name: 'Диаграмма Ганта' });
    await expect(gantt).toBeVisible();

    // Список «к разбору» содержит задачу «Аналитика flow распределения»
    const reviewSection = page.getByRole('region', { name: 'Задачи к разбору' });
    const reviewItem = reviewSection.locator('[data-task-id="506"]');
    await expect(reviewItem).toBeVisible();

    // Click row → попап с кнопками «Аппрувить» / «Отклонить»
    await reviewItem.getByRole('button').click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('«Аналитика flow распределения»')).toBeVisible();

    // Approve без комментария — по правилам это разрешено.
    await dialog.getByRole('button', { name: 'Аппрувить' }).click();

    // После мутации MSW отдаёт «Назначена» — query инвалидируется и
    // задача пропадает из «к разбору».
    await expect(reviewItem).toBeHidden({ timeout: 10_000 });
  });
});
