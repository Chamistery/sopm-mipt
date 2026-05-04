import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { RoleSwitcher } from './RoleSwitcher';
import type { Role } from '@/auth/roles';

const meta = {
  title: 'Layout/RoleSwitcher',
  component: RoleSwitcher,
  parameters: { backgrounds: { default: 'sidebar' } },
} satisfies Meta<typeof RoleSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Student: Story = {
  args: { currentRole: 'student', onChange: () => {} },
};

export const Mentor: Story = {
  args: { currentRole: 'mentor', onChange: () => {} },
};

function InteractiveDemo(): JSX.Element {
  const [role, setRole] = useState<Role>('student');
  return <RoleSwitcher currentRole={role} onChange={setRole} />;
}

export const Interactive: Story = {
  args: { currentRole: 'student', onChange: () => {} },
  render: () => <InteractiveDemo />,
};
