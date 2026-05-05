import type { Meta, StoryObj } from '@storybook/react';

import { ToastView } from './Toast';

const meta = {
  title: 'Shared/Toast',
  component: ToastView,
  parameters: { layout: 'centered' },
  args: {
    message: 'Команда запущена',
    kind: 'success',
    onDismiss: () => undefined,
  },
} satisfies Meta<typeof ToastView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {
  args: { kind: 'success', message: 'Команда запущена' },
};

export const Error: Story = {
  args: { kind: 'error', message: 'Сетевая ошибка. Попробуйте ещё раз.' },
};

export const Info: Story = {
  args: { kind: 'info', message: 'Идёт сохранение...' },
};

export const Warning: Story = {
  args: { kind: 'warning', message: 'Дедлайн через 24 часа' },
};

export const Sticky: Story = {
  args: {
    kind: 'info',
    message: 'Sticky-уведомление — закроется только по клику',
  },
};

export const Stack: Story = {
  // Реальный стек собирается ToastProvider'ом — здесь просто рендерим
  // три ToastView подряд, чтобы посмотреть spacing/композицию.
  render: () => (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: 8,
      }}
    >
      <ToastView kind="success" message="Команда запущена" onDismiss={() => undefined} />
      <ToastView kind="info" message="Идёт сохранение..." onDismiss={() => undefined} />
      <ToastView kind="error" message="Сетевая ошибка" onDismiss={() => undefined} />
    </div>
  ),
};
