import { test, expect } from '@playwright/test';

/*
 * Smoke E2E: переход к странице «Текущий проект».
 *
 * При запуске в CI бэк не поднят, поэтому проверяем UI до запроса:
 * после логина мы должны попасть на страницу студента (или каталог),
 * с этой страницы есть ссылка / редирект к /student/project. Здесь просто
 * убеждаемся, что неавторизованный заход на /student/project редиректит
 * на /login, а после открытия страница рендерит шапку либо стейт загрузки.
 */
test('unauthenticated user lands on /login when going to /student/project', async ({ page }) => {
  await page.goto('/student/project');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Система управления/i);
});

test('login filter renders to allow choosing a student', async ({ page }) => {
  await page.goto('/login');
  const search = page.getByRole('searchbox');
  await search.fill('Стародубов');
  await expect(search).toHaveValue('Стародубов');
});
