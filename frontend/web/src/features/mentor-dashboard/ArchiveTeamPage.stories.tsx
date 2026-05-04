import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import type { Sprint, Team } from '@/api/teams';
import type { SprintScore } from '@/api/sprintScores';
import type { TeamReport } from '@/api/teamReports';
import type { Meeting } from '@/api/types';
import type { ProjectFull } from '@/api/projects';
import { ArchiveTeamPage } from './ArchiveTeamPage';

const TEAM_ID = 310;
const PROJECT_ID = 110;

const TEAM: Team = {
  id: TEAM_ID,
  projectId: PROJECT_ID,
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
      teamId: TEAM_ID,
      userId: 3,
      isLeader: true,
      roleInTeam: 'Тимлид',
      user: { id: 3, firstName: 'Иван', lastName: 'Петров', middleName: null, email: 't@x', role: 'teamlead' },
    },
    {
      id: 2,
      teamId: TEAM_ID,
      userId: 4,
      isLeader: false,
      roleInTeam: 'Backend',
      user: { id: 4, firstName: 'Алексей', lastName: 'Стародубов', middleName: null, email: 's@x', role: 'student' },
    },
    {
      id: 3,
      teamId: TEAM_ID,
      userId: 5,
      isLeader: false,
      roleInTeam: 'Frontend',
      user: { id: 5, firstName: 'Мария', lastName: 'Иванова', middleName: null, email: 's2@x', role: 'student' },
    },
  ],
};

const SPRINTS: Sprint[] = [
  { id: 220, projectId: PROJECT_ID, number: 1, startDate: '2025-09-15', endDate: '2025-10-05', status: 'Завершён' },
  { id: 221, projectId: PROJECT_ID, number: 2, startDate: '2025-10-06', endDate: '2025-10-26', status: 'Завершён' },
];

const PROJECT: ProjectFull = {
  project: {
    id: PROJECT_ID,
    title: 'Архивный: Цифровой двойник кампуса',
    status: 'Завершён',
    mentorId: 1,
    company: 'ЦИТ МФТИ',
    teamSizeMin: 3,
    teamSizeMax: 5,
    numTeams: 1,
    createdAt: '2025-09-01T08:00:00Z',
    updatedAt: '2025-10-30T08:00:00Z',
  },
  sprints: SPRINTS,
  teams: [TEAM],
};

const SCORES: SprintScore[] = [
  { id: 1, sprintId: 220, teamId: TEAM_ID, studentId: 3, score: 5, scoredById: 1 },
  { id: 2, sprintId: 220, teamId: TEAM_ID, studentId: 4, score: 4, scoredById: 1 },
  { id: 3, sprintId: 220, teamId: TEAM_ID, studentId: 5, score: 5, scoredById: 1 },
  { id: 4, sprintId: 221, teamId: TEAM_ID, studentId: 3, score: 4, scoredById: 1 },
  { id: 5, sprintId: 221, teamId: TEAM_ID, studentId: 4, score: 5, scoredById: 1 },
  { id: 6, sprintId: 221, teamId: TEAM_ID, studentId: 5, score: 5, scoredById: 1 },
];

const REPORTS: TeamReport[] = [
  {
    id: 1,
    sprintId: 220,
    teamId: TEAM_ID,
    summary: 'Развернули прототип, получили обратную связь.',
    problems: 'Нехватка UX-ресёрча на старте.',
    nextPlan: 'Добавить онбординг.',
    status: 'Проверен',
    mentorComment: 'Хороший старт.',
  },
  {
    id: 2,
    sprintId: 221,
    teamId: TEAM_ID,
    summary: 'Закрыли двойник, передали кодбазу ЦИТ.',
    problems: 'Не успели e2e.',
    nextPlan: '—',
    status: 'Проверен',
  },
];

const MEETINGS: Meeting[] = [
  {
    id: 1,
    teamId: TEAM_ID,
    sprintId: 220,
    title: 'Установочная встреча',
    description: 'Знакомство, критерии приёмки.',
    meetingDate: '2025-09-16',
    startTime: '18:00',
    durationMinutes: 60,
    conferenceLink: 'https://example.test/meet/1',
    status: 'Состоялась',
  },
  {
    id: 2,
    teamId: TEAM_ID,
    sprintId: 221,
    title: 'Демо итогового прототипа',
    description: 'Презентация для ЦИТ.',
    meetingDate: '2025-10-25',
    startTime: '15:00',
    durationMinutes: 45,
    status: 'Состоялась',
  },
];

const TASKS_S2 = [
  {
    id: 561,
    teamId: TEAM_ID,
    sprintId: 221,
    assigneeId: 3,
    name: 'Документация ЦИТ',
    description: null,
    status: 'Готово' as const,
    hours: 6,
    startDate: '2025-10-06',
    endDate: '2025-10-15',
    mr: null,
    workDescription: 'Готово',
  },
  {
    id: 562,
    teamId: TEAM_ID,
    sprintId: 221,
    assigneeId: 5,
    name: 'Демо-страница',
    description: null,
    status: 'Готово' as const,
    hours: 8,
    startDate: '2025-10-10',
    endDate: '2025-10-26',
    mr: null,
    workDescription: 'Готово',
  },
];

const GANTT_S2 = {
  team: { id: TEAM_ID, name: TEAM.name },
  sprint: { id: 221, number: 2, startDate: '2025-10-06', endDate: '2025-10-26', status: 'Завершён' as const },
  members: TEAM.members!.map((m) => ({
    userId: m.userId,
    firstName: m.user.firstName,
    lastName: m.user.lastName,
    middleName: m.user.middleName ?? null,
    role: m.user.role,
    projectRole: m.roleInTeam ?? null,
    isLeader: m.isLeader,
  })),
  tasks: TASKS_S2,
};

interface SeedArgs {
  scores: SprintScore[];
  reports: TeamReport[];
  meetings: Meeting[];
}

function seedClient({ scores, reports, meetings }: SeedArgs): QueryClient {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['team', TEAM_ID], TEAM);
  client.setQueryData(['project', PROJECT_ID, 'full'], PROJECT);
  client.setQueryData(['project', PROJECT_ID, 'sprints'], SPRINTS);
  client.setQueryData(['team', TEAM_ID, 'sprint-scores', 'archive'], scores);
  client.setQueryData(['team', TEAM_ID, 'reports'], reports);
  client.setQueryData(['team', TEAM_ID, 'meetings', 'archive'], meetings);
  client.setQueryData(['team', TEAM_ID, 'gantt', 221], GANTT_S2);
  return client;
}

const meta = {
  title: 'MentorDashboard/ArchiveTeamPage',
  component: ArchiveTeamPage,
  parameters: { layout: 'fullscreen', backgrounds: { default: 'app' } },
} satisfies Meta<typeof ArchiveTeamPage>;

export default meta;
type Story = StoryObj<typeof meta>;

function withProviders(client: QueryClient) {
  return (Story: () => JSX.Element): JSX.Element => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/mentor/archive/teams/${TEAM_ID}`]}>
        <Routes>
          <Route path="/mentor/archive/teams/:teamId" element={<Story />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

export const Default: Story = {
  decorators: [withProviders(seedClient({ scores: SCORES, reports: REPORTS, meetings: MEETINGS }))],
};

export const NoScoresEmpty: Story = {
  decorators: [withProviders(seedClient({ scores: [], reports: [], meetings: [] }))],
};
