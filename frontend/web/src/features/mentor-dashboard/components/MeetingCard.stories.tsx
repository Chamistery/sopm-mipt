import type { Meta, StoryObj } from '@storybook/react';

import { MeetingCard } from './MeetingCard';

const meta = {
  title: 'mentor-dashboard/MeetingCard',
  component: MeetingCard,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof MeetingCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PendingByTeamLead: Story = {
  args: {
    meeting: {
      id: 1,
      teamId: 1,
      title: 'Обзор спринта 2',
      description:
        'Обсуждение результатов спринта 2. Демо работающего API и макета дашборда. Планирование спринта 3.',
      meetingDate: '2026-04-01',
      startTime: '16:00',
      durationMinutes: 60,
      conferenceLink: 'https://zoom.us/j/12345',
      status: 'Ожидает подтверждения',
    },
    canMentorAct: true,
    isPast: false,
    createdByLabel: 'Стародубов А. (тимлид)',
  },
};

export const ConfirmedFuture: Story = {
  args: {
    meeting: {
      id: 2,
      teamId: 1,
      title: 'Постановка спринта 3',
      description: 'Постановка задач на спринт 3. Распределение ролей, уточнение приоритетов.',
      meetingDate: '2026-04-08',
      startTime: '15:00',
      durationMinutes: 45,
      status: 'Подтверждена',
    },
    canMentorAct: true,
    isPast: false,
    createdByLabel: 'Тимохин В.Н. (ментор)',
  },
};

export const PastWithSummary: Story = {
  args: {
    meeting: {
      id: 3,
      teamId: 1,
      title: 'Постановка спринта 2',
      meetingDate: '2026-03-17',
      startTime: '16:00',
      durationMinutes: 60,
      summary:
        'Определены приоритеты: OAuth-авторизация, API проектов, макет дашборда. Стародубов берёт бэкенд, Кузнецов — фронт.',
      status: 'Состоялась',
    },
    canMentorAct: true,
    isPast: true,
    createdByLabel: 'Тимохин В.Н. (ментор)',
  },
};

export const PastWithoutSummary: Story = {
  args: {
    meeting: {
      id: 4,
      teamId: 1,
      title: 'Стендап',
      meetingDate: '2026-03-10',
      startTime: '11:00',
      durationMinutes: 30,
      status: 'Состоялась',
    },
    canMentorAct: true,
    isPast: true,
    createdByLabel: 'Стародубов А. (тимлид)',
  },
};

export const Declined: Story = {
  args: {
    meeting: {
      id: 5,
      teamId: 1,
      title: 'Стихийный созвон по релизу',
      meetingDate: '2026-04-15',
      startTime: '20:00',
      durationMinutes: 60,
      mentorDeclineReason: 'Не работаем в нерабочее время — перенесите на 18:00 в будний день.',
      status: 'Отклонена',
    },
    canMentorAct: false,
    isPast: false,
    createdByLabel: 'Стародубов А. (тимлид)',
  },
};
