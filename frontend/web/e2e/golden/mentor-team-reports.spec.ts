import { test, expect } from '@playwright/test';

import { loginAs } from '../utils/login';

/*
 * Golden-path таба «Отчёты по спринтам» команды у ментора:
 *   /mentor/teams/300?tab=reports
 *
 * Команда 300 имеет 2 отчёта: sprint 201 (Отправлен, текущий) и
 * sprint 200 (Проверен, прошедший). См. fixtureTeamReports.
 *
 * Покрываем:
 *   1. Видны 2 карточки, текущая открыта по дефолту, прошедшая — свёрнута.
 *   2. Клик на свёрнутый header — раскрывает карточку.
 *   3. Кнопка «Выгрузить отчёт» открывает модалку и закрывает с баннером.
 *   4. Изменение балла + общий «Сохранить оценки» → inline-баннер.
 */

test.describe('mentor team reports tab', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'mentor');
  });

  test('renders two cards, toggles collapsed one, opens export modal, saves scores', async ({
    page,
  }) => {
    await page.goto('/mentor/teams/300?tab=reports');

    await expect(page.getByRole('tab', { name: 'Отчёты по спринтам' })).toHaveAttribute(
      'aria-selected',
      'true',
      { timeout: 15_000 },
    );

    // Заголовок таба
    await expect(page.getByRole('heading', { name: 'Отчёты по спринтам' })).toBeVisible();

    // Видим обе карточки (по заголовку «Спринт N (DD ммм — DD ммм)»).
    // Активный спринт 201 / прошедший спринт 200 — daterange выводится через
    // данные fixtureSprints. SPRINT_START — формируется в fixtures.
    const currentHeader = page.getByRole('button', { name: /Спринт 2 \(/ });
    const pastHeader = page.getByRole('button', { name: /Спринт 1 \(/ });
    await expect(currentHeader).toBeVisible();
    await expect(pastHeader).toBeVisible();

    // Свёрнутый прошедший — aria-expanded=false
    await expect(pastHeader).toHaveAttribute('aria-expanded', 'false');
    // Текущий — aria-expanded=true (открыт по дефолту)
    await expect(currentHeader).toHaveAttribute('aria-expanded', 'true');

    // Бейджи в шапках. У свёрнутого — «Проверен · 8/10», у текущего — «Ждёт проверки».
    await expect(page.getByText('Проверен · 8/10')).toBeVisible();
    await expect(page.getByText('Ждёт проверки')).toBeVisible();

    // Кликаем header свёрнутой карточки → раскрывается.
    await pastHeader.click();
    await expect(pastHeader).toHaveAttribute('aria-expanded', 'true');

    // Open export modal
    await page.getByRole('button', { name: /Выгрузить отчёт/ }).click();
    await expect(page.getByRole('dialog', { name: 'Выгрузить отчёт' })).toBeVisible();

    // Сабмитим
    await page.getByRole('button', { name: 'Скачать' }).click();
    await expect(page.getByRole('dialog', { name: 'Выгрузить отчёт' })).not.toBeVisible();
    await expect(page.getByText('Отчёт сформирован')).toBeVisible();

    // Заполняем балл одному студенту в текущей карточке и сохраняем.
    // В fixture это команда 300, sprint 201 — не имеет существующих оценок,
    // поэтому первый input для балла относится к студенту-тимлиду.
    const firstScoreInput = currentHeader
      .locator('..')
      .locator('input[type="number"]')
      .first();
    await firstScoreInput.fill('8');

    await page
      .getByRole('button', { name: /Сохранить оценки/ })
      .first()
      .click();

    await expect(page.getByText('Оценки сохранены')).toBeVisible();
  });
});
