import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { SectionNav } from './SectionNav';

const items = [
  { label: 'Основная информация' },
  { label: 'Требования и технологии' },
  { label: 'Описание и критерии' },
  { label: 'Параметры реализации' },
];

function InteractiveSectionNav(): JSX.Element {
  const [active, setActive] = useState(0);
  return <SectionNav items={items} active={active} onSelect={setActive} />;
}

const meta: Meta<typeof InteractiveSectionNav> = {
  title: 'mentor-dashboard/SectionNav',
  component: InteractiveSectionNav,
};
export default meta;

type Story = StoryObj<typeof InteractiveSectionNav>;

export const Default: Story = {};
