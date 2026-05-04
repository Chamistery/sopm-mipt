import type { Meta, StoryObj } from '@storybook/react';

import { AddMeetingModal } from './AddMeetingModal';

const meta = {
  title: 'mentor-dashboard/AddMeetingModal',
  component: AddMeetingModal,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof AddMeetingModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onClose: () => {},
    onSubmit: () => {},
  },
};

export const Submitting: Story = {
  args: {
    onClose: () => {},
    onSubmit: () => {},
    isSubmitting: true,
  },
};

export const WithServerError: Story = {
  args: {
    onClose: () => {},
    onSubmit: () => {},
    serverError: 'Ошибка 400: дата не может быть в прошлом',
  },
};
