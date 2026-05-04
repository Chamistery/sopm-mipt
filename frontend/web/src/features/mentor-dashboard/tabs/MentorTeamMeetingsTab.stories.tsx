import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { Meeting } from '@/api/types';
import type { Team } from '@/api/teams';

import { MentorTeamMeetingsTab } from './MentorTeamMeetingsTab';

const TEAMLEAD = {
  id: 3,
  firstName: 'Александр',
  lastName: 'Стародубов',
  middleName: 'Юрьевич',
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
      roleInTeam: 'Backend',
      user: TEAMLEAD,
    },
  ],
};

const FUTURE_DATE = '2099-04-01';
const PAST_DATE = '2020-03-17';

const UPCOMING_MEETINGS: Meeting[] = [
  {
    id: 1,
    teamId: 300,
    title: 'Обзор спринта 2',
    description: 'Демо API, дашборда, планирование спринта 3.',
    meetingDate: FUTURE_DATE,
    startTime: '16:00',
    durationMinutes: 60,
    conferenceLink: 'https://zoom.us/j/12345',
    createdById: 3,
    status: 'Ожидает подтверждения',
  },
  {
    id: 2,
    teamId: 300,
    title: 'Постановка спринта 3',
    description: 'Распределение задач и приоритетов.',
    meetingDate: '2099-04-08',
    startTime: '15:00',
    durationMinutes: 45,
    createdById: 3,
    status: 'Подтверждена',
  },
];

const PAST_MEETINGS: Meeting[] = [
  {
    id: 3,
    teamId: 300,
    title: 'Постановка спринта 2',
    meetingDate: PAST_DATE,
    startTime: '16:00',
    durationMinutes: 60,
    createdById: 3,
    summary:
      'Определены приоритеты на спринт 2: OAuth-авторизация, API проектов, макет дашборда.',
    status: 'Состоялась',
  },
  {
    id: 4,
    teamId: 300,
    title: 'Обзор спринта 1',
    meetingDate: '2020-03-14',
    startTime: '16:00',
    durationMinutes: 45,
    createdById: 3,
    summary: 'Демо структуры проекта и прототипа UI.',
    status: 'Состоялась',
  },
];

function withClient(meetings: Meeting[]) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  client.setQueryData(['team', 300], TEAM);
  client.setQueryData(['meetings', 300], meetings);
  return (Story: () => JSX.Element): JSX.Element => (
    <QueryClientProvider client={client}>
      <Story />
    </QueryClientProvider>
  );
}

const meta = {
  title: 'mentor-dashboard/MentorTeamMeetingsTab',
  component: MentorTeamMeetingsTab,
  parameters: { layout: 'padded' },
  args: { teamId: 300 },
} satisfies Meta<typeof MentorTeamMeetingsTab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [withClient([...UPCOMING_MEETINGS, ...PAST_MEETINGS])],
};

export const Empty: Story = {
  decorators: [withClient([])],
};

export const OnlyUpcoming: Story = {
  decorators: [withClient(UPCOMING_MEETINGS)],
};

export const OnlyPast: Story = {
  decorators: [withClient(PAST_MEETINGS)],
};
