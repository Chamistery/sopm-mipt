import { describe, expect, it } from 'vitest';

import type { Meeting } from '@/api/types';

import {
  formatRussianDate,
  formatTimeRange,
  isUpcoming,
  meetingTimestamp,
  splitMeetings,
} from './meetingHelpers';

function meeting(overrides: Partial<Meeting>): Meeting {
  return {
    id: 1,
    teamId: 1,
    title: 'M',
    meetingDate: '2026-04-01',
    startTime: '16:00',
    durationMinutes: 60,
    status: 'Подтверждена',
    ...overrides,
  };
}

describe('formatRussianDate', () => {
  it('возвращает день без leading zero и трёхбуквенный месяц', () => {
    expect(formatRussianDate('2026-01-01')).toEqual({ day: '1', month: 'янв' });
    expect(formatRussianDate('2026-03-17')).toEqual({ day: '17', month: 'мар' });
    expect(formatRussianDate('2026-09-08')).toEqual({ day: '8', month: 'сен' });
    expect(formatRussianDate('2026-12-31')).toEqual({ day: '31', month: 'дек' });
  });

  it('падает мягко на пустую/невалидную дату', () => {
    expect(formatRussianDate(undefined)).toEqual({ day: '—', month: '' });
    expect(formatRussianDate('garbage')).toEqual({ day: '—', month: '' });
  });
});

describe('formatTimeRange', () => {
  it('форматирует start—end · duration', () => {
    expect(formatTimeRange('16:00', 60)).toBe('16:00 — 17:00 · 60 мин');
    expect(formatTimeRange('15:00', 45)).toBe('15:00 — 15:45 · 45 мин');
    expect(formatTimeRange('09:30', 30)).toBe('09:30 — 10:00 · 30 мин');
    expect(formatTimeRange('22:30', 90)).toBe('22:30 — 00:00 · 90 мин');
  });

  it('возвращает только start, если длительность не задана', () => {
    expect(formatTimeRange('16:00', undefined)).toBe('16:00');
    expect(formatTimeRange('16:00', 0)).toBe('16:00');
  });

  it('пустая строка для невалидного startTime', () => {
    expect(formatTimeRange(undefined, 60)).toBe('');
    expect(formatTimeRange('not-a-time', 60)).toBe('');
  });
});

describe('meetingTimestamp', () => {
  it('возвращает Date с местным временем для валидного date+time', () => {
    const ts = meetingTimestamp(meeting({ meetingDate: '2026-04-01', startTime: '16:00' }));
    expect(ts).toBeInstanceOf(Date);
    expect(ts!.getFullYear()).toBe(2026);
    expect(ts!.getMonth()).toBe(3); // апрель
    expect(ts!.getDate()).toBe(1);
    expect(ts!.getHours()).toBe(16);
  });

  it('возвращает null для невалидной даты', () => {
    expect(meetingTimestamp(meeting({ meetingDate: undefined }))).toBeNull();
    expect(meetingTimestamp(meeting({ meetingDate: 'xx' }))).toBeNull();
  });
});

describe('isUpcoming', () => {
  it('верно определяет встречу в будущем относительно now', () => {
    const now = new Date(2026, 3, 1, 12, 0, 0);
    expect(isUpcoming(meeting({ meetingDate: '2026-04-01', startTime: '16:00' }), now)).toBe(true);
    expect(isUpcoming(meeting({ meetingDate: '2026-04-01', startTime: '11:00' }), now)).toBe(false);
    expect(isUpcoming(meeting({ meetingDate: '2026-03-31', startTime: '23:00' }), now)).toBe(false);
  });
});

describe('splitMeetings', () => {
  const now = new Date(2026, 3, 5, 12, 0, 0); // 5 апр 2026, 12:00

  it('делит на upcoming/past и сортирует обе группы', () => {
    const meetings = [
      meeting({ id: 1, meetingDate: '2026-04-01', startTime: '16:00' }), // прошло
      meeting({ id: 2, meetingDate: '2026-04-08', startTime: '15:00' }), // будущее
      meeting({ id: 3, meetingDate: '2026-04-12', startTime: '10:00' }), // будущее
      meeting({ id: 4, meetingDate: '2026-03-17', startTime: '16:00' }), // прошло
    ];
    const split = splitMeetings(meetings, now);

    expect(split.upcoming.map((m) => m.id)).toEqual([2, 3]);
    expect(split.past.map((m) => m.id)).toEqual([1, 4]);
  });

  it('пустые входы — пустые выходы', () => {
    expect(splitMeetings([], now)).toEqual({ upcoming: [], past: [] });
  });
});
