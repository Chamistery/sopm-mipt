import { test, expect } from '@playwright/test';

/*
 * Smoke E2E for the «Требует внимания» block on the mentor dashboard.
 * Like the other dashboards we don't have a real backend in CI, so this
 * checks the static side: an unauthenticated visit bounces to /login,
 * and the login page is reachable. The real "block renders with data"
 * verification lives in Storybook + the unit test in
 * src/_shared/RequiresAttention/RequiresAttention.test.tsx.
 */

test('unauthenticated /mentor still bounces to /login (RequiresAttention does not break the guard)', async ({
  page,
}) => {
  await page.goto('/mentor');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Система управления/i);
});

test('login page renders unaffected by the new block', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
