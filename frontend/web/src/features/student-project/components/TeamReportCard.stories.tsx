import type { Meta, StoryObj } from '@storybook/react';

import type { TeamReport } from '@/api/teamReports';
import { TeamReportCard } from './TeamReportCard';

const SPRINT_DATES = { sprintStartDate: '2026-03-17', sprintEndDate: '2026-04-13' };

const DRAFT: TeamReport = {
  id: 7,
  teamId: 1,
  sprintId: 2,
  summary: 'Реализован OAuth, создан CRUD API.',
  problems: 'Задержка с доступом к VDI.',
  nextPlan: 'Деплой и модуль оценивания.',
  status: 'Черновик',
};

const SUBMITTED: TeamReport = {
  ...DRAFT,
  id: 8,
  status: 'Отправлен',
};

const REVIEWED: TeamReport = {
  ...DRAFT,
  id: 9,
  status: 'Проверен',
  mentorComment: 'Хорошая работа. Покрытие тестами поднимем в следующем спринте.',
  // Per-team score is no longer on TeamReport — mentor grades each
  // member individually via SprintScore (см. ADR 0001).
};

const noopSave = async (): Promise<void> => {};

const meta = {
  title: 'StudentProject/TeamReportCard',
  component: TeamReportCard,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof TeamReportCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    report: null,
    sprintNumber: 2,
    ...SPRINT_DATES,
    onSave: noopSave,
  },
};

export const Draft: Story = {
  args: {
    report: DRAFT,
    sprintNumber: 2,
    ...SPRINT_DATES,
    onSave: noopSave,
  },
};

export const Submitted: Story = {
  args: {
    report: SUBMITTED,
    sprintNumber: 2,
    ...SPRINT_DATES,
    onSave: noopSave,
  },
};

export const Reviewed: Story = {
  args: {
    report: REVIEWED,
    sprintNumber: 2,
    ...SPRINT_DATES,
    onSave: noopSave,
  },
};
