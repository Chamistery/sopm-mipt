import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { Sprint, Team } from '@/api/teams';
import type { SprintScore } from '@/api/sprintScores';
import type { TeamReport } from '@/api/teamReports';

import { MentorTeamReportsTab } from './MentorTeamReportsTab';

function makeWrapper(opts: {
  team: Team;
  sprints: Sprint[];
  reports: TeamReport[];
  scoresBySprintId?: Record<number, SprintScore[]>;
}) {
  return function Wrapper(): JSX.Element {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    client.setQueryData(['team', opts.team.id], opts.team);
    client.setQueryData(['team', opts.team.id, 'reports'], opts.reports);
    client.setQueryData(['project', opts.team.projectId, 'sprints'], opts.sprints);
    for (const [sprintId, scores] of Object.entries(opts.scoresBySprintId ?? {})) {
      client.setQueryData(['sprint-scores', opts.team.id, Number(sprintId)], scores);
    }
    return (
      <QueryClientProvider client={client}>
        <MentorTeamReportsTab teamId={opts.team.id} />
      </QueryClientProvider>
    );
  };
}

const TEAM: Team = {
  id: 300,
  projectId: 100,
  name: 'Команда «СУПП»',
  leaderId: 3,
  members: [
    {
      id: 401,
      teamId: 300,
      userId: 3,
      isLeader: true,
      roleInTeam: 'Тимлид',
      user: {
        id: 3,
        firstName: 'Алексей',
        lastName: 'Стародубов',
        middleName: 'Юрьевич',
        email: 'as@x',
        role: 'teamlead',
      },
    },
    {
      id: 402,
      teamId: 300,
      userId: 4,
      isLeader: false,
      roleInTeam: 'Backend',
      user: {
        id: 4,
        firstName: 'Михаил',
        lastName: 'Кузнецов',
        middleName: '',
        email: 'mk@x',
        role: 'student',
      },
    },
  ],
};

const SPRINTS: Sprint[] = [
  { id: 200, projectId: 100, number: 1, startDate: '2026-02-24', endDate: '2026-03-16', status: 'Завершён' },
  { id: 201, projectId: 100, number: 2, startDate: '2026-03-17', endDate: '2026-04-06', status: 'Активный' },
];

const REPORTS_BOTH: TeamReport[] = [
  {
    id: 600,
    sprintId: 201,
    teamId: 300,
    summary: 'Закончили auth, собираем UI каталога.',
    problems: 'Нет публичной части без логина.',
    nextPlan: 'Подключить MSW и e2e.',
    status: 'Отправлен',
  },
  {
    id: 601,
    sprintId: 200,
    teamId: 300,
    summary: 'Развёрнута начальная структура проекта.',
    problems: 'Долго выбирали стек.',
    nextPlan: 'Доменные модели.',
    status: 'Проверен',
    mentorComment: 'Хороший старт.',
  },
];

const meta: Meta<typeof MentorTeamReportsTab> = {
  title: 'mentor-dashboard/MentorTeamReportsTab',
  component: MentorTeamReportsTab,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const TwoSprints: Story = {
  args: { teamId: 300 },
  render: () => {
    const Wrapper = makeWrapper({
      team: TEAM,
      sprints: SPRINTS,
      reports: REPORTS_BOTH,
      scoresBySprintId: {
        200: [
          { id: 1, sprintId: 200, teamId: 300, studentId: 3, score: 9, category: 'mentor', scoredById: 1 },
          { id: 2, sprintId: 200, teamId: 300, studentId: 4, score: 7, category: 'mentor', scoredById: 1 },
        ],
      },
    });
    return <Wrapper />;
  },
};

export const OnlyCurrent: Story = {
  args: { teamId: 300 },
  render: () => {
    const Wrapper = makeWrapper({
      team: TEAM,
      sprints: SPRINTS,
      reports: [REPORTS_BOTH[0]!],
    });
    return <Wrapper />;
  },
};

export const Empty: Story = {
  args: { teamId: 300 },
  render: () => {
    const Wrapper = makeWrapper({ team: TEAM, sprints: SPRINTS, reports: [] });
    return <Wrapper />;
  },
};
