import { test, expect } from '@playwright/test';

import { loginAs } from '../utils/login';

/*
 * Golden-path для workflow «ментор отправляет заявку на изменение проекта
 * координатору».
 *
 *   /mentor/projects/:id/info (mode=edit)
 *      → синий banner «Редактирование проекта»
 *      → меняем описание
 *      → шагаем «Далее» до section 3
 *      → жмём «Отправить на согласование»
 *      → toast «Изменения отправлены координатору»
 */

test.describe('mentor project info — submit change request', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'mentor');
  });

  test('меняет поле и отправляет заявку координатору', async ({ page }) => {
    await page.goto('/mentor');

    await expect(page.getByRole('heading', { level: 1, name: 'Дашборд ментора' })).toBeVisible({
      timeout: 15_000,
    });

    const infoLink = page.getByTestId('project-card-info-link').first();
    await expect(infoLink).toBeVisible();
    await infoLink.click();

    await expect(page).toHaveURL(/\/mentor\/projects\/\d+\/info/);

    // Синий banner — edit без pending
    const banner = page.getByRole('note');
    await expect(banner).toContainText(/Редактирование проекта/);

    // Меняем title (section 0)
    const titleInput = page.getByPlaceholder(
      /Отражает содержание результата и конструктивные особенности/,
    );
    await expect(titleInput).toBeVisible();
    await titleInput.fill('Обновлённое название проекта');

    // Шагаем «Далее» 3 раза до section 3
    const nextBtn = page.getByTestId('form-next');
    await nextBtn.click(); // → section 1
    await nextBtn.click(); // → section 2
    await nextBtn.click(); // → section 3

    // Кнопка превращается в submit «Отправить на согласование»
    await expect(nextBtn).toHaveText(/Отправить на согласование/);
    await nextBtn.click();

    // Toast виден
    const toast = page.getByTestId('toast-stack').getByText(/Изменения отправлены координатору/);
    await expect(toast).toBeVisible({ timeout: 5_000 });

    // После submit бэк вернул проект с pending — banner превращается в
    // оранжевый pending-banner, кнопка submit меняет текст на «Обновить запрос».
    await expect(page.getByTestId('pending-banner')).toBeVisible();
    await expect(nextBtn).toHaveText(/Обновить запрос/);
  });
});
