import type { Meta, StoryObj } from '@storybook/react';

import type { TaskDto, TeamMemberDto } from '@/api/teams';
import { TaskPopup } from './TaskPopup';

const MEMBERS: TeamMemberDto[] = [
  {
    userId: 1,
    firstName: 'Александр',
    lastName: 'Стародубов',
    middleName: 'Юрьевич',
    role: 'student',
    isLeader: false,
  },
  {
    userId: 2,
    firstName: 'Михаил',
    lastName: 'Кузнецов',
    role: 'teamlead',
    isLeader: true,
  },
];

const OWN_TASK: TaskDto = {
  id: 101,
  teamId: 1,
  sprintId: 1,
  assigneeId: 1,
  name: 'REST API для управления проектами',
  description: 'CRUD-эндпоинты + права доступа.',
  status: 'В работе',
  hours: 16,
  startDate: '2026-04-01',
  endDate: '2026-04-08',
  mr: '!42',
  workDescription: null,
};

const FOREIGN_TASK: TaskDto = {
  ...OWN_TASK,
  id: 102,
  assigneeId: 2,
  name: 'Дашборд ментора',
};

const LOCKED_TASK: TaskDto = {
  ...OWN_TASK,
  id: 103,
  status: 'Готово',
  workDescription: 'Сделал, MR смержили.',
  wasOverdue: true,
};

const noopCallbacks = {
  onAutoSave: async (): Promise<boolean> => false,
  onSubmitForReview: async (): Promise<void> => {},
  onCancelTask: async (): Promise<void> => {},
  onCreateTask: async (): Promise<void> => {},
};

const meta = {
  title: 'StudentProject/TaskPopup',
  component: TaskPopup,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof TaskPopup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OwnEditable: Story = {
  args: {
    open: true,
    task: OWN_TASK,
    members: MEMBERS,
    currentUserId: 1,
    canEditAll: false,
    todayIso: '2026-04-05',
    callbacks: noopCallbacks,
    onClose: () => {},
  },
};

export const ForeignReadonly: Story = {
  args: {
    open: true,
    task: FOREIGN_TASK,
    members: MEMBERS,
    currentUserId: 1,
    canEditAll: false,
    todayIso: '2026-04-05',
    callbacks: noopCallbacks,
    onClose: () => {},
  },
};

export const LockedDone: Story = {
  args: {
    open: true,
    task: LOCKED_TASK,
    members: MEMBERS,
    currentUserId: 1,
    canEditAll: false,
    todayIso: '2026-04-12',
    callbacks: noopCallbacks,
    onClose: () => {},
  },
};

export const CreateNew: Story = {
  args: {
    open: true,
    task: null,
    newDraft: { assigneeId: 1, startDate: '2026-04-01', endDate: '2026-04-13' },
    members: MEMBERS,
    currentUserId: 1,
    canEditAll: false,
    todayIso: '2026-04-05',
    callbacks: noopCallbacks,
    onClose: () => {},
  },
};
