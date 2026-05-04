import type { Meta, StoryObj } from '@storybook/react';

import { PrioritySlot } from './PrioritySlot';
import type { CatalogProject } from '../types';

const sample: CatalogProject = {
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
  title: 'StudentCatalog/PrioritySlot',
  component: PrioritySlot,
  parameters: { layout: 'padded' },
  args: {
    canMoveUp: true,
    canMoveDown: true,
    readOnly: false,
    onRemove: () => {},
    onMoveUp: () => {},
    onMoveDown: () => {},
  },
  decorators: [
    (Story): JSX.Element => (
      <div style={{ maxWidth: 240, paddingTop: 16 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PrioritySlot>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: { index: 1, project: null, canMoveUp: false, canMoveDown: false },
};

export const Filled: Story = {
  args: { index: 1, project: sample, canMoveUp: false, canMoveDown: true },
};

export const Middle: Story = {
  args: { index: 3, project: sample },
};

export const ReadOnly: Story = {
  args: { index: 1, project: sample, readOnly: true, canMoveUp: false, canMoveDown: false },
};
