import type { Meta, StoryObj } from '@storybook/react';

import type { TaskDto, TeamMemberDto } from '@/api/teams';
import { MentorTaskPopup } from './MentorTaskPopup';

const meta = {
  title: 'MentorDashboard/MentorTaskPopup',
  component: MentorTaskPopup,
  parameters: { backgrounds: { default: 'app' }, layout: 'fullscreen' },
} satisfies Meta<typeof MentorTaskPopup>;

export default meta;
type Story = StoryObj<typeof meta>;

const member: TeamMemberDto = {
  userId: 11,
  firstName: 'Анна',
  lastName: 'Лебедева',
  middleName: 'Сергеевна',
  role: 'student',
  isLeader: false,
};

const baseTask: TaskDto = {
  id: 100,
  teamId: 1,
  sprintId: 1,
  assigneeId: 11,
  name: 'API уведомлений',
  description:
    'Реализовать сервис уведомлений: REST + WebSocket, базовая шина по ролям.',
  status: 'На ревью',
  hours: 12,
  startDate: '2026-03-20',
  endDate: '2026-03-30',
  mr: '!122',
  workDescription: 'Сделал REST + WS, покрытие тестами 78%, доку в README.',
  mentorComments: [
    { action: 'Аппрув', text: 'Берём базовую шину по ролям.' },
  ],
};

const baseArgs = {
  open: true,
  members: [member],
  todayIso: '2026-03-30',
  onSubmit: () => {},
  onClose: () => {},
};

export const PendingApproval: Story = {
  args: { ...baseArgs, task: { ...baseTask, status: 'Ожидает аппрува', workDescription: null, mr: null, mentorComments: [] } },
};

export const OnReview: Story = {
  args: { ...baseArgs, task: baseTask },
};

export const ReadonlyDone: Story = {
  args: {
    ...baseArgs,
    task: {
      ...baseTask,
      status: 'Готово',
      mentorComments: [
        { action: 'Аппрув', text: 'OK.' },
        { action: 'Принятие', text: 'Чисто, мерджим.' },
      ],
    },
  },
};

export const ReadonlyAssigned: Story = {
  args: {
    ...baseArgs,
    task: {
      ...baseTask,
      status: 'Назначена',
      workDescription: null,
      mr: null,
      mentorComments: [{ action: 'Аппрув', text: 'Приоритет — fronend.' }],
    },
  },
};

export const SubmittingError: Story = {
  args: {
    ...baseArgs,
    task: baseTask,
    isSubmitting: true,
    serverError: 'Ошибка 409: задача уже изменена',
  },
};
