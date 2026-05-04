import { describe, expect, it } from 'vitest';

import { calcFinalGrade, formatFinalGradeLabel } from './finalGrade';

describe('calcFinalGrade', () => {
  it('returns dash on empty input', () => {
    expect(calcFinalGrade([])).toBe('—');
  });

  it('averages a single score and rounds to one decimal', () => {
    expect(calcFinalGrade([{ score: 5 }])).toBe('5.0');
  });

  it('averages multiple scores across students/sprints', () => {
    expect(
      calcFinalGrade([{ score: 5 }, { score: 4 }, { score: 5 }, { score: 4 }]),
    ).toBe('4.5');
  });

  it('rounds to one decimal halfway', () => {
    // (5 + 4 + 5) / 3 = 4.6666 → 4.7
    expect(calcFinalGrade([{ score: 5 }, { score: 4 }, { score: 5 }])).toBe('4.7');
  });
});

describe('formatFinalGradeLabel', () => {
  it('prefixes with «Оценка:»', () => {
    expect(formatFinalGradeLabel([{ score: 4 }, { score: 5 }])).toBe('Оценка: 4.5');
  });

  it('shows dash for empty', () => {
    expect(formatFinalGradeLabel([])).toBe('Оценка: —');
  });
});
