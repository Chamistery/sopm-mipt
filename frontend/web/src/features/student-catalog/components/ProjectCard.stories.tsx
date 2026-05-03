import type { Meta, StoryObj } from '@storybook/react';

import { ProjectCard } from './ProjectCard';
import type { CatalogProject } from '../types';

const baseProject: CatalogProject = {
  id: 1,
  title: 'CRM-система для малого бизнеса',
  status: 'Опубликован',
  mentorId: 10,
  company: 'Яндекс',
  course: '2',
  maxSlots: 5,
  filledSlots: 1,
  createdAt: '2026-04-01T10:00:00Z',
  mentorName: 'Тимохин В.Н.',
  unqualified: false,
  unqualifiedReason: '',
};

const meta = {
  title: 'StudentCatalog/ProjectCard',
  component: ProjectCard,
  parameters: {
    layout: 'padded',
    backgrounds: { default: 'app' },
  },
  args: {
    selected: false,
    selectionFull: false,
    readOnly: false,
    onSelect: () => {},
    onRemove: () => {},
    onShowDetails: () => {},
  },
  decorators: [
    (Story): JSX.Element => (
      <div style={{ maxWidth: 320 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProjectCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { project: baseProject },
};

export const Selected: Story = {
  args: { project: baseProject, selected: true },
};

export const Unqualified: Story = {
  args: {
    project: {
      ...baseProject,
      id: 2,
      title: 'Дашборд аналитики Сбера',
      company: 'Сбер',
      course: '4',
      unqualified: true,
      unqualifiedReason: 'Требуется 4 курс',
    },
  },
};

export const SelectionFull: Story = {
  args: { project: baseProject, selectionFull: true },
};

export const ReadOnlySelected: Story = {
  args: { project: baseProject, selected: true, readOnly: true },
};

export const ReadOnlyNotSelected: Story = {
  args: { project: baseProject, readOnly: true },
};
