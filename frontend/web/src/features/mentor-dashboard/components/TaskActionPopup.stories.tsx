import type { Meta, StoryObj } from '@storybook/react';

import { TaskActionPopup } from './TaskActionPopup';

const meta = {
  title: 'MentorDashboard/TaskActionPopup',
  component: TaskActionPopup,
  parameters: { backgrounds: { default: 'app' }, layout: 'fullscreen' },
} satisfies Meta<typeof TaskActionPopup>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseArgs = {
  open: true,
  taskName: 'Доделать пагинацию в списке заявок',
  onSubmit: () => {},
  onClose: () => {},
};

export const Approve: Story = {
  args: { ...baseArgs, actions: ['approve'] },
};

export const Reject: Story = {
  args: { ...baseArgs, actions: ['reject'] },
};

export const Accept: Story = {
  args: { ...baseArgs, actions: ['accept'] },
};

export const Return: Story = {
  args: { ...baseArgs, actions: ['return'] },
};

export const ChoosePendingApproval: Story = {
  args: { ...baseArgs, actions: ['approve', 'reject'] },
};

export const ChooseReview: Story = {
  args: { ...baseArgs, actions: ['accept', 'return'] },
};

export const SubmittingWithError: Story = {
  args: {
    ...baseArgs,
    actions: ['reject'],
    isSubmitting: true,
    serverError: 'Ошибка 409: задача уже изменена',
  },
};
