import { describe, expect, it } from 'vitest';

import { MAX_SCORE, MIN_SCORE, validateScore } from './sprintScores';

describe('validateScore', () => {
  it('accepts integers within bounds', () => {
    expect(validateScore(MIN_SCORE)).toBeNull();
    expect(validateScore(MAX_SCORE)).toBeNull();
    expect(validateScore(7)).toBeNull();
  });

  it('rejects values out of range', () => {
    expect(validateScore(-1)).toMatch(/Не меньше/);
    expect(validateScore(MAX_SCORE + 1)).toMatch(/Не больше/);
  });

  it('rejects non-integer numbers', () => {
    expect(validateScore(7.5)).toMatch(/Целое/);
  });

  it('rejects non-finite values', () => {
    expect(validateScore(Number.NaN)).toMatch(/число/);
    expect(validateScore(Number.POSITIVE_INFINITY)).toMatch(/число/);
  });
});
