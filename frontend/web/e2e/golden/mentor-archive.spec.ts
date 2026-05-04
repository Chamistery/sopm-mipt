import { test, expect } from '@playwright/test';

import { loginAs } from '../utils/login';

/*
 * Golden path для архива у ментора. Без мутаций.
 *
 *   /mentor/archive
 *      → видит карточку архивного проекта (110, «Цифровой двойник кампуса»)
 *   → клик
 *   /mentor/archive/projects/110
 *      → видит хлебные крошки + список команд (одна, 310)
 *   → клик
 *   /mentor/archive/teams/310
 *      → жёлтый банер «Проект завершён»
 *      → pill с финальной оценкой («Оценка: 4.7» — среднее по 6 оценкам в фикстурах)
 *      → активный таб «Итоговая диаграмма»
 *      → бары задач в архивной палитре (зелёные/фиолетовые)
 *   → переключение на «Встречи» → видит хотя бы одну встречу
 */

test.describe('mentor archive golden path', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'mentor');
  });

  test('mentor opens archive, drills into team, switches tabs', async ({ page }) => {
    await page.goto('/mentor/archive');

    await expect(page.getByRole('heading', { name: 'Архив проектов' })).toBeVisible({
      timeout: 15_000,
    });

    const projectLink = page.getByRole('link', { name: /Цифровой двойник кампуса/i });
    await expect(projectLink).toBeVisible();
    await projectLink.click();

    await expect(page).toHaveURL(/\/mentor\/archive\/projects\/110/);
    await expect(
      page.getByRole('heading', { name: /Цифровой двойник кампуса/i }),
    ).toBeVisible();

    const teamLink = page.getByRole('link', { name: /Кампус-2/i });
    await expect(teamLink).toBeVisible();
    await teamLink.click();

    await expect(page).toHaveURL(/\/mentor\/archive\/teams\/310/);

    // Жёлтый банер «Проект завершён»
    const banner = page.getByRole('note');
    await expect(banner).toContainText('Проект');
    await expect(banner).toContainText('завершён');

    // Pill: 6 оценок, среднее (5+4+5+4+5+5)/6 = 4.67 → 4.7
    await expect(page.getByTestId('archive-final-grade')).toHaveText('Оценка: 4.7');

    // Активный таб
    await expect(page.getByRole('tab', { name: 'Итоговая диаграмма' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    // Гант реально отрендерился, и в нём есть бары в архивной палитре
    const gantt = page.getByRole('region', { name: 'Диаграмма Ганта' });
    await expect(gantt).toBeVisible();
    const greenBar = gantt.locator('[data-testid="task-bar"][data-status="Готово"]').first();
    await expect(greenBar).toBeVisible();

    // Переход на «Встречи»
    await page.getByRole('tab', { name: 'Встречи' }).click();
    await expect(page).toHaveURL(/tab=meetings/);
    await expect(page.getByText('Установочная встреча')).toBeVisible();
  });
});
