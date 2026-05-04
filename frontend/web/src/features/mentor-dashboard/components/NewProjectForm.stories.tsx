import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { NewProjectForm } from './NewProjectForm';
import { emptyProposalData } from '../lib/projectFormState';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

const meta: Meta<typeof NewProjectForm> = {
  title: 'mentor-dashboard/NewProjectForm',
  component: NewProjectForm,
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Story />
        </MemoryRouter>
      </QueryClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof NewProjectForm>;

export const Empty: Story = {
  args: {
    onSubmit: () => {},
    onCancel: () => {},
  },
};

export const FilledSection0: Story = {
  args: {
    initial: {
      ...emptyProposalData(),
      title: 'Платформа автоматизации тестирования',
      company: 'Яндекс.Образование',
      mentor: {
        fullName: 'Тимохин Виктор',
        role: 'Старший инженер',
        email: 'timokhin@example.com',
        telegram: '@vtimokhin',
        phone: '+7 (495) 000-00-00',
      },
      goal: 'Автоматизировать сбор и анализ результатов тестов.',
      expectedResult: 'Веб-приложение для регрессионного тестирования.',
    },
    onSubmit: () => {},
    onCancel: () => {},
  },
};

export const WithTemplate: Story = {
  args: {
    predecessors: [
      { id: 110, title: 'Архивный: Цифровой двойник кампуса' },
    ],
    onFetchPredecessor: async () => ({
      ...emptyProposalData(),
      title: 'Цифровой двойник кампуса (продолжение)',
      company: 'ЦИТ МФТИ',
      goal: 'Расширить функционал второго семестра.',
      expectedResult: '3D + бронирование аудиторий.',
    }),
    onSubmit: () => {},
    onCancel: () => {},
  },
};

export const TimelinePreviewActive: Story = {
  args: {
    initial: {
      ...emptyProposalData(),
      title: 'Test',
      company: 'Test',
      mentor: { fullName: 'X', role: 'Y', email: 'z@z', telegram: '', phone: '' },
      goal: 'X',
      expectedResult: 'X',
      technologies: 'Go',
      competencies: 'Go',
      description: 'X',
      acceptanceCriteria: 'X',
      eduResult: 'X',
      sprints: { count: 5, startDate: '2026-09-01', mode: 'simple', durationWeeks: 2 },
    },
    onSubmit: () => {},
    onCancel: () => {},
  },
};
