import type { Meta, StoryObj } from '@storybook/react';

import { ExportReportModal } from './ExportReportModal';

const meta = {
  title: 'mentor-dashboard/ExportReportModal',
  component: ExportReportModal,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ExportReportModal>;

export default meta;
type Story = StoryObj<typeof meta>;

const PERIODS = [
  { value: 'current', label: 'Текущий спринт' },
  { value: 'all', label: 'Все спринты' },
  { value: 'sprint:201', label: 'Спринт 2 (17 мар — 6 апр)' },
  { value: 'sprint:200', label: 'Спринт 1 (24 фев — 16 мар)' },
];

export const Default: Story = {
  args: {
    periodOptions: PERIODS,
    onClose: () => {},
    onSubmit: () => {},
  },
};

export const Submitting: Story = {
  args: {
    periodOptions: PERIODS,
    onClose: () => {},
    onSubmit: () => {},
    isSubmitting: true,
  },
};
