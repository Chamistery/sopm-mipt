import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { StepDots } from './StepDots';

function InteractiveStepDots(): JSX.Element {
  const [active, setActive] = useState(0);
  return <StepDots total={4} active={active} onSelect={setActive} />;
}

const meta: Meta<typeof InteractiveStepDots> = {
  title: 'mentor-dashboard/StepDots',
  component: InteractiveStepDots,
};
export default meta;

type Story = StoryObj<typeof InteractiveStepDots>;

export const FourSteps: Story = {};
