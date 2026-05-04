import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import type { Project } from '@/api/projects';
import type { Team } from '@/api/teams';
import { MentorTeamPage } from './MentorTeamPage';

const TEAM_ID = 300;
const PROJECT_ID = 100;

const PROJECT: Project = {
  id: PROJECT_ID,
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

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: TEAM_ID,
    projectId: PROJECT_ID,
    name: 'Команда 1',
    leaderId: null,
    leader: null,
    members: [
      {
        id: 1,
        teamId: TEAM_ID,
        userId: 3,
        isLeader: false,
        roleInTeam: 'Backend',
        user: TEAMLEAD,
      },
      {
        id: 2,
        teamId: TEAM_ID,
        userId: 4,
        isLeader: false,
        roleInTeam: 'Frontend',
        user: { id: 4, firstName: 'Алексей', lastName: 'Стародубов', middleName: null, email: 's@x', role: 'student' },
      },
      {
        id: 3,
        teamId: TEAM_ID,
        userId: 5,
        isLeader: false,
        roleInTeam: 'Аналитик',
        user: { id: 5, firstName: 'Мария', lastName: 'Иванова', middleName: null, email: 's2@x', role: 'student' },
      },
    ],
    ...overrides,
  };
}

interface SeedArgs {
  team?: Team;
  reports?: unknown[];
  scoresBySprint?: Record<number, unknown[]>;
}

function seedClient({ team = makeTeam(), reports = [], scoresBySprint = {} }: SeedArgs): QueryClient {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  client.setQueryData(['team', TEAM_ID], team);
  client.setQueryData(['project', PROJECT_ID], PROJECT);
  client.setQueryData(['project', PROJECT_ID, 'sprints'], []);
  client.setQueryData(['team', TEAM_ID, 'reports'], reports);
  for (const [sprintId, scores] of Object.entries(scoresBySprint)) {
    client.setQueryData(['sprint-scores', TEAM_ID, Number(sprintId)], scores);
  }
  return client;
}

function withProviders(client: QueryClient, initialPath: string) {
  return (Story: () => JSX.Element): JSX.Element => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/mentor/teams/:teamId" element={<Story />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const meta = {
  title: 'MentorDashboard/MentorTeamPage',
  component: MentorTeamPage,
  parameters: { layout: 'fullscreen', backgrounds: { default: 'app' } },
} satisfies Meta<typeof MentorTeamPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TabGantt_NoLeader: Story = {
  decorators: [withProviders(seedClient({}), `/mentor/teams/${TEAM_ID}`)],
};

export const TabGantt_WithLeader: Story = {
  decorators: [
    withProviders(
      seedClient({ team: makeTeam({ leaderId: 3, leader: TEAMLEAD }) }),
      `/mentor/teams/${TEAM_ID}`,
    ),
  ],
};

export const TabReports_Empty: Story = {
  decorators: [
    withProviders(
      seedClient({ team: makeTeam({ leaderId: 3, leader: TEAMLEAD }) }),
      `/mentor/teams/${TEAM_ID}?tab=reports`,
    ),
  ],
};

export const TabMeetings_Placeholder: Story = {
  decorators: [
    withProviders(
      seedClient({ team: makeTeam({ leaderId: 3, leader: TEAMLEAD }) }),
      `/mentor/teams/${TEAM_ID}?tab=meetings`,
    ),
  ],
};
