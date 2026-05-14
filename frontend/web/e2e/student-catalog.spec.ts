import { test, expect } from '@playwright/test';

/*
 * Smoke E2E for /student каталог.
 *
 * Без бэка проверяем «упал на пустой/error state без падения». Полный сценарий
 * (фильтрация → выбор 5 → отправка → read-only) запускается с поднятым бэком
 * + сидом, см. docs/AGENT_PLAYBOOK.md.
 */

const STUDENT_AUTH = {
  state: {
    user: { userId: 4, role: 'student', displayName: 'Стародубов А.Ю.' },
  },
  version: 0,
};

test.describe('student catalog', () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript((value: string) => {
      window.localStorage.setItem('sopm.auth.v1', value);
    }, JSON.stringify(STUDENT_AUTH));
  });

  test('renders the catalog page or its error state', async ({ page }) => {
    await page.goto('/student');

    // Заголовок «Выбор проекта» либо появляется (после загрузки), либо
    // показывается ошибка с кнопкой Повторить — оба валидны для смоука.
    const heading = page.getByRole('heading', { name: 'Выбор проекта' });
    const errorTitle = page.getByText('Не удалось загрузить каталог проектов');

    await expect(heading.or(errorTitle)).toBeVisible({ timeout: 15_000 });
  });

  /*
   * Полный happy-path с реальным бэком. Включается через PLAYWRIGHT_LIVE=1.
   * Скип в CI/без бэка, чтобы не флакать.
   */
  test.skip(!process.env.PLAYWRIGHT_LIVE, 'requires live backend (PLAYWRIGHT_LIVE=1)');
  test('student picks 5 projects and submits an application', async ({ page }) => {
    await page.goto('/student');

    await expect(page.getByRole('heading', { name: 'Выбор проекта' })).toBeVisible();

    // Снять «Только подходящие», чтобы видеть все проекты в seed-данных.
    await page.getByLabel('Только подходящие').uncheck();

    // Найти 5 кнопок «Хочу в проект» и кликнуть.
    const wantBtns = page.getByRole('button', { name: 'Хочу в проект' });
    for (let i = 0; i < 5; i++) {
      await wantBtns.first().click();
    }

    // Перейти на «Мои выборы», убедиться что 5 слотов заполнены.
    await page.getByRole('tab', { name: /Мои выборы/ }).click();

    await expect(page.getByRole('button', { name: 'Отправить заявку' })).toBeEnabled();

    await page.getByRole('button', { name: 'Отправить заявку' }).click();

    await expect(page.getByText('Заявка отправлена')).toBeVisible({ timeout: 15_000 });
  });
});
