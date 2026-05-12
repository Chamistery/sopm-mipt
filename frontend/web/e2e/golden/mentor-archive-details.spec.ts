import { test, expect } from '@playwright/test';

import { loginAs } from '../utils/login';

/*
 * Golden path для расширенного архива у ментора:
 *   /mentor/archive
 *      → видит карточку «Цифровой двойник кампуса» (id=110)
 *      → видит pill с финальной оценкой проекта («Зачтено» / «Зачтено с замечаниями»)
 *      → видит «Ср. балл: 4.7» в строке команды
 *   → клик «Полная информация»
 *      → переход на /mentor/archive/projects/110/info
 *      → жёлтый банер «Карточка завершённого проекта»
 *      → поля заявки заполнены, инпуты readOnly
 *      → кнопка «Закрыть» возвращает в архив
 *
 * Без мутаций: тест read-only.
 */

test.describe('mentor archive details golden path', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'mentor');
  });

  test('mentor видит ср. балл и итог проекта на карточке', async ({ page }) => {
    await page.goto('/mentor/archive');

    await expect(page.getByRole('heading', { name: 'Архив проектов' })).toBeVisible({
      timeout: 15_000,
    });

    // Карточка проекта 110
    const card = page
      .locator('[data-archive-id="110"]')
      .first();
    await expect(card).toBeVisible();

    // Бейдж «Новый» (предшественника нет в фикстуре)
    await expect(card.getByText(/Новый|Продолжение/)).toBeVisible();

    // Итог проекта — pill справа от метаданных
    await expect(card.getByText(/Зачтено/)).toBeVisible();

    // Ср. балл команды (310): среднее по 6 оценкам = 4.7
    await expect(card.getByText('Ср. балл: 4.7')).toBeVisible();

    // Ссылка «Полная информация» ведёт на страницу readonly-просмотра
    await card.getByTestId('archive-card-info-link').click();
    await expect(page).toHaveURL(/\/mentor\/archive\/projects\/110\/info/);

    // Жёлтый банер архива
    const banner = page.getByRole('note');
    await expect(banner).toContainText('завершённого');

    // Поля заявки заполнены из proposalData
    const titleInput = page.getByPlaceholder(
      /Отражает содержание результата и конструктивные особенности/,
    );
    await expect(titleInput).toHaveValue(/Цифровой двойник кампуса/);
    // readOnly: атрибут readonly
    await expect(titleInput).toHaveAttribute('readonly', '');

    // Возвращаемся в архив
    await page.getByTestId('info-close').click();
    await expect(page).toHaveURL(/\/mentor\/archive$/);
  });
});
