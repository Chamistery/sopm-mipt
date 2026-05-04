import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { MentorDashboardPage } from './MentorDashboardPage';
import type { MentorDashboardProject } from '@/api/projects';

vi.mock('@/auth/useCurrentUser', () => ({
  useRequireUser: () => ({ userId: 1, role: 'mentor' as const, displayName: 'Тимохин Виктор' }),
  useCurrentUser: () => ({ userId: 1, role: 'mentor' as const, displayName: 'Тимохин Виктор' }),
}));

const ACTIVE_PROJECT: MentorDashboardProject = {
  id: 1,
  title: 'Система управления проектным практикумом ВШПИ',
  status: 'Активный',
  company: 'МФТИ',
  durationSemesters: 1,
  currentSemester: 1,
  startedAt: '2026-02-15',
  sprints: [
    { id: 1, number: 1, startDate: '2026-02-24', endDate: '2026-03-16', status: 'Завершён' },
    { id: 2, number: 2, startDate: '2026-03-17', endDate: '2026-04-06', status: 'Активный' },
  ],
  teams: [
    {
      id: 11,
      name: 'Команда 1',
      lead: { id: 3, firstName: 'Александр', lastName: 'Стародубов' },
      memberCount: 4,
      launched: true,
      sprintStatuses: ['reviewed', 'pending-review'],
    },
  ],
};

vi.mock('./hooks/useMentorDashboard', () => ({
  useMentorDashboard: () => ({
    data: [ACTIVE_PROJECT],
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/_shared/RequiresAttention', () => ({
  RequiresAttention: () => null,
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <MentorDashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('MentorDashboardPage', () => {
  beforeEach(() => {
    // No-op — vi.mock applies to module-level mocks per file.
  });

  it('renders «Дашборд ментора» H1 and contextual subtitle', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Дашборд ментора' })).toBeInTheDocument();
    expect(screen.getByText(/Весенний семестр 2025\/2026/)).toBeInTheDocument();
    expect(screen.getByText(/Программная инженерия/)).toBeInTheDocument();
  });

  it('renders «+ Создать проект» button linking to /mentor/projects/new', () => {
    renderPage();
    const link = screen.getByRole('link', { name: /Создать проект/ });
    expect(link).toHaveAttribute('href', '/mentor/projects/new');
  });

  it('renders the legend with all five sprint-status states', () => {
    renderPage();
    expect(screen.getByText('Проверен')).toBeInTheDocument();
    expect(screen.getByText('Ждёт проверки')).toBeInTheDocument();
    expect(screen.getByText('Не сдан')).toBeInTheDocument();
    expect(screen.getByText('Текущий')).toBeInTheDocument();
    expect(screen.getByText('Будущий')).toBeInTheDocument();
  });

  it('renders the «Мои проекты» section header', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 2, name: 'Мои проекты' })).toBeInTheDocument();
  });

  it('renders project cards for the data returned by the hook', () => {
    renderPage();
    expect(
      screen.getByRole('heading', {
        level: 3,
        name: /Система управления проектным практикумом/,
      }),
    ).toBeInTheDocument();
  });
});
