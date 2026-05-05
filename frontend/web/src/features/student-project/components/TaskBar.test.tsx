import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import type { TaskDto } from '@/api/teams';
import { TaskBar } from './TaskBar';

const baseTask: TaskDto = {
  id: 1,
  teamId: 1,
  sprintId: 1,
  assigneeId: 1,
  name: 'Задача',
  description: null,
  status: 'Готово',
  hours: 8,
  startDate: '2026-03-17',
  endDate: '2026-03-23',
  mr: null,
  workDescription: null,
};

describe('TaskBar', () => {
  it('renders the task bar with status-based background', () => {
    const { container } = render(
      <TaskBar
        task={baseTask}
        sprintStartIso="2026-03-17"
        sprintEndIso="2026-04-13"
        todayIso="2026-04-01"
      />,
    );
    const bar = container.querySelector('[data-testid="task-bar"]');
    expect(bar).not.toBeNull();
    expect(bar?.getAttribute('data-status')).toBe('Готово');
  });

  it('renders one history marker per history entry', () => {
    const task: TaskDto = {
      ...baseTask,
      history: [
        { day: 5, event: 'review' },
        { day: 6, event: 'accepted' },
      ],
    };
    const { container } = render(
      <TaskBar
        task={task}
        sprintStartIso="2026-03-17"
        sprintEndIso="2026-04-13"
        todayIso="2026-04-01"
      />,
    );
    // Markers — divs with title containing the event label
    const reviewMarker = container.querySelector('[title*="Отправлено на ревью"]') as HTMLElement | null;
    const acceptedMarker = container.querySelector('[title*="Принято"]') as HTMLElement | null;
    expect(reviewMarker).not.toBeNull();
    expect(acceptedMarker).not.toBeNull();
  });

  it('does not render markers when history is empty or undefined', () => {
    const { container } = render(
      <TaskBar
        task={baseTask}
        sprintStartIso="2026-03-17"
        sprintEndIso="2026-04-13"
        todayIso="2026-04-01"
      />,
    );
    expect(container.querySelector('[title*="Отправлено на ревью"]')).toBeNull();
    expect(container.querySelector('[title*="Принято"]')).toBeNull();
    expect(container.querySelector('[title*="Возвращено"]')).toBeNull();
  });

  it('renders history markers in archive mode too (final timeline view)', () => {
    const task: TaskDto = {
      ...baseTask,
      history: [
        { day: 4, event: 'review' },
        { day: 5, event: 'accepted' },
      ],
    };
    const { container } = render(
      <TaskBar
        task={task}
        sprintStartIso="2026-03-17"
        sprintEndIso="2026-04-13"
        todayIso="2026-04-01"
        archive
      />,
    );
    expect(container.querySelector('[title*="Отправлено на ревью"]')).not.toBeNull();
    expect(container.querySelector('[title*="Принято"]')).not.toBeNull();
  });
});
