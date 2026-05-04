import { test, expect } from '@playwright/test';

import { loginAs } from '../utils/login';

/*
 * Golden path для тимлида: открывает /student/project (распределённый
 * студент → его команда), видит шапку проекта, состав, табы и переключает
 * на «Отчёты», где должен появиться командный отчёт.
 */

test.describe('teamlead golden path', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'teamlead');
  });

  test('project page renders header, members and reports tab', async ({ page }) => {
    await page.goto('/student/project');

    await expect(page.getByRole('heading', { name: 'Текущий проект' })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('СУПП ВШПИ МФТИ').first()).toBeVisible();
    await expect(page.getByText(/Спринт 2 из 3/).first()).toBeVisible();

    // Состав команды — fixtures дают 4 участников.
    await expect(page.getByLabel('Состав команды')).toBeVisible();

    // Переключение на отчёты.
    await page.getByRole('tab', { name: 'Отчёты' }).click();
    await expect(page.getByText(/Отчёт команды|Командный отчёт|Черновик/i).first()).toBeVisible();
  });
});
