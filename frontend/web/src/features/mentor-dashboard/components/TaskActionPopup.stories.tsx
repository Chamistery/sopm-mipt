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
  args: { ...baseArgs, action: 'approve' },
};

export const Reject: Story = {
  args: { ...baseArgs, action: 'reject' },
};

export const Accept: Story = {
  args: { ...baseArgs, action: 'accept' },
};

export const Return: Story = {
  args: { ...baseArgs, action: 'return' },
};

export const SubmittingWithError: Story = {
  args: {
    ...baseArgs,
    action: 'reject',
    isSubmitting: true,
    serverError: 'Ошибка 409: задача уже изменена',
  },
};
