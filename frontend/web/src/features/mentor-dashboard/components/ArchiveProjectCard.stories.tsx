import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';

import { ArchiveProjectCard } from './ArchiveProjectCard';

const meta = {
  title: 'mentor-dashboard/ArchiveProjectCard',
  component: ArchiveProjectCard,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div style={{ maxWidth: 720 }}>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
  args: {
    onOpenInfo: () => undefined,
  },
} satisfies Meta<typeof ArchiveProjectCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    project: {
      id: 100,
      title: 'Система управления проектным практикумом ВШПИ (1 семестр)',
      company: 'МФТИ',
      predecessorId: null,
      durationSemesters: 2,
      currentSemester: 1,
      semesterLabel: 'Осенний семестр 2025/26',
      finishedAt: '2026-01-15',
      finalGrade: 'Зачтено',
      sprintsCount: 3,
      teams: [
        {
          id: 1,
          name: 'Команда 1',
          leader: 'Иванов П.',
          memberCount: 4,
          sprintCount: 3,
          avgScore: 8.1,
        },
        {
          id: 2,
          name: 'Команда 2',
          leader: 'Смирнова Е.',
          memberCount: 4,
          sprintCount: 3,
          avgScore: 6.9,
        },
      ],
    },
  },
};

export const Continuation: Story = {
  args: {
    project: {
      id: 106,
      title: 'MVP платформы код-ревью',
      company: 'МФТИ',
      predecessorId: 107,
      durationSemesters: 3,
      currentSemester: 2,
      semesterLabel: 'Осенний семестр 2025/26',
      finishedAt: '2026-01-30',
      finalGrade: 'Зачтено',
      sprintsCount: 5,
      teams: [
        {
          id: 11,
          name: 'Команда 1',
          leader: 'Михайлов Р.',
          memberCount: 5,
          sprintCount: 5,
          avgScore: 8.8,
        },
      ],
    },
  },
};

export const NoTeams: Story = {
  args: {
    project: {
      id: 200,
      title: 'Проект без команд',
      company: 'МФТИ',
      predecessorId: null,
      durationSemesters: 1,
      currentSemester: 1,
      semesterLabel: 'Весенний семестр 2024/25',
      finishedAt: '2025-06-15',
      finalGrade: '—',
      sprintsCount: 0,
      teams: [],
    },
  },
};

export const Highlighted: Story = {
  args: {
    highlighted: true,
    project: {
      id: 100,
      title: 'СУПП ВШПИ — выделена через ?highlight=',
      company: 'МФТИ',
      predecessorId: null,
      durationSemesters: 2,
      currentSemester: 1,
      semesterLabel: 'Осенний семестр 2025/26',
      finishedAt: '2026-01-15',
      finalGrade: 'Зачтено',
      sprintsCount: 3,
      teams: [
        {
          id: 1,
          name: 'Команда 1',
          leader: 'Иванов П.',
          memberCount: 4,
          sprintCount: 3,
          avgScore: 8.1,
        },
      ],
    },
  },
};
