/*
 * Pure-function helpers for the «Встречи» tab. Kept separate from the
 * React component so the date/time math is testable without rendering.
 *
 * Все функции работают со shapes из api/types (`Meeting` — partial
 * generated type), поэтому возможные `undefined` явно обрабатываются.
 */

import type { Meeting } from '@/api/types';

const MONTH_RU_SHORT = [
  'янв',
  'фев',
  'мар',
  'апр',
  'мая',
  'июн',
  'июл',
  'авг',
  'сен',
  'окт',
  'ноя',
  'дек',
];

/**
 * Сравнивает дату+время встречи с переданным `now` (по местному
 * времени браузера). Если дата невалидна — считаем встречу прошедшей,
 * чтобы битые записи не маячили в верхней секции.
 */
export function isUpcoming(meeting: Meeting, now: Date = new Date()): boolean {
  const ts = meetingTimestamp(meeting);
  if (ts == null) return false;
  return ts.getTime() >= now.getTime();
}

export function meetingTimestamp(meeting: Meeting): Date | null {
  const date = meeting.meetingDate;
  const time = meeting.startTime ?? '00:00';
  if (!date) return null;

  // backend отдаёт meetingDate в формате YYYY-MM-DD (DATE) и startTime в HH:MM
  // (TIME без timezone). Парсим как локальное время — чтобы «18:00 5 мая»
  // оставалось 18:00 в браузере пользователя, а не дёрнулось на UTC.
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);

  const tm = /^(\d{1,2}):(\d{2})/.exec(time);
  const hours = tm ? Number(tm[1]) : 0;
  const minutes = tm ? Number(tm[2]) : 0;

  const dt = new Date(year, month, day, hours, minutes, 0, 0);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

export interface SplitMeetings {
  upcoming: Meeting[];
  past: Meeting[];
}

/**
 * Разбивает плоский список встреч на upcoming (по возрастанию даты) и
 * past (по убыванию). Сравнение — по `meetingTimestamp` относительно `now`.
 */
export function splitMeetings(meetings: Meeting[], now: Date = new Date()): SplitMeetings {
  const upcoming: Meeting[] = [];
  const past: Meeting[] = [];
  for (const meeting of meetings) {
    if (isUpcoming(meeting, now)) {
      upcoming.push(meeting);
    } else {
      past.push(meeting);
    }
  }
  upcoming.sort((a, b) => compareMeetings(a, b));
  past.sort((a, b) => compareMeetings(b, a));
  return { upcoming, past };
}

function compareMeetings(a: Meeting, b: Meeting): number {
  const ta = meetingTimestamp(a)?.getTime() ?? 0;
  const tb = meetingTimestamp(b)?.getTime() ?? 0;
  return ta - tb;
}

/**
 * Возвращает `[day, monthRu]` для левой колонки карточки. День — число
 * без leading zero, месяц — три буквы по-русски в нижнем регистре.
 */
export function formatRussianDate(date: string | undefined): { day: string; month: string } {
  if (!date) return { day: '—', month: '' };
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!m) return { day: '—', month: '' };
  const day = String(Number(m[3]));
  const monthIndex = Number(m[2]) - 1;
  const month = MONTH_RU_SHORT[monthIndex] ?? '';
  return { day, month };
}

/**
 * `«16:00 — 17:00 · 60 мин»`. Если `startTime` отсутствует — пустая
 * строка (карточка решает скрыть строку целиком).
 */
export function formatTimeRange(startTime: string | undefined, durationMinutes: number | undefined): string {
  if (!startTime) return '';
  const tm = /^(\d{1,2}):(\d{2})/.exec(startTime);
  if (!tm) return '';
  const hh = Number(tm[1]);
  const mm = Number(tm[2]);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return '';

  const start = pad(hh) + ':' + pad(mm);
  const duration = durationMinutes && durationMinutes > 0 ? durationMinutes : 0;
  if (!duration) return start;

  const totalMinutes = hh * 60 + mm + duration;
  const endHh = Math.floor(totalMinutes / 60) % 24;
  const endMm = totalMinutes % 60;
  const end = pad(endHh) + ':' + pad(endMm);

  return `${start} — ${end} · ${duration} мин`;
}

function pad(n: number): string {
  return n < 10 ? '0' + String(n) : String(n);
}
