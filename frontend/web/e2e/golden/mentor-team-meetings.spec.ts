import { test, expect } from '@playwright/test';

import { loginAs } from '../utils/login';

/*
 * Golden path таба «Встречи» команды у ментора:
 *   /mentor/teams/300?tab=meetings
 *
 * Команда 300 (СУПП ВШПИ Команда 1) — наша основная демо-команда.
 * Fixtures возвращают 1 предстоящую встречу в статусе «Ожидает
 * подтверждения» и 1 прошедшую («Состоялась» + summary).
 *
 * Сценарий проверяет:
 *   1. Открытие → секции «Предстоящие» и «Прошедшие» с заголовками
 *   2. Прошедшая встреча — со status-бейджем и блоком «Резюме встречи»
 *   3. Кнопка «Назначить встречу» открывает модалку
 *   4. Модалка отправляется и показывает success-баннер
 */

test.describe('mentor team meetings tab', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'mentor');
  });

  test('shows two sections, opens modal, schedules a meeting and shows banner', async ({ page }) => {
    await page.goto('/mentor/teams/300?tab=meetings');

    await expect(page.getByRole('tab', { name: 'Встречи' })).toHaveAttribute(
      'aria-selected',
      'true',
      { timeout: 15_000 },
    );

    // Заголовки секций
    await expect(page.getByText('Предстоящие', { exact: true })).toBeVisible();
    await expect(page.getByText('Прошедшие', { exact: true })).toBeVisible();

    // Прошедшая встреча — блок «Резюме встречи»
    await expect(page.getByText('Резюме встречи').first()).toBeVisible();
    await expect(page.getByText('Постановка спринта 2').first()).toBeVisible();

    // Открываем модалку
    await page.getByRole('button', { name: /Назначить встречу/ }).click();
    await expect(page.getByRole('dialog', { name: 'Назначить встречу' })).toBeVisible();

    // Заполняем
    await page.getByLabel(/Тема встречи/).fill('Демо для куратора');
    await page.getByLabel(/Дата/).fill('2099-05-15');
    await page.getByLabel(/Время/).fill('14:30');
    await page.getByRole('radio', { name: '60 мин' }).check();
    await page.getByLabel(/Повестка/).fill('Финальная демонстрация модулей');

    // Сабмитим
    await page.getByRole('button', { name: 'Назначить', exact: true }).click();

    // Модалка закрылась + баннер видим (3 секунды)
    await expect(page.getByRole('dialog', { name: 'Назначить встречу' })).not.toBeVisible();
    await expect(page.getByText('Встреча назначена')).toBeVisible();

    // Новая встреча появилась в списке
    await expect(page.getByText('Демо для куратора')).toBeVisible();
  });
});
