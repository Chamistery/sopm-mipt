import { describe, expect, it } from 'vitest';

import {
  calculateSprintTimeline,
  emptyProposalData,
  firstMissingField,
  formatRussianDayMonth,
  isSectionComplete,
} from './projectFormState';

describe('projectFormState — section validation', () => {
  it('section 0: empty form lacks title', () => {
    const data = emptyProposalData();
    expect(firstMissingField(data, 0)).toBe('title');
  });

  it('section 0: filled but missing mentor email', () => {
    const data = emptyProposalData();
    data.title = 'Проект';
    data.company = 'МФТИ';
    data.mentor.fullName = 'ФИО';
    data.mentor.role = 'Доцент';
    data.goal = 'Цель';
    data.expectedResult = 'Результат';
    expect(firstMissingField(data, 0)).toBe('mentor.email');
  });

  it('section 0: complete', () => {
    const data = emptyProposalData();
    data.title = 'A';
    data.company = 'B';
    data.mentor.fullName = 'C';
    data.mentor.role = 'D';
    data.mentor.email = 'e@e';
    data.goal = 'F';
    data.expectedResult = 'G';
    expect(isSectionComplete(data, 0)).toBe(true);
  });

  it('section 3: requires positive count and start date', () => {
    const data = emptyProposalData();
    expect(firstMissingField(data, 3)).toBe('sprints.startDate');
    data.sprints.startDate = '2026-09-01';
    data.sprints.count = 5;
    expect(firstMissingField(data, 3)).toBeNull();
  });

  it('section 3: teamSizeMax must be >= teamSizeMin', () => {
    const data = emptyProposalData();
    data.sprints.startDate = '2026-09-01';
    data.teamSizeMin = 5;
    data.teamSizeMax = 3;
    expect(firstMissingField(data, 3)).toBe('teamSizeMax');
  });
});

describe('projectFormState — sprint timeline', () => {
  it('null when start date is missing', () => {
    const t = calculateSprintTimeline({
      count: 5,
      startDate: '',
      mode: 'simple',
      durationWeeks: 2,
    });
    expect(t).toBeNull();
  });

  it('null when count < 2', () => {
    const t = calculateSprintTimeline({
      count: 1,
      startDate: '2026-09-01',
      mode: 'simple',
      durationWeeks: 2,
    });
    expect(t).toBeNull();
  });

  it('5 sprints × 2 weeks = 10 weeks total, 70 days', () => {
    const t = calculateSprintTimeline({
      count: 5,
      startDate: '2026-09-01',
      mode: 'simple',
      durationWeeks: 2,
    });
    expect(t).not.toBeNull();
    expect(t!.rows).toHaveLength(5);
    expect(t!.totalDays).toBe(70);
    expect(t!.totalWeeks).toBe(10);
    // Первый — 14 дней
    expect(t!.rows[0].days).toBe(14);
    // Дата окончания первого — 14 сен (1 сен + 13 дней).
    expect(t!.rows[0].endDate.getDate()).toBe(14);
    // Дата старта второго — 15 сен.
    expect(t!.rows[1].startDate.getDate()).toBe(15);
  });

  it('custom mode honours per-sprint weeks', () => {
    const t = calculateSprintTimeline({
      count: 3,
      startDate: '2026-09-01',
      mode: 'custom',
      durationWeeks: 2,
      customWeeks: [1, 3, 2],
    });
    expect(t!.rows.map((r) => r.days)).toEqual([7, 21, 14]);
    expect(t!.totalDays).toBe(7 + 21 + 14);
  });

  it('formatRussianDayMonth produces "1 сен"', () => {
    const d = new Date(2026, 8, 1);
    expect(formatRussianDayMonth(d)).toBe('1 сен');
  });
});
