import type { Meta, StoryObj } from '@storybook/react';

import { DistPoolChip } from './DistPoolChip';

const meta: Meta<typeof DistPoolChip> = {
  title: 'Mentor Distribution / DistPoolChip',
  component: DistPoolChip,
  decorators: [
    (Story) => (
      <div style={{ padding: 24, background: 'var(--color-surface, #f0f2f7)' }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof DistPoolChip>;

export const Qualified: Story = {
  args: {
    item: {
      applicationId: 1,
      studentId: 12,
      name: 'Иванова Мария',
      course: 3,
      gpa: 7.8,
      status: 'Ожидает',
      teamId: null,
    },
    projectId: 1,
    priority: 1,
    qualified: true,
    group: 'Б05-322',
  },
};

export const Unqualified: Story = {
  args: {
    item: {
      applicationId: 2,
      studentId: 22,
      name: 'Орлов Владимир',
      course: 1,
      gpa: 4.8,
      status: 'Не подходит',
      teamId: null,
    },
    projectId: 1,
    priority: 3,
    qualified: false,
    group: 'Б05-111',
  },
};

export const HighPriorityHighGPA: Story = {
  args: {
    item: {
      applicationId: 3,
      studentId: 33,
      name: 'Белова Светлана',
      course: 2,
      gpa: 8.4,
      status: 'Ожидает',
      teamId: null,
    },
    projectId: 1,
    priority: 1,
    qualified: true,
    group: 'Б05-321',
  },
};
