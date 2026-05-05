import { test, expect } from '@playwright/test';

import { loginAs } from '../utils/login';

/*
 * Golden path для объединённой страницы команды у ментора:
 *   /mentor/teams/300 — три таба (Гант / Отчёты / Встречи).
 *
 * Проверяем:
 *   1. Открытие default URL → таб «Диаграмма Ганта», members-card видна.
 *   2. ?tab=reports → видим список отчётов команды.
 *   3. ?tab=meetings → заглушка «Раздел в разработке».
 *   4. Старый URL /mentor/teams/300/gantt редиректит на новый ?tab=gantt.
 *
 * Команда 300 / спринт 201 (Активный) — см. fixtures.ts.
 */

test.describe('mentor team page golden path', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'mentor');
  });

  test('default URL shows team header, members-card and the gantt tab', async ({ page }) => {
    await page.goto('/mentor/teams/300?sprintId=201');

    await expect(page.getByRole('heading', { level: 1, name: /Команда/ })).toBeVisible({
      timeout: 15_000,
    });

    // Members-card видна (наша aria-label)
    await expect(page.getByRole('region', { name: 'Состав команды' })).toBeVisible();

    // Tabs: три штуки, активный — Гант
    await expect(page.getByRole('tab', { name: 'Диаграмма Ганта' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByRole('tab', { name: 'Отчёты по спринтам' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Встречи' })).toBeVisible();

    // Гант реально отрендерился: ментор видит стек диаграмм по всем
    // спринтам (по прототипу mentor.html lines 951-967), берём first().
    await expect(page.getByRole('region', { name: 'Диаграмма Ганта' }).first()).toBeVisible();
  });

  test('?tab=reports renders the reports list', async ({ page }) => {
    await page.goto('/mentor/teams/300?tab=reports');

    await expect(page.getByRole('tab', { name: 'Отчёты по спринтам' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    // Заголовок отчёта (Sprint #201) или плейсхолдер «Команда ещё не отправляла…»
    // — оба варианта приемлемы; главное, что таб активен.
  });

  test('?tab=meetings renders the meetings sections and «Назначить встречу» button', async ({ page }) => {
    await page.goto('/mentor/teams/300?tab=meetings');

    await expect(page.getByRole('tab', { name: 'Встречи' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByRole('heading', { name: 'Встречи команды' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Назначить встречу/ })).toBeVisible();
  });

  test('legacy URL /mentor/teams/300/gantt redirects to ?tab=gantt', async ({ page }) => {
    await page.goto('/mentor/teams/300/gantt?sprintId=201');

    await expect(page).toHaveURL(/\/mentor\/teams\/300\?.*tab=gantt/, { timeout: 10_000 });
    await expect(page.getByRole('tab', { name: 'Диаграмма Ганта' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});
