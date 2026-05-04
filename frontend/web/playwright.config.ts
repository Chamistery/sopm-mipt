import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 4173);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['html'], ['github']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    /*
     * Vite preview сервит `dist/`, который должен быть собран с включённым
     * MSW: `VITE_ENABLE_MSW=true` подхватывается на этапе bundle (см.
     * main.tsx). Поэтому build делаем здесь же — это даёт изоляцию от
     * `dist/` без env-флага и гарантирует, что mock включён ровно в e2e.
     */
    command: `VITE_ENABLE_MSW=true npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
