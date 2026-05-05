import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { TaskDto, TeamMemberDto } from '@/api/teams';
import { MentorTaskPopup } from './MentorTaskPopup';

const member: TeamMemberDto = {
  userId: 11,
  firstName: 'Анна',
  lastName: 'Лебедева',
  role: 'student',
  isLeader: false,
};

const taskOnReview: TaskDto = {
  id: 100,
  teamId: 1,
  sprintId: 1,
  assigneeId: 11,
  name: 'API уведомлений',
  description: 'Сервис уведомлений с REST + WS',
  status: 'На ревью',
  hours: 12,
  startDate: '2026-03-20',
  endDate: '2026-03-30',
  mr: '!122',
  workDescription: 'REST + WS готовы.',
  mentorComments: [{ action: 'Аппрув', text: 'Берём шину.' }],
};

describe('MentorTaskPopup', () => {
  it('renders full body for any status (description / work / MR / mentor comments)', () => {
    render(
      <MentorTaskPopup
        open
        task={taskOnReview}
        members={[member]}
        todayIso="2026-03-30"
        onClose={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    expect(screen.getByRole('heading', { name: 'API уведомлений' })).toBeInTheDocument();
    expect(screen.getByText('Сервис уведомлений с REST + WS')).toBeInTheDocument();
    expect(screen.getByText('REST + WS готовы.')).toBeInTheDocument();
    expect(screen.getByText('Берём шину.')).toBeInTheDocument();
  });

  it('shows accept/return action buttons for "На ревью" status', () => {
    render(
      <MentorTaskPopup
        open
        task={taskOnReview}
        members={[member]}
        todayIso="2026-03-30"
        onClose={() => undefined}
        onSubmit={() => undefined}
      />,
    );
    expect(screen.getByRole('button', { name: 'Принять' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Вернуть' })).toBeInTheDocument();
  });

  it('hides action buttons for terminal statuses (read-only mode)', () => {
    render(
      <MentorTaskPopup
        open
        task={{ ...taskOnReview, status: 'Готово' }}
        members={[member]}
        todayIso="2026-03-30"
        onClose={() => undefined}
        onSubmit={() => undefined}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Принять' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Аппрувить' })).toBeNull();
  });

  it('require comment for "Вернуть"; does not submit until provided', async () => {
    const onSubmit = vi.fn();
    render(
      <MentorTaskPopup
        open
        task={taskOnReview}
        members={[member]}
        todayIso="2026-03-30"
        onClose={() => undefined}
        onSubmit={onSubmit}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Вернуть' }));
    // confirm появился — кликаем без коммента → ошибка
    await userEvent.click(screen.getByRole('button', { name: 'Подтвердить возврат' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Опишите что нужно доработать')).toBeInTheDocument();

    // вводим коммент → submit проходит
    await userEvent.type(screen.getByRole('textbox'), 'Не хватает обработки ошибок WS');
    await userEvent.click(screen.getByRole('button', { name: 'Подтвердить возврат' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith('return', 'Не хватает обработки ошибок WS');
  });

  it('allows submitting "Аппрувить" without a comment', async () => {
    const onSubmit = vi.fn();
    render(
      <MentorTaskPopup
        open
        task={{ ...taskOnReview, status: 'Ожидает аппрува' }}
        members={[member]}
        todayIso="2026-03-30"
        onClose={() => undefined}
        onSubmit={onSubmit}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Аппрувить' }));
    await userEvent.click(screen.getByRole('button', { name: 'Подтвердить аппрув' }));
    expect(onSubmit).toHaveBeenCalledWith('approve', '');
  });
});
