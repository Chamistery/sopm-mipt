import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { Project } from '@/api/projects';
import type { ProposalData } from './lib/projectFormState';
import { MentorProjectInfoPage } from './MentorProjectInfoPage';

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
  competencies: 'Знание JS/TS, базовое понимание 3D-графики.',
  minRating: 3.5,
  minGpa: 7.0,
  allowedCourses: [2],
  description: 'Подробное описание архивного проекта.',
  acceptanceCriteria: 'Стабильная работа в Chrome/Firefox, время загрузки < 2c.',
  eduResult: 'Frontend, 3D, командная работа.',
  durationSemesters: 1,
  sprints: { count: 5, startDate: '2026-09-01', mode: 'simple', durationWeeks: 2 },
  numTeams: 1,
  teamSizeMin: 3,
  teamSizeMax: 5,
  resources: 'Доступ к данным кампуса.',
  isContinuation: false,
  predecessorProjectId: null,
};

const PROJECT: Project = {
  id: PROJECT_ID,
  title: PROPOSAL.title,
  status: 'Завершён',
  mentorId: 1,
  company: PROPOSAL.company,
  teamSizeMin: 3,
  teamSizeMax: 5,
  numTeams: 1,
  createdAt: '2025-09-01T08:00:00Z',
  updatedAt: '2025-10-30T08:00:00Z',
};

function makeClient(): QueryClient {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['project', PROJECT_ID], PROJECT);
  client.setQueryData(['project', PROJECT_ID, 'proposal'], PROPOSAL);
  return client;
}

const meta: Meta<typeof MentorProjectInfoPage> = {
  title: 'mentor-dashboard/MentorProjectInfoPage',
  component: MentorProjectInfoPage,
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof MentorProjectInfoPage>;

export const Readonly: Story = {
  render: () => (
    <QueryClientProvider client={makeClient()}>
      <MemoryRouter initialEntries={[`/mentor/archive/projects/${PROJECT_ID}/info`]}>
        <Routes>
          <Route
            path="/mentor/archive/projects/:projectId/info"
            element={<MentorProjectInfoPage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  ),
};

export const Edit: Story = {
  render: () => (
    <QueryClientProvider client={makeClient()}>
      <MemoryRouter initialEntries={[`/mentor/projects/${PROJECT_ID}/info`]}>
        <Routes>
          <Route
            path="/mentor/projects/:projectId/info"
            element={<MentorProjectInfoPage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  ),
};
