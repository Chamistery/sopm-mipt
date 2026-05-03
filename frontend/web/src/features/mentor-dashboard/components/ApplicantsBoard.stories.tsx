import type { Meta, StoryObj } from '@storybook/react';

import type {
  ApplicantPriorityBuckets,
  ApplicantTeamBucket,
} from '@/api/applications';
import { ApplicantsBoard } from './ApplicantsBoard';

const meta = {
  title: 'MentorDashboard/ApplicantsBoard',
  component: ApplicantsBoard,
  parameters: { backgrounds: { default: 'app' }, layout: 'fullscreen' },
} satisfies Meta<typeof ApplicantsBoard>;

export default meta;
type Story = StoryObj<typeof meta>;

const empty: ApplicantPriorityBuckets = {
  priority1: [],
  priority2: [],
  priority3: [],
  priority4: [],
  priority5: [],
};

const populated: ApplicantPriorityBuckets = {
  priority1: [
    {
      applicationId: 1,
      studentId: 11,
      name: 'Иванов И.',
      course: 2,
      gpa: 4.7,
      status: 'Ожидает',
      teamId: null,
    },
    {
      applicationId: 2,
      studentId: 12,
      name: 'Петрова П.',
      course: 2,
      gpa: 4.4,
      status: 'Рекомендован',
      teamId: 1,
    },
  ],
  priority2: [
    {
      applicationId: 3,
      studentId: 13,
      name: 'Кузнецов К.',
      course: 2,
      gpa: 4.1,
      status: 'Ожидает',
      teamId: null,
    },
  ],
  priority3: [],
  priority4: [
    {
      applicationId: 4,
      studentId: 14,
      name: 'Смирнов С.',
      course: 2,
      gpa: 3.8,
      status: 'Принято ментором',
      teamId: 1,
    },
  ],
  priority5: [],
};

const teams: ApplicantTeamBucket[] = [
  {
    teamId: 1,
    name: 'Команда 1',
    maxSize: 4,
    members: [
      { applicationId: 2, studentId: 12, name: 'Петрова П.', status: 'Рекомендован' },
      { applicationId: 4, studentId: 14, name: 'Смирнов С.', status: 'Принято ментором' },
    ],
  },
  { teamId: 2, name: 'Команда 2', maxSize: 4, members: [] },
];

export const Empty: Story = {
  args: {
    qualified: empty,
    unqualified: empty,
    teams: [],
    onRecommend: () => {},
    onUnrecommend: () => {},
    onInvite: () => {},
  },
};

export const Loaded: Story = {
  args: {
    qualified: populated,
    unqualified: empty,
    teams,
    onRecommend: () => {},
    onUnrecommend: () => {},
    onInvite: () => {},
  },
};

export const WithUnqualified: Story = {
  args: {
    qualified: populated,
    unqualified: {
      ...empty,
      priority3: [
        {
          applicationId: 9,
          studentId: 19,
          name: 'Иной И.',
          course: 1,
          gpa: 3.0,
          status: 'Не подходит',
          teamId: null,
        },
      ],
    },
    teams,
    onRecommend: () => {},
    onUnrecommend: () => {},
    onInvite: () => {},
  },
};

export const NoTeamsYet: Story = {
  args: {
    qualified: populated,
    unqualified: empty,
    teams: [],
    onRecommend: () => {},
    onUnrecommend: () => {},
    onInvite: () => {},
  },
};
