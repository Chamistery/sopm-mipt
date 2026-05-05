import type { Meta, StoryObj } from '@storybook/react';

import type { MentorDistributionTeam } from '@/api/mentorDistribution';
import { DistTeamCard } from './DistTeamCard';

const meta: Meta<typeof DistTeamCard> = {
  title: 'Mentor Distribution / DistTeamCard',
  component: DistTeamCard,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 640, padding: 24, background: 'var(--color-surface, #f0f2f7)' }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof DistTeamCard>;

const baseTeam: MentorDistributionTeam = {
  id: 1,
  name: 'Команда 1',
  launched: false,
  members: [],
};

const member = (overrides: Partial<MentorDistributionTeam['members'][number]>): MentorDistributionTeam['members'][number] => ({
  applicationId: 1,
  studentId: 1,
  firstName: 'Иван',
  lastName: 'Иванов',
  course: 2,
  group: 'Б05-200',
  gpa: 7.0,
  priority: 1,
  status: 'Принят',
  qualified: true,
  ...overrides,
});

const noop = (): void => undefined;

export const Empty: Story = {
  args: {
    projectId: 1,
    team: baseTeam,
    maxSize: 5,
    onDropApplicant: noop,
    onRemoveMember: noop,
    onInviteMember: noop,
    onLaunch: noop,
  },
};

export const Partial: Story = {
  args: {
    ...Empty.args,
    team: {
      ...baseTeam,
      members: [
        member({ applicationId: 11, lastName: 'Стародубов', firstName: 'А.', priority: 1, status: 'Принят' }),
        member({ applicationId: 12, lastName: 'Кузнецов', firstName: 'М.', priority: 1, status: 'Принят' }),
        member({ applicationId: 13, lastName: 'Волков', firstName: 'Д.', priority: 2, status: 'Рекомендован', gpa: 6.5 }),
      ],
    },
  },
};

export const ReadyToLaunch: Story = {
  args: {
    ...Empty.args,
    maxSize: 3,
    team: {
      ...baseTeam,
      members: [
        member({ applicationId: 21, lastName: 'Стародубов', status: 'Принят' }),
        member({ applicationId: 22, lastName: 'Кузнецов', status: 'Принят', priority: 1 }),
        member({ applicationId: 23, lastName: 'Лебедева', status: 'Принят', priority: 1, gpa: 8.1 }),
      ],
    },
  },
};

export const WithUnqualified: Story = {
  args: {
    ...Empty.args,
    team: {
      ...baseTeam,
      members: [
        member({ applicationId: 31, lastName: 'Сидоров', firstName: 'К.', gpa: 5.9, priority: 2, qualified: false, status: 'Рекомендован' }),
      ],
    },
  },
};

export const JustLaunched: Story = {
  args: {
    ...ReadyToLaunch.args,
    justLaunched: true,
  },
};
