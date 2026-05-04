import type { Meta, StoryObj } from '@storybook/react';

import type { Sprint } from '@/api/teams';
import type { TeamReport } from '@/api/teamReports';

import { SprintReportCard, type SprintReportCardMember } from './SprintReportCard';

const meta = {
  title: 'mentor-dashboard/SprintReportCard',
  component: SprintReportCard,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof SprintReportCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const SPRINT: Sprint = {
  id: 201,
  projectId: 100,
  number: 2,
  startDate: '2026-03-17',
  endDate: '2026-04-06',
  status: 'Активный',
};

const MEMBERS: SprintReportCardMember[] = [
  { userId: 3, shortName: 'Стародубов А.', avatarInitials: 'СА' },
  { userId: 4, shortName: 'Кузнецов М.', avatarInitials: 'КМ' },
  { userId: 5, shortName: 'Лебедева Н.', avatarInitials: 'ЛН' },
  { userId: 6, shortName: 'Волков Д.', avatarInitials: 'ВД' },
];

const REPORT_AWAITING: TeamReport = {
  id: 600,
  sprintId: 201,
  teamId: 300,
  summary:
    'Реализован модуль авторизации через OAuth МФТИ. Создан API для управления проектами (CRUD).',
  problems: 'Задержка с получением доступа к VDI серверу — потеряли 3 дня.',
  nextPlan: 'Ролевая модель, дашборд ментора, интеграционные тесты для API.',
  status: 'Отправлен',
};

const REPORT_REVIEWED: TeamReport = {
  id: 601,
  sprintId: 201,
  teamId: 300,
  summary: 'Развёрнута начальная структура проекта.',
  problems: 'Потратили время на выбор Django vs FastAPI.',
  nextPlan: 'Доменные модели, стартовый dashboard.',
  status: 'Проверен',
  mentorComment: 'Хорошая работа на старте.',
};

const SCORES_8 = [
  { id: 1, sprintId: 201, teamId: 300, studentId: 3, score: 9, comment: 'Отличный API.', scoredById: 1 },
  { id: 2, sprintId: 201, teamId: 300, studentId: 4, score: 8, comment: 'Поддержал ревью.', scoredById: 1 },
  { id: 3, sprintId: 201, teamId: 300, studentId: 5, score: 7, scoredById: 1 },
  { id: 4, sprintId: 201, teamId: 300, studentId: 6, score: 8, scoredById: 1 },
];

export const ExpandedAwaiting: Story = {
  args: {
    report: REPORT_AWAITING,
    sprint: SPRINT,
    members: MEMBERS,
    scores: [],
    scoresLoading: false,
    expanded: true,
    onToggle: () => {},
    onSaveScores: async () => ({ ok: true, saved: [] }),
    onAcceptReport: async () => ({ ok: true }),
  },
};

export const ExpandedReviewed: Story = {
  args: {
    ...ExpandedAwaiting.args!,
    report: REPORT_REVIEWED,
    scores: SCORES_8,
  },
};

export const Collapsed: Story = {
  args: {
    ...ExpandedAwaiting.args!,
    report: REPORT_REVIEWED,
    scores: SCORES_8,
    expanded: false,
  },
};

export const Empty: Story = {
  args: {
    ...ExpandedAwaiting.args!,
    report: { ...REPORT_AWAITING, summary: undefined, problems: undefined, nextPlan: undefined },
  },
};
