import { test, expect } from '@playwright/test';

/*
 * Regression: студент должен мочь менять приоритеты drag-and-drop'ом
 * во вкладке «Мои выборы» до отправки заявки. Раньше swap источника
 * шёл через DataTransfer.setData с кастомным MIME — заменили на ref
 * в родителе (как dragFrom в student.html), чтобы не зависеть от
 * MIME-квирков браузеров.
 */

const STUDENT_AUTH = {
  state: {
    user: { userId: 4, role: 'student', displayName: 'Стародубов А.Ю.' },
  },
  version: 0,
};

test.describe('student catalog DnD', () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript((value: string) => {
      window.localStorage.setItem('sopm.auth.v1', value);
    }, JSON.stringify(STUDENT_AUTH));
  });

  test('swap priorities between slot 1 and slot 2 via native HTML5 drag', async ({ page }) => {
    await page.goto('/student');
    await expect(page.getByRole('heading', { name: 'Выбор проекта' })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByLabel('Только подходящие').uncheck();
    await page.waitForTimeout(200);

    // Fill 2 slots by clicking «Хочу в проект» on 2 distinct cards.
    const cards = page.locator('[data-testid^="project-card-"]');
    const total = await cards.count();

    let added = 0;
    let idx = 0;
    while (added < 2 && idx < total) {
      const card = cards.nth(idx);
      await card.hover();
      const wantBtn = card.getByRole('button', { name: 'Хочу в проект' });
      if (await wantBtn.isVisible().catch(() => false)) {
        await wantBtn.click({ force: true });
        added++;
        await page.waitForTimeout(200);
      }
      idx++;
    }
    expect(added).toBe(2);

    await page.getByRole('tab', { name: /Мои выборы/ }).click();

    const slot1 = page.getByTestId('priority-slot-1');
    const slot2 = page.getByTestId('priority-slot-2');

    const before1 = await slot1.locator('[data-testid^="project-card-"]').getAttribute('data-testid');
    const before2 = await slot2.locator('[data-testid^="project-card-"]').getAttribute('data-testid');
    expect(before1).toBeTruthy();
    expect(before2).toBeTruthy();
    expect(before1).not.toBe(before2);

    // Simulate native HTML5 drag from slot 1's card onto slot 2.
    await page.evaluate(() => {
      const card = document.querySelector(
        '[data-testid="priority-slot-1"] [data-testid^="project-card-"]',
      ) as HTMLElement | null;
      const target = document.querySelector('[data-testid="priority-slot-2"]') as HTMLElement | null;
      if (!card || !target) throw new Error('drag source or target missing');
      const dt = new DataTransfer();
      card.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }));
      target.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
      target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
      card.dispatchEvent(new DragEvent('dragend', { bubbles: true, cancelable: true, dataTransfer: dt }));
    });

    await page.waitForTimeout(200);

    const after1 = await slot1.locator('[data-testid^="project-card-"]').getAttribute('data-testid');
    const after2 = await slot2.locator('[data-testid^="project-card-"]').getAttribute('data-testid');
    expect(after1).toBe(before2);
    expect(after2).toBe(before1);
  });
});
