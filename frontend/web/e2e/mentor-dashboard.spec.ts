import { test, expect } from '@playwright/test';

/*
 * Smoke E2E for the mentor dashboard. The backend isn't booted in CI, so
 * this only verifies the *shell* renders for an unauthenticated visitor:
 *   - Direct hit on /mentor redirects to /login (RequireAuth guard).
 *   - The login page acknowledges the search input.
 *
 * The full happy path («войти ментором → список проектов → детали →
 * распределение → ревью задач») we'll add in a follow-up PR once we wire
 * MSW into Playwright to mock the backend.
 */

test('unauthenticated visit to /mentor bounces to /login', async ({ page }) => {
  await page.goto('/mentor');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Система управления/i);
});

test('login page is reachable directly and search filter accepts input', async ({ page }) => {
  await page.goto('/login');
  const search = page.getByRole('searchbox');
  await search.fill('Кузнецов');
  await expect(search).toHaveValue('Кузнецов');
});
