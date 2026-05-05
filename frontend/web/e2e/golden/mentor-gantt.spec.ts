import { test, expect } from '@playwright/test';

import { loginAs } from '../utils/login';

/*
 * Golden path для ментора в режиме Гант-ревью на объединённой
 * странице команды: переход на /mentor/teams/300?tab=gantt → видит
 * стек Гант-блоков по всем спринтам (см. mentor.html:951-967, без
 * sprint-switcher и фильтра «требует действия») → кликает по строке
 * задачи «Аналитика flow распределения» (статус «Ожидает аппрува»)
 * прямо в Ганте → жмёт «Аппрувить» в попапе → MSW в ответ меняет
 * статус на «Назначена», query инвалидируется и task-row пропадает.
 *
 * Команда 300 / спринт 201 (Активный) — см. fixtures.ts.
 */

test.describe('mentor gantt golden path', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'mentor');
  });

  test('mentor opens gantt, approves a pending-approval task via popup', async ({ page }) => {
    await page.goto('/mentor/teams/300?tab=gantt');

    // Шапка — H1 = название команды
    await expect(page.getByRole('heading', { level: 1, name: /Команда/ })).toBeVisible({
      timeout: 15_000,
    });

    // Гант реально отрендерился — минимум один блок с aria-label="Диаграмма Ганта"
    const gantts = page.getByRole('region', { name: 'Диаграмма Ганта' });
    await expect(gantts.first()).toBeVisible();

    // Кликаем строку задачи 506 («Аналитика flow распределения»)
    const taskRow = gantts.first().locator('[data-task-id="506"]');
    await expect(taskRow).toBeVisible();
    await taskRow.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    // В попапе теперь полный заголовок задачи (а не «в кавычках»),
    // плюс блок описания + блок выполненной работы (read-only вьюер).
    await expect(dialog.getByRole('heading', { name: 'Аналитика flow распределения' })).toBeVisible();
    await expect(dialog.getByText('Описание', { exact: true })).toBeVisible();

    // Шаг 1: выбираем «Аппрувить» — раскрывается comment-area.
    await dialog.getByRole('button', { name: 'Аппрувить' }).click();
    // Шаг 2: подтверждаем без комментария — для approve он опционален.
    await dialog.getByRole('button', { name: 'Подтвердить аппрув' }).click();

    // После мутации MSW отдаёт «Назначена» — query инвалидируется,
    // диалог закрывается.
    await expect(dialog).toBeHidden({ timeout: 10_000 });
  });
});
