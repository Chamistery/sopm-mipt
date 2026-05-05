import { test, expect } from '@playwright/test';

import { loginAs } from '../utils/login';

/*
 * Golden path для расширенного архива у ментора:
 *   /mentor/archive
 *      → видит карточку «Цифровой двойник кампуса» (id=110)
 *      → видит pill с финальной оценкой проекта («Зачтено» / «Зачтено с замечаниями»)
 *      → видит «Ср. балл: 4.7» в строке команды
 *   → клик «Полная информация»
 *      → открывается модалка с полями proposalData
 *      → видим «Цель проекта», «Технологии»
 *      → Esc закрывает модалку
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

    // Кнопка «Полная информация» открывает модалку
    await card.getByRole('button', { name: /Полная информация/ }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: /Цифровой двойник кампуса/ })).toBeVisible();
    await expect(dialog.getByText('Цель проекта')).toBeVisible();
    await expect(dialog.getByText('Технологии')).toBeVisible();
    await expect(dialog.getByText('React, Three.js, PostgreSQL')).toBeVisible();

    // Esc закрывает
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });
});
