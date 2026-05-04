import { describe, it, expect } from 'vitest';

import { formatRelativeTime, pluralRu } from './relativeTime';

describe('pluralRu', () => {
  it.each([
    [1, 'час'],
    [2, 'часа'],
    [4, 'часа'],
    [5, 'часов'],
    [11, 'часов'],
    [21, 'час'],
    [22, 'часа'],
    [25, 'часов'],
    [101, 'час'],
    [111, 'часов'],
    [112, 'часов'],
    [122, 'часа'],
  ])('picks correct form for %i', (n, expected) => {
    expect(pluralRu(n, 'час', 'часа', 'часов')).toBe(expected);
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-05-04T12:00:00Z');

  it('returns "только что" for under a minute', () => {
    expect(formatRelativeTime('2026-05-04T11:59:30Z', now)).toBe('только что');
  });

  it('returns minutes for sub-hour', () => {
    expect(formatRelativeTime('2026-05-04T11:45:00Z', now)).toBe('15 минут назад');
    expect(formatRelativeTime('2026-05-04T11:58:00Z', now)).toBe('2 минуты назад');
    expect(formatRelativeTime('2026-05-04T11:59:00Z', now)).toBe('1 минуту назад');
  });

  it('returns hours for sub-day', () => {
    expect(formatRelativeTime('2026-05-04T10:00:00Z', now)).toBe('2 часа назад');
    expect(formatRelativeTime('2026-05-04T11:00:00Z', now)).toBe('1 час назад');
    expect(formatRelativeTime('2026-05-04T07:00:00Z', now)).toBe('5 часов назад');
  });

  it('returns "вчера" for 1 day ago', () => {
    expect(formatRelativeTime('2026-05-03T12:00:00Z', now)).toBe('вчера');
  });

  it('returns days for sub-week', () => {
    expect(formatRelativeTime('2026-05-01T12:00:00Z', now)).toBe('3 дня назад');
    expect(formatRelativeTime('2026-04-29T12:00:00Z', now)).toBe('5 дней назад');
  });

  it('returns weeks for sub-month', () => {
    expect(formatRelativeTime('2026-04-20T12:00:00Z', now)).toBe('2 недели назад');
  });

  it('returns months for sub-year', () => {
    expect(formatRelativeTime('2026-02-04T12:00:00Z', now)).toBe('2 месяца назад');
  });

  it('returns years for older', () => {
    expect(formatRelativeTime('2024-05-04T12:00:00Z', now)).toBe('2 года назад');
  });

  it('handles backend timestamps without timezone (treats as UTC)', () => {
    expect(formatRelativeTime('2026-05-04T11:00:00', now)).toBe('1 час назад');
  });

  it('returns empty string for empty input', () => {
    expect(formatRelativeTime('', now)).toBe('');
  });

  it('returns "скоро" for future timestamps', () => {
    expect(formatRelativeTime('2026-05-05T12:00:00Z', now)).toBe('скоро');
  });
});
