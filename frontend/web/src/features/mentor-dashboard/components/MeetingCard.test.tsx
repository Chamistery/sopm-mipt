import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { Meeting } from '@/api/types';

import { MeetingCard } from './MeetingCard';

function meeting(overrides: Partial<Meeting>): Meeting {
  return {
    id: 1,
    teamId: 1,
    title: 'Обзор спринта 2',
    description: 'Демо результатов',
    meetingDate: '2026-04-01',
    startTime: '16:00',
    durationMinutes: 60,
    status: 'Подтверждена',
    ...overrides,
  };
}

describe('MeetingCard', () => {
  it('рендерит дату, время, тему и Zoom-ссылку для предстоящей подтверждённой встречи', () => {
    render(
      <MeetingCard
        meeting={meeting({
          status: 'Подтверждена',
          conferenceLink: 'https://zoom.us/j/123',
        })}
        canMentorAct
        isPast={false}
        createdByLabel="Стародубов А. (тимлид)"
      />,
    );

    expect(screen.getByText('Обзор спринта 2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('апр')).toBeInTheDocument();
    expect(screen.getByText('16:00 — 17:00 · 60 мин')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Zoom-ссылка/ })).toHaveAttribute(
      'href',
      'https://zoom.us/j/123',
    );
    expect(screen.getByText(/Стародубов А\. \(тимлид\)/)).toBeInTheDocument();
  });

  it('показывает кнопки confirm/decline для встречи в статусе «Ожидает подтверждения» когда canMentorAct', async () => {
    const onConfirm = vi.fn();
    render(
      <MeetingCard
        meeting={meeting({ status: 'Ожидает подтверждения' })}
        canMentorAct
        isPast={false}
        onConfirm={onConfirm}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Подтвердить/ }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('по клику на «Отклонить» открывает форму, валидирует reason и вызывает onDecline', async () => {
    const onDecline = vi.fn();
    render(
      <MeetingCard
        meeting={meeting({ status: 'Ожидает подтверждения' })}
        canMentorAct
        isPast={false}
        onDecline={onDecline}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Отклонить$/ }));

    const declineBtn = screen.getByRole('button', { name: /Отклонить встречу/ });
    expect(declineBtn).toBeDisabled();

    const textarea = screen.getByLabelText('Причина отказа');
    await userEvent.type(textarea, 'Конфликт с парами');

    expect(declineBtn).toBeEnabled();
    await userEvent.click(declineBtn);

    expect(onDecline).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), 'Конфликт с парами');
  });

  it('не показывает кнопки confirm/decline когда встреча уже подтверждена', () => {
    render(
      <MeetingCard
        meeting={meeting({ status: 'Подтверждена' })}
        canMentorAct
        isPast={false}
      />,
    );

    expect(screen.queryByRole('button', { name: /Подтвердить/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Отклонить$/ })).not.toBeInTheDocument();
  });

  it('рендерит блок «Резюме встречи» только для прошедшей встречи со статусом «Состоялась»', () => {
    render(
      <MeetingCard
        meeting={meeting({
          status: 'Состоялась',
          summary: 'Определены приоритеты на спринт',
        })}
        canMentorAct
        isPast
      />,
    );

    expect(screen.getByText('Резюме встречи')).toBeInTheDocument();
    expect(screen.getByText('Определены приоритеты на спринт')).toBeInTheDocument();
    expect(screen.getByText('состоялась')).toBeInTheDocument();
  });

  it('прошедшая без summary — без блока резюме', () => {
    render(
      <MeetingCard
        meeting={meeting({ status: 'Состоялась', summary: undefined })}
        canMentorAct
        isPast
      />,
    );

    expect(screen.queryByText('Резюме встречи')).not.toBeInTheDocument();
  });

  it('отклонённая встреча показывает причину отказа', () => {
    render(
      <MeetingCard
        meeting={meeting({
          status: 'Отклонена',
          mentorDeclineReason: 'Перенос на следующий понедельник',
        })}
        canMentorAct={false}
        isPast={false}
      />,
    );

    expect(screen.getByText('Причина отказа')).toBeInTheDocument();
    expect(screen.getByText('Перенос на следующий понедельник')).toBeInTheDocument();
    expect(screen.getByText('Отклонена')).toBeInTheDocument();
  });
});
