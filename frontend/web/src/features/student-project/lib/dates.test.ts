import { describe, expect, it } from 'vitest';

import {
  calcBarPosition,
  calcHistoryMarkerPct,
  calcTodayPct,
  daysBetween,
  formatISODate,
  formatRuRange,
  formatTimelineDayLabel,
  isWeekend,
  parseISODate,
  sprintDayList,
  sprintDays,
} from './dates';

describe('parseISODate / formatISODate', () => {
  it('round-trips a YYYY-MM-DD string', () => {
    const iso = '2026-04-08';
    expect(formatISODate(parseISODate(iso))).toBe(iso);
  });
});

describe('daysBetween / sprintDays', () => {
  it('counts inclusive sprint length', () => {
    expect(daysBetween('2026-03-17', '2026-04-13')).toBe(27);
    expect(sprintDays('2026-03-17', '2026-04-13')).toBe(28);
  });

  it('treats same-day sprint as 1 day', () => {
    expect(sprintDays('2026-04-08', '2026-04-08')).toBe(1);
  });
});

describe('calcBarPosition', () => {
  it('places a 4-day bar starting at day 3 of a 28-day sprint', () => {
    const pos = calcBarPosition('2026-03-20', '2026-03-23', '2026-03-17', '2026-04-13');
    expect(pos.start).toBe(3);
    expect(pos.dur).toBe(4);
    expect(pos.leftPct).toBeCloseTo((3 / 28) * 100);
    expect(pos.widthPct).toBeCloseTo((4 / 28) * 100);
  });

  it('clamps a task ending after the sprint to the sprint window', () => {
    const pos = calcBarPosition('2026-04-10', '2026-05-01', '2026-03-17', '2026-04-13');
    expect(pos.start + pos.dur).toBeLessThanOrEqual(28);
  });
});

describe('calcTodayPct', () => {
  it('returns null when today is outside the sprint', () => {
    expect(calcTodayPct('2026-05-01', '2026-03-17', '2026-04-13')).toBeNull();
  });

  it('returns a non-null percentage when today is inside', () => {
    const pct = calcTodayPct('2026-04-01', '2026-03-17', '2026-04-13');
    expect(pct).not.toBeNull();
    expect(pct!).toBeGreaterThan(0);
    expect(pct!).toBeLessThan(100);
  });
});

describe('calcHistoryMarkerPct', () => {
  it('places day=0 in the middle of the first day cell', () => {
    expect(calcHistoryMarkerPct(0, '2026-03-17', '2026-04-13')).toBeCloseTo((0.5 / 28) * 100);
  });

  it('places day=6 in the middle of the seventh day of a 28-day sprint', () => {
    expect(calcHistoryMarkerPct(6, '2026-03-17', '2026-04-13')).toBeCloseTo((6.5 / 28) * 100);
  });

  it('clamps a negative offset to day 0', () => {
    expect(calcHistoryMarkerPct(-3, '2026-03-17', '2026-04-13')).toBeCloseTo((0.5 / 28) * 100);
  });

  it('clamps an offset past sprint end to the last day', () => {
    expect(calcHistoryMarkerPct(99, '2026-03-17', '2026-04-13')).toBeCloseTo((27.5 / 28) * 100);
  });
});

describe('sprintDayList / isWeekend', () => {
  it('lists every day in the sprint', () => {
    const days = sprintDayList('2026-03-17', '2026-03-19');
    expect(days).toEqual(['2026-03-17', '2026-03-18', '2026-03-19']);
  });

  it('detects Saturday and Sunday', () => {
    // 2026-03-21 is a Saturday.
    expect(isWeekend('2026-03-21')).toBe(true);
    // 2026-03-23 is a Monday.
    expect(isWeekend('2026-03-23')).toBe(false);
  });
});

describe('formatRuRange / formatTimelineDayLabel', () => {
  it('formats a Russian short range', () => {
    expect(formatRuRange('2026-03-17', '2026-04-13')).toBe('17 мар — 13 апр');
  });

  it('shows month label only on first day or month transition', () => {
    expect(formatTimelineDayLabel('2026-03-17', null)).toBe('17 мар');
    expect(formatTimelineDayLabel('2026-03-18', '2026-03-17')).toBe('18');
    expect(formatTimelineDayLabel('2026-04-01', '2026-03-31')).toBe('1 апр');
  });
});
