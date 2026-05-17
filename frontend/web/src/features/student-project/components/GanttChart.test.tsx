import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { GanttResponseDto } from '@/api/teams';
import { GanttChart } from './GanttChart';

const data: GanttResponseDto = {
  team: { id: 1, name: 'Команда' },
  sprint: {
    id: 1,
    number: 2,
    startDate: '2026-04-20',
    endDate: '2026-05-10',
    status: 'Активный',
  },
  members: [
    {
      userId: 2,
      firstName: 'Мария',
      lastName: 'Иванова',
      role: 'student',
      isLeader: false,
    },
  ],
  tasks: [
    {
      id: 42,
      teamId: 1,
      sprintId: 1,
      assigneeId: 2,
      name: 'Каталог UI',
      description: null,
      status: 'Ожидает аппрува',
      hours: 10,
      startDate: '2026-04-21',
      endDate: '2026-05-02',
      mr: null,
      workDescription: null,
    },
  ],
};

describe('GanttChart', () => {
  it('mentor-mode click invokes onTaskClick when onTaskAction is not provided', async () => {
    const onTaskClick = vi.fn();
    render(
      <GanttChart
        data={data}
        todayIso="2026-05-04"
        currentUserId={-1}
        canEditAll={false}
        canAddTask={false}
        mode="mentor"
        onTaskClick={onTaskClick}
        onAddTask={() => undefined}
        sprintNumber={2}
      />,
    );

    await userEvent.click(screen.getByText('Каталог UI'));

    expect(onTaskClick).toHaveBeenCalledTimes(1);
    expect(onTaskClick).toHaveBeenCalledWith(expect.objectContaining({ id: 42 }));
  });

  it('mentor-mode legacy: when onTaskAction is provided, it takes precedence', async () => {
    const onTaskClick = vi.fn();
    const onTaskAction = vi.fn();
    render(
      <GanttChart
        data={data}
        todayIso="2026-05-04"
        currentUserId={-1}
        canEditAll={false}
        canAddTask={false}
        mode="mentor"
        onTaskClick={onTaskClick}
        onTaskAction={onTaskAction}
        onAddTask={() => undefined}
        sprintNumber={2}
      />,
    );

    await userEvent.click(screen.getByText('Каталог UI'));

    expect(onTaskAction).toHaveBeenCalledTimes(1);
    expect(onTaskClick).not.toHaveBeenCalled();
  });

  it('mentor mode hides the "+ Добавить задачу" button even when canAddTask is true', () => {
    render(
      <GanttChart
        data={data}
        todayIso="2026-05-04"
        currentUserId={-1}
        canEditAll={false}
        canAddTask
        mode="mentor"
        onTaskClick={() => undefined}
        onTaskAction={() => undefined}
        onAddTask={() => undefined}
        sprintNumber={2}
      />,
    );
    expect(screen.queryByRole('button', { name: /Добавить задачу/ })).toBeNull();
  });

  it('student mode (default) routes click to onTaskClick', async () => {
    const onTaskClick = vi.fn();
    const onTaskAction = vi.fn();
    render(
      <GanttChart
        data={data}
        todayIso="2026-05-04"
        currentUserId={2}
        canEditAll={false}
        canAddTask
        onTaskClick={onTaskClick}
        onTaskAction={onTaskAction}
        onAddTask={() => undefined}
        sprintNumber={2}
      />,
    );

    await userEvent.click(screen.getByText('Каталог UI'));

    expect(onTaskClick).toHaveBeenCalledTimes(1);
    expect(onTaskAction).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Добавить задачу/ })).toBeInTheDocument();
  });
});
