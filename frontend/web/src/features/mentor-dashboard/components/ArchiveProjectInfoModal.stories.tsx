import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { Project } from '@/api/projects';
import type { ProposalData } from '../lib/projectFormState';
import { ArchiveProjectInfoModal } from './ArchiveProjectInfoModal';

const PROJECT_ID = 110;

const PROPOSAL: ProposalData = {
  title: 'Архивный: Цифровой двойник кампуса',
  company: 'ЦИТ МФТИ',
  mentor: {
    fullName: 'Тимохин В.А.',
    role: 'Доцент',
    email: 'timokhin@mipt.ru',
    telegram: '@vtimokhin',
    phone: '+7 (495) 000-00-00',
  },
  goal: 'Витрина цифрового двойника кампуса для абитуриентов и студентов.',
  expectedResult: 'Веб-приложение с 3D-моделью + поиск по аудиториям.',
  technologies: 'React, Three.js, PostgreSQL',
  competencies: 'Знание JS/TS, базовое понимание 3D-графики, командная работа.',
  minRating: 3.5,
  minGpa: 7.0,
  allowedCourses: [2],
  description: 'Подробное описание архивного проекта со всеми ключевыми блоками.',
  acceptanceCriteria: 'Стабильная работа в Chrome/Firefox, время загрузки < 2 c.',
  eduResult: 'Frontend, 3D, командная работа, презентация результата.',
  durationSemesters: 1,
  sprints: { count: 5, startDate: '2026-09-01', mode: 'simple', durationWeeks: 2 },
  numTeams: 1,
  teamSizeMin: 3,
  teamSizeMax: 5,
  resources: 'Доступ к данным кампуса, тестовый сервер ЦИТ МФТИ.',
  isContinuation: false,
  predecessorProjectId: null,
};

const PROJECT: Project = {
  id: PROJECT_ID,
  title: 'Архивный: Цифровой двойник кампуса',
  status: 'Завершён',
  mentorId: 1,
  company: 'ЦИТ МФТИ',
  teamSizeMin: 3,
  teamSizeMax: 5,
  numTeams: 1,
  createdAt: '2025-09-01T08:00:00Z',
  updatedAt: '2025-10-30T08:00:00Z',
};

function withClient(proposal: ProposalData | null, project: Project) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['project', PROJECT_ID, 'proposal'], proposal);
  client.setQueryData(['project', PROJECT_ID], project);
  return client;
}

const meta = {
  title: 'mentor-dashboard/ArchiveProjectInfoModal',
  component: ArchiveProjectInfoModal,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ArchiveProjectInfoModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithProposal: Story = {
  decorators: [
    (Story) => (
      <QueryClientProvider client={withClient(PROPOSAL, PROJECT)}>
        <Story />
      </QueryClientProvider>
    ),
  ],
  args: {
    projectId: PROJECT_ID,
    onClose: () => undefined,
  },
};

export const NoProposalFallback: Story = {
  decorators: [
    (Story) => (
      <QueryClientProvider
        client={withClient(null, {
          ...PROJECT,
          goal: 'Цель из Project (fallback)',
          description: 'Описание из Project (fallback) — заявки нет.',
          technologies: ['Go', 'PostgreSQL'],
        })}
      >
        <Story />
      </QueryClientProvider>
    ),
  ],
  args: {
    projectId: PROJECT_ID,
    onClose: () => undefined,
  },
};
