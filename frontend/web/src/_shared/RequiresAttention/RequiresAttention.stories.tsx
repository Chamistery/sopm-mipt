import type { Meta, StoryObj } from '@storybook/react';

import type { Notification } from '@/api/notifications';
import { RequiresAttentionView } from './RequiresAttention';

const meta = {
  title: 'Shared/RequiresAttention',
  component: RequiresAttentionView,
  parameters: { backgrounds: { default: 'app' } },
  args: {
    title: 'Требует внимания',
    isLoading: false,
  },
} satisfies Meta<typeof RequiresAttentionView>;

export default meta;
type Story = StoryObj<typeof meta>;

const NOW = '2026-05-04T12:00:00Z';

function n(over: Partial<Notification> & { id: string }): Notification {
  return {
    kind: 'task_status',
    severity: 'info',
    title: 'Notification',
    createdAt: NOW,
    isRead: false,
    ...over,
  };
}

export const Empty: Story = {
  args: {
    items: [],
  },
};

export const Loading: Story = {
  args: {
    items: [],
    isLoading: true,
  },
};

export const ActionRequiredOnly: Story = {
  args: {
    items: [
      n({
        id: '1',
        kind: 'mentor_task_attention',
        severity: 'warning',
        title: 'Новая задача на аппрув: «Аналитика пользовательских сценариев»',
        body: 'Лебедев Н., Команда 1 · СУПП ВШПИ',
        link: '/student/project',
        createdAt: '2026-05-04T10:00:00Z',
      }),
      n({
        id: '2',
        kind: 'task_for_review',
        severity: 'warning',
        title: 'Задача на ревью: «Интеграция с OAuth МФТИ»',
        body: 'Стародубов А., Команда 1',
        link: '/student/project',
        createdAt: '2026-05-04T07:00:00Z',
      }),
    ],
  },
};

export const Mixed: Story = {
  args: {
    items: [
      n({
        id: '1',
        kind: 'mentor_task_attention',
        severity: 'warning',
        title: 'Новая задача на аппрув: «Аналитика пользовательских сценариев»',
        body: 'Лебедев Н., Команда 1 · СУПП ВШПИ',
        link: '/student/project',
        createdAt: '2026-05-04T10:00:00Z',
      }),
      n({
        id: '2',
        kind: 'application_invite',
        severity: 'info',
        title: 'Новое приглашение в проект',
        body: 'Ментор Иванов И. приглашает вас в проект «Мобильное расписание»',
        link: '/student/catalog',
        createdAt: '2026-05-04T09:00:00Z',
      }),
      n({
        id: '3',
        kind: 'task_approved',
        severity: 'success',
        title: 'Задача одобрена ментором',
        body: 'Аналитика пользовательских сценариев',
        createdAt: '2026-05-03T15:00:00Z',
      }),
      n({
        id: '4',
        kind: 'student_accepted_invite',
        severity: 'success',
        title: 'Студент принял приглашение',
        body: 'Кузнецов М. — проект СУПП ВШПИ, Команда 1',
        createdAt: '2026-05-03T11:00:00Z',
      }),
    ],
  },
};

export const Many: Story = {
  args: {
    items: [
      ...Array.from({ length: 4 }, (_, i) =>
        n({
          id: `a-${i}`,
          kind: 'mentor_task_attention',
          severity: 'warning',
          title: `Новая задача на аппрув #${i + 1}`,
          body: 'Команда 1 · СУПП ВШПИ',
          link: '/student/project',
          createdAt: `2026-05-04T${String(10 - i).padStart(2, '0')}:00:00Z`,
        }),
      ),
      ...Array.from({ length: 6 }, (_, i) =>
        n({
          id: `i-${i}`,
          kind: 'task_approved',
          severity: 'success',
          title: `Задача одобрена ментором #${i + 1}`,
          body: 'Команда 1',
          createdAt: `2026-05-0${3 - Math.floor(i / 3)}T${String(10 - i).padStart(2, '0')}:00:00Z`,
        }),
      ),
    ],
  },
};

export const DangerSeverity: Story = {
  args: {
    items: [
      n({
        id: 'd1',
        kind: 'task_rejected',
        severity: 'danger',
        title: 'Задача отклонена ментором',
        body: 'Интеграция с OAuth МФТИ — переделать обработку refresh-токена',
        link: '/student/project',
        createdAt: '2026-05-04T11:00:00Z',
      }),
      n({
        id: 'd2',
        kind: 'student_declined_invite',
        severity: 'danger',
        title: 'Студент отклонил приглашение',
        body: 'Григорьев П. — проект Мобильное расписание',
        createdAt: '2026-05-03T18:00:00Z',
      }),
    ],
  },
};
