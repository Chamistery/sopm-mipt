import { test, expect } from '@playwright/test';

import { loginAs } from '../utils/login';

/*
 * Golden path для нераспределённого студента: каталог → выбор проекта →
 * слот в «Мои выборы». Полная отправка 5/5 не валидируется, чтобы тест
 * остался коротким — мутации проверяет первая клик-операция.
 */

test.describe('student golden path', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'student');
  });

  test('catalog shows projects and selects one into priority slot', async ({ page }) => {
    await page.goto('/student');

    await expect(page.getByRole('heading', { name: 'Выбор проекта' })).toBeVisible({
      timeout: 15_000,
    });

    // «Только подходящие» по умолчанию — выключаем, чтобы видеть все
    // fixtures независимо от course/gpa студента.
    const onlyQualified = page.getByLabel('Только подходящие');
    if (await onlyQualified.isChecked()) await onlyQualified.uncheck();

    const wantBtn = page.getByRole('button', { name: 'Хочу в проект' }).first();
    await expect(wantBtn).toBeVisible();
    await wantBtn.click();

    await page.getByRole('tab', { name: /Мои выборы/ }).click();

    // В слоте 1 должна появиться кнопка убрать — ARIA-нейтрально:
    // достаточно проверить, что счётчик «1/5» ушёл со старта.
    await expect(page.getByRole('tab', { name: /Мои выборы/ })).toContainText('1/5');
  });
});
