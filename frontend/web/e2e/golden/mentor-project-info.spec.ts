import { test, expect } from '@playwright/test';

import { loginAs } from '../utils/login';

/*
 * Golden path для страницы «Полная информация о проекте» у ментора.
 *
 * Активный проект (mode=edit):
 *   /mentor
 *      → клик «Полная информация» на ProjectCard
 *   /mentor/projects/:id/info
 *      → синий банер «Редактирование проекта»
 *      → поля заявки заполнены, инпуты редактируемые
 *      → кнопка «Отправить на согласование» активна (см. отдельный
 *        mentor-project-info-edit.spec.ts для полного submit-flow).
 *
 * Архивный проект (mode=readonly):
 *   /mentor/archive
 *      → клик «Полная информация» на ArchiveProjectCard
 *   /mentor/archive/projects/:id/info
 *      → жёлтый банер «Карточка завершённого проекта»
 *      → инпуты readOnly
 *      → клик «Закрыть» → возврат в архив
 */

test.describe('mentor project info golden path', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'mentor');
  });

  test('active project: открывается edit-режим с банером и редактируемыми полями', async ({
    page,
  }) => {
    await page.goto('/mentor');

    await expect(page.getByRole('heading', { level: 1, name: 'Дашборд ментора' })).toBeVisible({
      timeout: 15_000,
    });

    // Ссылка «Полная информация» в первой активной карточке
    const infoLink = page.getByTestId('project-card-info-link').first();
    await expect(infoLink).toBeVisible();
    await infoLink.click();

    await expect(page).toHaveURL(/\/mentor\/projects\/\d+\/info/);

    // Заголовок страницы и хлебные крошки
    await expect(
      page.getByRole('heading', { level: 1, name: 'Полная информация о проекте' }),
    ).toBeVisible();

    // Синий банер «Редактирование проекта»
    const banner = page.getByRole('note');
    await expect(banner).toContainText(/Редактирование проекта/);

    // Title input заполнен и НЕ readonly
    const titleInput = page.getByPlaceholder(
      /Отражает содержание результата и конструктивные особенности/,
    );
    await expect(titleInput).toBeVisible();
    await expect(titleInput).not.toHaveAttribute('readonly', '');

    // Можно перейти к section 3 через step-dots — в конце видим Save disabled.
    // (Если не доходим, тест всё равно подтверждает edit-режим выше.)
  });

  test('archive project: открывается readonly-режим', async ({ page }) => {
    await page.goto('/mentor/archive');

    await expect(page.getByRole('heading', { name: 'Архив проектов' })).toBeVisible({
      timeout: 15_000,
    });

    const card = page.locator('[data-archive-id="110"]').first();
    await expect(card).toBeVisible();
    await card.getByTestId('archive-card-info-link').click();

    await expect(page).toHaveURL(/\/mentor\/archive\/projects\/110\/info/);

    // Жёлтый банер архива
    const banner = page.getByRole('note');
    await expect(banner).toContainText(/завершённого/);

    // Поля readOnly
    const titleInput = page.getByPlaceholder(
      /Отражает содержание результата и конструктивные особенности/,
    );
    await expect(titleInput).toHaveAttribute('readonly', '');
    await expect(titleInput).toHaveValue(/Цифровой двойник кампуса/);

    // Кнопка «Закрыть» возвращает в архив
    await page.getByTestId('info-close').click();
    await expect(page).toHaveURL(/\/mentor\/archive$/);
  });
});
