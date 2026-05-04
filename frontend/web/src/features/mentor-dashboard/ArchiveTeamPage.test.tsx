import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { Team } from '@/api/teams';
import { ArchiveTeamPage } from './ArchiveTeamPage';

const ARCHIVE_TEAM: Team = {
  id: 310,
  projectId: 110,
  name: 'Команда «Кампус-2»',
  leaderId: 3,
  leader: {
    id: 3,
    firstName: 'Иван',
    lastName: 'Петров',
    middleName: 'Алексеевич',
    email: 't@x',
    role: 'teamlead',
  },
  members: [
    {
      id: 1,
      teamId: 310,
      userId: 3,
      isLeader: true,
      roleInTeam: 'Тимлид',
      user: { id: 3, firstName: 'Иван', lastName: 'Петров', middleName: null, email: 't@x', role: 'teamlead' },
    },
    {
      id: 2,
      teamId: 310,
      userId: 4,
      isLeader: false,
      roleInTeam: 'Backend',
      user: { id: 4, firstName: 'Алексей', lastName: 'Стародубов', middleName: null, email: 's@x', role: 'student' },
    },
  ],
};

const PROJECT = {
  project: {
    id: 110,
    title: 'Архивный: Цифровой двойник кампуса',
    status: 'Завершён' as const,
    mentorId: 1,
    teamSizeMin: 3,
    teamSizeMax: 5,
    numTeams: 1,
    createdAt: '2025-09-01T08:00:00Z',
    updatedAt: '2025-10-30T08:00:00Z',
  },
  sprints: [
    { id: 220, projectId: 110, number: 1, startDate: '2025-09-15', endDate: '2025-10-05', status: 'Завершён' as const },
    { id: 221, projectId: 110, number: 2, startDate: '2025-10-06', endDate: '2025-10-26', status: 'Завершён' as const },
  ],
  teams: [ARCHIVE_TEAM],
};

function renderWithRoute(ui: () => JSX.Element, initialPath: string, scores: Array<{ id: number; sprintId: number; teamId: number; studentId: number; score: number; scoredById: number }>) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['team', 310], ARCHIVE_TEAM);
  client.setQueryData(['project', 110, 'full'], PROJECT);
  client.setQueryData(['project', 110, 'sprints'], PROJECT.sprints);
  client.setQueryData(['team', 310, 'sprint-scores', 'archive'], scores);
  client.setQueryData(['team', 310, 'gantt', 221], {
    team: { id: 310, name: ARCHIVE_TEAM.name },
    sprint: PROJECT.sprints[1],
    members: [],
    tasks: [],
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/mentor/archive/teams/:teamId" element={ui()} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ArchiveTeamPage', () => {
  it('renders banner, team name, default tab and computed final grade', async () => {
    renderWithRoute(
      () => <ArchiveTeamPage />,
      '/mentor/archive/teams/310',
      [
        { id: 1, sprintId: 220, teamId: 310, studentId: 3, score: 5, scoredById: 1 },
        { id: 2, sprintId: 220, teamId: 310, studentId: 4, score: 4, scoredById: 1 },
        { id: 3, sprintId: 221, teamId: 310, studentId: 3, score: 5, scoredById: 1 },
      ],
    );

    expect(await screen.findByRole('heading', { name: 'Команда «Кампус-2»' })).toBeInTheDocument();
    // Banner has role=note (also see «Проект завершён»)
    const banner = screen.getByRole('note');
    expect(banner).toHaveTextContent(/Проект.*завершён/);
    // Average of [5, 4, 5] = 4.6666 → 4.7
    expect(screen.getByTestId('archive-final-grade')).toHaveTextContent('Оценка: 4.7');
    // Default tab is «Итоговая диаграмма» (aria-selected=true)
    expect(screen.getByRole('tab', { name: 'Итоговая диаграмма' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('shows «—» when no sprint scores are available', () => {
    renderWithRoute(() => <ArchiveTeamPage />, '/mentor/archive/teams/310', []);
    expect(screen.getByTestId('archive-final-grade')).toHaveTextContent('Оценка: —');
  });
});
