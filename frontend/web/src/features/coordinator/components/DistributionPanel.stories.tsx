import type { Meta, StoryObj } from '@storybook/react';

import { DistributionPanel } from './DistributionPanel';

const meta = {
  title: 'Coordinator/DistributionPanel',
  component: DistributionPanel,
  parameters: { backgrounds: { default: 'app' } },
  args: {
    onRun: () => undefined,
    isRunning: false,
  },
} satisfies Meta<typeof DistributionPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  args: {
    state: 'idle',
  },
};

export const Running: Story = {
  args: {
    state: 'running',
    isRunning: true,
    status: { stage: 'running', progress: 42, message: 'Считаем веса студентов…' },
  },
};

export const Done: Story = {
  args: {
    state: 'done',
    status: { stage: 'done', message: 'Распределено 124 студента' },
    lastResultMessage: 'Распределение завершено за 12 секунд',
  },
};

export const Error: Story = {
  args: {
    state: 'error',
    errorMessage: 'Не удалось завершить распределение: внутренняя ошибка сервиса',
  },
};

export const Unavailable: Story = {
  args: {
    state: 'unavailable',
    errorMessage: 'Сервис распределения временно недоступен. Попробуйте позже.',
  },
};
