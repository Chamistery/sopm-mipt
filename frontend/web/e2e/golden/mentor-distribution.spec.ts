import { test, expect, type Page } from '@playwright/test';

import { loginAs } from '../utils/login';

/*
 * HTML5 drag-and-drop через Playwright требует ручной симуляции — обычное
 * pointer-перемещение не триггерит native dragstart/drop. Поэтому через
 * page.evaluate синтезируем события и пробрасываем DataTransfer вручную.
 */
async function htmlDragAndDrop(
  page: Page,
  sourceSelector: string,
  targetSelector: string,
): Promise<void> {
  await page.evaluate(
    ({ src, tgt }) => {
      const source = document.querySelector(src) as HTMLElement | null;
      const target = document.querySelector(tgt) as HTMLElement | null;
      if (!source || !target) {
        throw new Error(`drag&drop: missing source/target ${src} → ${tgt}`);
      }
      const dt = new DataTransfer();
      const dispatch = (el: HTMLElement, type: string): void => {
        const ev = new DragEvent(type, {
          bubbles: true,
          cancelable: true,
          composed: true,
          dataTransfer: dt,
        });
        el.dispatchEvent(ev);
      };
      dispatch(source, 'dragstart');
      dispatch(target, 'dragenter');
      dispatch(target, 'dragover');
      dispatch(target, 'drop');
      dispatch(source, 'dragend');
    },
    { src: sourceSelector, tgt: targetSelector },
  );
}

/*
 * Golden path для view-distribution (Незапущенные команды у ментора).
 *
 *   /mentor/distribution
 *      → H1 «Незапущенные команды»
 *      → секции «Подходят / Не подходят по требованиям»
 *      → drag из чипа пула в пустой слот команды → mutation → инвалидация →
 *        чип появляется в команде, кнопка «Запустить команду» все ещё disabled
 *      → пользователь жмёт ✓ Пригласить рядом со всеми non-accepted чипами
 *        (если все приняты — кнопка становится enabled)
 *
 * D&D через Playwright: chromium корректно симулирует HTML5 dragstart/drop
 * только при использовании `dragTo()` метода с полноценным mouse-событием.
 */

test.describe('mentor distribution golden path', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'mentor');
  });

  test('renders header, pool, teams and supports drag from pool to empty slot', async ({ page }) => {
    await page.goto('/mentor/distribution');

    await expect(page.getByRole('heading', { level: 1, name: 'Незапущенные команды' })).toBeVisible({
      timeout: 15_000,
    });

    // Хедер с пулом
    await expect(page.getByRole('heading', { level: 2, name: 'Пул заявок' })).toBeVisible();
    await expect(page.getByText('Подходят по требованиям', { exact: true })).toBeVisible();
    await expect(page.getByText('Не подходят по требованиям', { exact: true })).toBeVisible();

    // Команды — у нас в фикстуре две незапущенные.
    await expect(page.getByRole('heading', { level: 3, name: 'Команда 1' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Команда 2' })).toBeVisible();

    // Пустые слоты Команды 2 (5 свободных мест)
    const team2 = page.locator('[data-team-id="902"]');
    await expect(team2.getByText('Свободное место').first()).toBeVisible();

    // Чип в пуле — Иванова Мария.
    const ivanovaChip = page.locator('[data-application-id="9101"]').first();
    await expect(ivanovaChip).toBeVisible();

    // Drag → drop в первый пустой слот команды 2 (через ручную dispatch
    // событий — playwright dragTo не триггерит HTML5 dragstart надёжно).
    const recommendPromise = page.waitForRequest(
      (req) => req.url().includes('/applications/9101/recommend'),
      { timeout: 10_000 },
    );
    await htmlDragAndDrop(
      page,
      '[data-application-id="9101"]',
      '[data-team-id="902"] [data-empty]',
    );
    await recommendPromise;

    // После drop инвалидация → перерисовка → чип со слотом attached в команде 2.
    await expect(team2.getByText(/Иванова/)).toBeVisible({ timeout: 5_000 });
  });

  test('launch button stays disabled until all members are accepted', async ({ page }) => {
    await page.goto('/mentor/distribution');

    const team1 = page.locator('[data-team-id="901"]');
    const launch1 = team1.getByRole('button', { name: /Не все участники приняты/i });
    await expect(launch1).toBeVisible();
    await expect(launch1).toBeDisabled();
  });
});
