import { test, expect } from '@playwright/test';

/*
 * Smoke E2E: страница /login отрисовывается, ввод в фильтр работает.
 *
 * При запуске в CI бэк не поднят, поэтому проверяем UI до запроса:
 * заголовок, поле поиска, состояние «загружаем» или сообщение об ошибке.
 * Полноценный сценарий «логин → редирект» добавим следующим PR'ом, когда
 * подключим moccкированный бэк через MSW в Playwright.
 */
test('login page renders and accepts filter input', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Система управления/i);
  const search = page.getByRole('searchbox');
  await search.fill('Стародубов');
  await expect(search).toHaveValue('Стародубов');

  // Без бэка кнопка остаётся неактивной — это валидное состояние смоука.
  await expect(
    page.getByRole('button', { name: /Выберите пользователя|Войти как/i }),
  ).toBeVisible();
});
