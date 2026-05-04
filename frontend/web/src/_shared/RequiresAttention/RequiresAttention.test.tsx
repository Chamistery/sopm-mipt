import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { Notification } from '@/api/notifications';
import { RequiresAttentionView } from './RequiresAttention';

const baseNotif = (over: Partial<Notification> & { id: string }): Notification => ({
  kind: 'task_status',
  severity: 'info',
  title: 'Title',
  createdAt: '2026-05-04T10:00:00Z',
  isRead: false,
  ...over,
});

describe('RequiresAttentionView', () => {
  it('shows skeleton placeholders when loading', () => {
    const { container } = render(
      <RequiresAttentionView title="Требует внимания" items={[]} isLoading />,
    );
    // Three skeleton cards rendered.
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(3);
    expect(screen.getByRole('heading', { name: /Требует внимания/ })).toBeInTheDocument();
  });

  it('shows the empty state when there are no notifications', () => {
    render(<RequiresAttentionView title="Требует внимания" items={[]} isLoading={false} />);
    expect(screen.getByText('Сейчас всё под контролем')).toBeInTheDocument();
  });

  it('renders action-required notifications above the toggle and hides info ones initially', async () => {
    const user = userEvent.setup();
    const items: Notification[] = [
      baseNotif({
        id: 'a',
        title: 'Нужен аппрув задачи',
        kind: 'mentor_task_attention',
        severity: 'warning',
      }),
      baseNotif({
        id: 'b',
        title: 'Информационное событие',
        kind: 'task_approved',
        severity: 'success',
      }),
    ];
    render(<RequiresAttentionView title="Требует внимания" items={items} isLoading={false} />);

    expect(screen.getByText('Нужен аппрув задачи')).toBeInTheDocument();
    expect(screen.queryByText('Информационное событие')).toBeNull();

    const toggle = screen.getByRole('button', { name: /Показать ещё 1/ });
    await user.click(toggle);
    expect(screen.getByText('Информационное событие')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Свернуть' })).toBeInTheDocument();
  });

  it('renders cards with link as anchor tags', () => {
    const items: Notification[] = [
      baseNotif({
        id: 'l',
        title: 'Кликабельное',
        kind: 'mentor_task_attention',
        severity: 'warning',
        link: '/student/project',
      }),
    ];
    render(<RequiresAttentionView title="Требует внимания" items={items} isLoading={false} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/student/project');
    expect(link).toHaveTextContent('Кликабельное');
  });
});
