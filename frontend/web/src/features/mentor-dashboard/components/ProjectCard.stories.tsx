import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';

import type { MentorDashboardProject } from '@/api/projects';
import { ProjectCard } from './ProjectCard';

const SPRINTS_5x3W = [
  { id: 1, number: 1, startDate: '2026-02-24', endDate: '2026-03-16', status: 'Завершён' as const },
  { id: 2, number: 2, startDate: '2026-03-17', endDate: '2026-04-06', status: 'Активный' as const },
  { id: 3, number: 3, startDate: '2026-04-07', endDate: '2026-04-27', status: 'Запланирован' as const },
  { id: 4, number: 4, startDate: '2026-04-28', endDate: '2026-05-18', status: 'Запланирован' as const },
  { id: 5, number: 5, startDate: '2026-05-19', endDate: '2026-06-08', status: 'Запланирован' as const },
];

const meta: Meta<typeof ProjectCard> = {
  title: 'Mentor Dashboard / ProjectCard',
  component: ProjectCard,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div style={{ maxWidth: 540, padding: 16, background: 'var(--color-surface, #f0f2f7)' }}>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof ProjectCard>;

const baseProject: MentorDashboardProject = {
  id: 1,
  title: 'Система управления проектным практикумом ВШПИ',
  status: 'Активный',
  company: 'МФТИ',
  durationSemesters: 1,
  currentSemester: 1,
  startedAt: '2026-02-15',
  sprints: SPRINTS_5x3W,
  teams: [
    {
      id: 11,
      name: 'Команда 1',
      lead: { id: 3, firstName: 'Александр', lastName: 'Стародубов' },
      memberCount: 4,
      launched: true,
      sprintStatuses: ['reviewed', 'pending-review', 'future', 'future', 'future'],
    },
    {
      id: 12,
      name: 'Команда 2',
      lead: { id: 10, firstName: 'Дмитрий', lastName: 'Козлов' },
      memberCount: 3,
      launched: true,
      sprintStatuses: ['reviewed', 'current', 'future', 'future', 'future'],
    },
    {
      id: 13,
      name: 'Команда 3',
      lead: { id: 11, firstName: 'Екатерина', lastName: 'Петрова' },
      memberCount: 5,
      launched: true,
      sprintStatuses: ['reviewed', 'reviewed', 'future', 'future', 'future'],
    },
  ],
};

export const ActiveProject: Story = {
  args: {
    project: baseProject,
  },
};

export const Continuation: Story = {
  args: {
    project: {
      ...baseProject,
      predecessorId: 100,
      durationSemesters: 2,
      currentSemester: 2,
    },
  },
};

export const WithWaitingTeam: Story = {
  args: {
    project: {
      ...baseProject,
      teams: [
        ...baseProject.teams,
        {
          id: 14,
          name: 'Команда 4',
          lead: null,
          memberCount: 2,
          launched: false,
          sprintStatuses: [],
        },
      ],
    },
  },
};

export const Draft: Story = {
  args: {
    project: {
      id: 6,
      title: 'Модуль анализа успеваемости студентов',
      status: 'Черновик',
      company: 'МФТИ',
      durationSemesters: 1,
      currentSemester: 1,
      startedAt: '2026-03-25',
      sprints: [],
      teams: [],
    },
  },
};

export const SingleTeamShortSprint: Story = {
  args: {
    project: {
      id: 4,
      title: 'Мобильное приложение расписания МФТИ',
      status: 'Активный',
      company: 'Т-Банк',
      durationSemesters: 2,
      currentSemester: 1,
      startedAt: '2026-03-05',
      sprints: [
        { id: 16, number: 1, startDate: '2026-03-10', endDate: '2026-03-30', status: 'Активный' },
        { id: 17, number: 2, startDate: '2026-03-31', endDate: '2026-04-20', status: 'Запланирован' },
        { id: 18, number: 3, startDate: '2026-04-21', endDate: '2026-05-11', status: 'Запланирован' },
        { id: 19, number: 4, startDate: '2026-05-12', endDate: '2026-06-01', status: 'Запланирован' },
        { id: 20, number: 5, startDate: '2026-06-02', endDate: '2026-06-22', status: 'Запланирован' },
      ],
      teams: [
        {
          id: 31,
          name: 'Команда 1',
          lead: { id: 18, firstName: 'Пётр', lastName: 'Григорьев' },
          memberCount: 5,
          launched: true,
          sprintStatuses: ['current', 'future', 'future', 'future', 'future'],
        },
      ],
    },
  },
};

export const ContinuationWithPredecessor: Story = {
  args: {
    project: {
      id: 5,
      title: 'Сервис статического анализа студенческого кода',
      status: 'Активный',
      company: 'МФТИ',
      durationSemesters: 2,
      currentSemester: 2,
      startedAt: '2026-02-15',
      predecessorId: 101,
      sprints: [
        { id: 21, number: 1, startDate: '2026-02-10', endDate: '2026-03-09', status: 'Завершён' },
        { id: 22, number: 2, startDate: '2026-03-10', endDate: '2026-04-06', status: 'Активный' },
        { id: 23, number: 3, startDate: '2026-04-07', endDate: '2026-05-04', status: 'Запланирован' },
      ],
      teams: [
        {
          id: 41,
          name: 'Команда 1',
          lead: { id: 19, firstName: 'Лариса', lastName: 'Морозова' },
          memberCount: 3,
          launched: true,
          sprintStatuses: ['reviewed', 'pending-review', 'future'],
        },
        {
          id: 42,
          name: 'Команда 2',
          lead: { id: 20, firstName: 'Никита', lastName: 'Тарасов' },
          memberCount: 4,
          launched: true,
          sprintStatuses: ['missed', 'missed', 'future'],
        },
        {
          id: 43,
          name: 'Команда 3',
          lead: null,
          memberCount: 3,
          launched: false,
          sprintStatuses: [],
        },
      ],
    },
  },
};
