import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider } from 'react-router-dom';

import { router } from './router';
import { configureApiClient } from './api/client';
import './styles/tokens.css';
import './styles/global.css';

configureApiClient();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('#root element not found in index.html');
}

async function enableMockingIfRequested(): Promise<void> {
  // Условный импорт — prod-бандл не должен тянуть msw. Включается через
  // `VITE_ENABLE_MSW=true npm run dev|preview` для локальной разработки и
  // Playwright e2e (см. playwright.config.ts).
  if (import.meta.env.VITE_ENABLE_MSW !== 'true') return;
  const { worker } = await import('./test/msw/browser');
  await worker.start({
    onUnhandledRequest: 'warn',
    serviceWorker: { url: '/mockServiceWorker.js' },
  });
}

void enableMockingIfRequested().then(() => {
  createRoot(rootElement).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} /> : null}
      </QueryClientProvider>
    </StrictMode>,
  );
});
