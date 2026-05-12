import { test, expect } from '@playwright/test';

/*
 * Coordinator smoke. Without an authenticated session the app redirects to
 * /login, which is the deterministic state we can assert in CI without the
 * backend running. Once MSW is wired into Playwright we'll extend this to
 * sign in as a coordinator and walk through dashboard → projects → detail
 * → distribution. The skipped test below documents that target scenario.
 */
test('unauthenticated coordinator routes redirect to login', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Система управления/i);
});

test('unauthenticated /admin/projects also redirects', async ({ page }) => {
  await page.goto('/admin/projects');
  await expect(page).toHaveURL(/\/login/);
});

test.skip('coordinator full happy path: dashboard → projects → detail → distribution', async ({
  page,
}) => {
  // Requires MSW + a seeded coordinator user. Tracking issue: …
  await page.goto('/login');
  await page.getByRole('searchbox').fill('Координатор');
  await page.getByRole('button', { name: /Войти как/i }).click();

  await expect(page).toHaveURL(/\/admin/);
  await expect(page.getByRole('heading', { name: /Панель управления/ })).toBeVisible();

  await page.goto('/admin/projects');
  await expect(page).toHaveURL(/\/admin\/projects/);

  await page.getByRole('button', { name: /AI чат-бот/ }).click();
  await expect(page).toHaveURL(/\/admin\/projects\/\d+/);

  await page.goto('/admin/distribution');
  await expect(page.getByRole('heading', { name: 'Распределение студентов' })).toBeVisible();
});
