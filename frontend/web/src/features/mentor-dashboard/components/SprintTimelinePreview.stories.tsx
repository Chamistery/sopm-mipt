import type { Meta, StoryObj } from '@storybook/react';

import { SprintTimelinePreview } from './SprintTimelinePreview';

const meta: Meta<typeof SprintTimelinePreview> = {
  title: 'mentor-dashboard/SprintTimelinePreview',
  component: SprintTimelinePreview,
};
export default meta;

type Story = StoryObj<typeof SprintTimelinePreview>;

export const SimpleFiveSprints: Story = {
  args: {
    config: { count: 5, startDate: '2026-09-01', mode: 'simple', durationWeeks: 2 },
  },
};

export const CustomDurations: Story = {
  args: {
    config: {
      count: 4,
      startDate: '2026-09-01',
      mode: 'custom',
      durationWeeks: 2,
      customWeeks: [1, 2, 3, 2],
    },
  },
};

export const Placeholder: Story = {
  args: {
    config: { count: 5, startDate: '', mode: 'simple', durationWeeks: 2 },
  },
};
