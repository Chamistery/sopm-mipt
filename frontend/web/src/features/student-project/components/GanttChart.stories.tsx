import type { Meta, StoryObj } from '@storybook/react';

import type { GanttResponseDto, TaskDto, TeamMemberDto } from '@/api/teams';
import { GanttChart } from './GanttChart';

const SPRINT_START = '2026-04-20';
const SPRINT_END = '2026-05-10';
const TODAY = '2026-05-04';

const MEMBERS: TeamMemberDto[] = [
  {
    userId: 1,
    firstName: 'Иван',
    lastName: 'Петров',
    middleName: 'Алексеевич',
    role: 'teamlead',
    projectRole: 'Тимлид',
    isLeader: true,
  },
  {
    userId: 2,
    firstName: 'Алексей',
    lastName: 'Стародубов',
    middleName: 'Юрьевич',
    role: 'student',
    projectRole: 'Backend',
    isLeader: false,
  },
  {
    userId: 3,
    firstName: 'Мария',
    lastName: 'Иванова',
    role: 'student',
    projectRole: 'Frontend',
    isLeader: false,
  },
];

const TASKS: TaskDto[] = [
  {
    id: 1,
    teamId: 1,
    sprintId: 1,
    assigneeId: 1,
    name: 'API авторизации',
    description: null,
    status: 'Готово',
    hours: 8,
    startDate: SPRINT_START,
    endDate: '2026-04-25',
    mr: 'https://git/mr/12',
    workDescription: 'Готово',
    history: [
      { day: 4, event: 'review' },
      { day: 5, event: 'accepted' },
    ],
  },
  {
    id: 2,
    teamId: 1,
    sprintId: 1,
    assigneeId: 1,
    name: 'Code review каталога',
    description: null,
    status: 'В работе',
    hours: 4,
    startDate: '2026-04-26',
    endDate: '2026-04-29',
    mr: null,
    workDescription: null,
  },
  {
    id: 3,
    teamId: 1,
    sprintId: 1,
    assigneeId: 2,
    name: 'MSW e2e',
    description: null,
    status: 'На ревью',
    hours: 12,
    startDate: '2026-04-27',
    endDate: '2026-05-04',
    mr: 'https://git/mr/27',
    workDescription: 'Готово к ревью',
    history: [{ day: 13, event: 'review' }],
  },
  {
    id: 4,
    teamId: 1,
    sprintId: 1,
    assigneeId: 2,
    name: 'CI integration',
    description: null,
    status: 'Назначена',
    hours: 6,
    startDate: '2026-05-05',
    endDate: '2026-05-09',
    mr: null,
    workDescription: null,
  },
  {
    id: 5,
    teamId: 1,
    sprintId: 1,
    assigneeId: 3,
    name: 'Каталог UI',
    description: null,
    status: 'Ожидает аппрува',
    hours: 10,
    startDate: SPRINT_START,
    endDate: '2026-05-02',
    mr: null,
    workDescription: null,
  },
  {
    id: 6,
    teamId: 1,
    sprintId: 1,
    assigneeId: 3,
    name: 'Документация ролей',
    description: null,
    status: 'Возвращена',
    hours: 4,
    startDate: '2026-04-28',
    endDate: '2026-05-03',
    mr: null,
    workDescription: 'Доработать с учётом комментариев',
    history: [
      { day: 11, event: 'review' },
      { day: 12, event: 'returned' },
    ],
  },
  {
    id: 7,
    teamId: 1,
    sprintId: 1,
    assigneeId: 3,
    name: 'Сборка отчёта',
    description: null,
    status: 'Отклонена',
    hours: 3,
    startDate: '2026-04-22',
    endDate: '2026-04-26',
    mr: null,
    workDescription: null,
  },
];

const baseData: GanttResponseDto = {
  team: { id: 1, name: 'Команда «СУПП»' },
  sprint: { id: 1, number: 2, startDate: SPRINT_START, endDate: SPRINT_END, status: 'Активный' },
  members: MEMBERS,
  tasks: TASKS,
};

const meta = {
  title: 'StudentProject/GanttChart',
  component: GanttChart,
  parameters: { layout: 'fullscreen', backgrounds: { default: 'app' } },
} satisfies Meta<typeof GanttChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Student: Story = {
  args: {
    data: baseData,
    todayIso: TODAY,
    currentUserId: 2,
    canEditAll: false,
    canAddTask: true,
    onTaskClick: () => {},
    onAddTask: () => {},
    sprintNumber: 2,
    sprintsTotal: 3,
  },
};

export const StudentTeamlead: Story = {
  args: {
    ...Student.args,
    currentUserId: 1,
    canEditAll: true,
  },
};

export const Mentor: Story = {
  args: {
    data: baseData,
    todayIso: TODAY,
    currentUserId: -1,
    canEditAll: false,
    canAddTask: false,
    mode: 'mentor',
    onTaskClick: () => {},
    onTaskAction: () => {},
    onAddTask: () => {},
    sprintNumber: 2,
    sprintsTotal: 3,
  },
};

export const EmptySprint: Story = {
  args: {
    ...Student.args,
    data: { ...baseData, tasks: [] },
  },
};

const ARCHIVE_TASKS: TaskDto[] = TASKS.filter((t) => t.status === 'Готово' || t.status === 'На ревью').map((t) => ({
  ...t,
}));

const archiveData: GanttResponseDto = {
  ...baseData,
  sprint: { ...baseData.sprint, status: 'Завершён' },
  tasks: ARCHIVE_TASKS.length > 0 ? ARCHIVE_TASKS : baseData.tasks,
};

export const Archive: Story = {
  args: {
    data: archiveData,
    todayIso: TODAY,
    currentUserId: -1,
    canEditAll: false,
    canAddTask: false,
    mode: 'archive',
    onTaskClick: () => {},
    onAddTask: () => {},
    sprintNumber: 2,
    sprintsTotal: 3,
  },
};
