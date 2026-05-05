import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import * as teamsApi from '@/api/teams';
import type { Project } from '@/api/projects';
import type { Team } from '@/api/teams';
import { ToastProvider } from '@/_shared/Toast';
import { MentorTeamPage } from './MentorTeamPage';

const PROJECT: Project = {
  id: 100,
  title: 'СУПП ВШПИ МФТИ',
  status: 'Активный',
  mentorId: 1,
  company: 'МФТИ',
  teamSizeMin: 3,
  teamSizeMax: 5,
  numTeams: 1,
  createdAt: '2026-02-01T08:00:00Z',
  updatedAt: '2026-02-01T08:00:00Z',
};

const TEAMLEAD = {
  id: 3,
  firstName: 'Иван',
  lastName: 'Петров',
  middleName: 'Алексеевич',
  email: 't@x',
  role: 'teamlead' as const,
};
const STUDENT_A = {
  id: 4,
  firstName: 'Алексей',
  lastName: 'Стародубов',
  middleName: null,
  email: 's@x',
  role: 'student' as const,
};

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: 300,
    projectId: 100,
    name: 'Команда 1',
    leaderId: null,
    leader: null,
    members: [
      {
        id: 1,
        teamId: 300,
        userId: 3,
        isLeader: false,
        roleInTeam: 'Backend',
        user: TEAMLEAD,
      },
      {
        id: 2,
        teamId: 300,
        userId: 4,
        isLeader: false,
        roleInTeam: 'Frontend',
        user: STUDENT_A,
      },
    ],
    ...overrides,
  };
}

function renderAt(initialPath: string, team: Team = makeTeam()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  client.setQueryData(['team', 300], team);
  client.setQueryData(['project', 100], PROJECT);
  client.setQueryData(['project', 100, 'sprints'], []);
  client.setQueryData(['meetings', 300], []);
  client.setQueryData(['team', 300, 'reports'], []);
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/mentor/teams/:teamId" element={<MentorTeamPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('MentorTeamPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders team name, project subtitle, breadcrumbs and three tabs', async () => {
    renderAt('/mentor/teams/300');

    expect(await screen.findByRole('heading', { name: 'Команда 1' })).toBeInTheDocument();
    expect(screen.getAllByText('СУПП ВШПИ МФТИ').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Дашборд' })).toHaveAttribute('href', '/mentor');
    expect(screen.getByRole('tab', { name: 'Диаграмма Ганта' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'Отчёты по спринтам' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Встречи' })).toBeInTheDocument();
  });

  it('shows the leader-hint banner and «Сделать тимлидом» buttons when leader is unassigned', async () => {
    renderAt('/mentor/teams/300');

    expect(
      await screen.findByText(/Тимлид ещё не назначен/),
    ).toBeInTheDocument();
    const buttons = screen.getAllByRole('button', { name: /Сделать тимлидом/ });
    expect(buttons).toHaveLength(2);
  });

  it('hides «Сделать тимлидом» buttons when leader is already assigned', async () => {
    renderAt(
      '/mentor/teams/300',
      makeTeam({ leaderId: 3, leader: TEAMLEAD }),
    );

    expect(await screen.findByRole('heading', { name: 'Команда 1' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Сделать тимлидом/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Тимлид ещё не назначен/)).not.toBeInTheDocument();
  });

  it('selects the meetings tab when ?tab=meetings and renders the meetings sections', async () => {
    renderAt('/mentor/teams/300?tab=meetings');

    expect(await screen.findByRole('heading', { name: 'Команда 1' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Встречи' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { name: 'Встречи команды' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Назначить встречу/ })).toBeInTheDocument();
  });

  it('calls assignTeamLeader with teamId and userId when «Сделать тимлидом» is clicked', async () => {
    const assignSpy = vi
      .spyOn(teamsApi, 'assignTeamLeader')
      .mockResolvedValue(makeTeam({ leaderId: 3, leader: TEAMLEAD }));
    const user = userEvent.setup();
    renderAt('/mentor/teams/300');

    const buttons = await screen.findAllByRole('button', { name: /Сделать тимлидом/ });
    await user.click(buttons[0]!);

    await waitFor(() => {
      expect(assignSpy).toHaveBeenCalledWith(300, 3);
    });
  });
});
