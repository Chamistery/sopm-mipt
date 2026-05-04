import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

import type * as SprintScoresModule from '@/api/sprintScores';
import type * as TeamReportsModule from '@/api/teamReports';
import type { Sprint, Team } from '@/api/teams';
import type { TeamReport } from '@/api/teamReports';

import { MentorTeamReportsTab } from './MentorTeamReportsTab';

vi.mock('@/auth/useCurrentUser', () => ({
  useRequireUser: () => ({ userId: 1, role: 'mentor', displayName: 'Ментор' }),
}));

vi.mock('@/api/sprintScores', async () => {
  const actual = await vi.importActual<typeof SprintScoresModule>('@/api/sprintScores');
  return {
    ...actual,
    listSprintScores: vi.fn().mockResolvedValue([]),
    createSprintScore: vi.fn().mockResolvedValue({}),
    updateSprintScore: vi.fn().mockResolvedValue({}),
  };
});

vi.mock('@/api/teamReports', async () => {
  const actual = await vi.importActual<typeof TeamReportsModule>('@/api/teamReports');
  return {
    ...actual,
    listTeamReports: vi.fn().mockResolvedValue([]),
    reviewTeamReport: vi.fn().mockResolvedValue({}),
  };
});

const TEAMLEAD = {
  id: 3,
  firstName: 'Иван',
  lastName: 'Петров',
  middleName: 'Алексеевич',
  email: 't@x',
  role: 'teamlead' as const,
};

const TEAM: Team = {
  id: 300,
  projectId: 100,
  name: 'Команда 1',
  leaderId: 3,
  leader: TEAMLEAD,
  members: [
    {
      id: 1,
      teamId: 300,
      userId: 3,
      isLeader: true,
      roleInTeam: 'Тимлид',
      user: TEAMLEAD,
    },
  ],
};

const SPRINTS: Sprint[] = [
  { id: 200, projectId: 100, number: 1, startDate: '2026-02-24', endDate: '2026-03-16', status: 'Завершён' },
  { id: 201, projectId: 100, number: 2, startDate: '2026-03-17', endDate: '2026-04-06', status: 'Активный' },
];

const REPORTS: TeamReport[] = [
  {
    id: 600,
    sprintId: 201,
    teamId: 300,
    summary: 'Auth готов.',
    problems: 'VDI задержка.',
    nextPlan: 'Продолжаем.',
    status: 'Отправлен',
  },
  {
    id: 599,
    sprintId: 200,
    teamId: 300,
    summary: 'Старт.',
    problems: 'Долго выбирали стек.',
    nextPlan: 'Доменные модели.',
    status: 'Проверен',
    mentorComment: 'Хороший старт.',
  },
];

function renderTab(reports: TeamReport[] = REPORTS) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  client.setQueryData(['team', 300], TEAM);
  client.setQueryData(['team', 300, 'reports'], reports);
  client.setQueryData(['project', 100, 'sprints'], SPRINTS);
  for (const r of reports) {
    client.setQueryData(['sprint-scores', 300, r.sprintId], []);
  }
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <MentorTeamReportsTab teamId={300} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('MentorTeamReportsTab', () => {
  it('рендерит две карточки с заголовками по диапазону дат', () => {
    renderTab();
    expect(screen.getByText('Спринт 2 (17 мар — 6 апр)')).toBeInTheDocument();
    expect(screen.getByText('Спринт 1 (24 фев — 16 мар)')).toBeInTheDocument();
  });

  it('текущий спринт развёрнут, прошедший — свёрнут по дефолту', () => {
    renderTab();
    const headers = screen.getAllByRole('button', { expanded: true });
    // Текущий — sprint 201 (Активный) → header expanded; прошедший — collapsed
    const expandedTitles = headers
      .map((b) => b.textContent ?? '')
      .filter((t) => t.includes('Спринт'));
    expect(expandedTitles.some((t) => t.includes('Спринт 2'))).toBe(true);
    const collapsed = screen
      .getAllByRole('button', { expanded: false })
      .map((b) => b.textContent ?? '')
      .filter((t) => t.includes('Спринт'));
    expect(collapsed.some((t) => t.includes('Спринт 1'))).toBe(true);
  });

  it('кнопка «Выгрузить отчёт» открывает модалку, «Скачать» закрывает с баннером', async () => {
    renderTab();
    await userEvent.click(screen.getByRole('button', { name: /Выгрузить отчёт/ }));
    expect(screen.getByRole('dialog', { name: 'Выгрузить отчёт' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Скачать' }));
    expect(screen.queryByRole('dialog', { name: 'Выгрузить отчёт' })).not.toBeInTheDocument();
    expect(screen.getByText('Отчёт сформирован')).toBeInTheDocument();
  });

  it('пустое состояние если нет отчётов', () => {
    renderTab([]);
    expect(screen.getByText(/Команда ещё не отправляла отчётов/)).toBeInTheDocument();
  });
});
