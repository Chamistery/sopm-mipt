import { describe, expect, it } from 'vitest';

import { pickDefaultSprint, type Sprint } from './teams';

const mkSprint = (overrides: Partial<Sprint> = {}): Sprint => ({
  id: 1,
  projectId: 100,
  number: 1,
  startDate: '2026-01-01',
  endDate: '2026-01-15',
  status: 'Запланирован',
  ...overrides,
});

describe('pickDefaultSprint', () => {
  it('returns null for an empty list', () => {
    expect(pickDefaultSprint([])).toBeNull();
  });

  it('prefers the active sprint over planned/finished', () => {
    const sprints = [
      mkSprint({ id: 1, number: 1, status: 'Завершён' }),
      mkSprint({ id: 2, number: 2, status: 'Активный' }),
      mkSprint({ id: 3, number: 3, status: 'Запланирован' }),
    ];
    expect(pickDefaultSprint(sprints)?.id).toBe(2);
  });

  it('falls back to the earliest planned when nothing is active', () => {
    const sprints = [
      mkSprint({ id: 1, number: 1, status: 'Завершён' }),
      mkSprint({ id: 3, number: 3, status: 'Запланирован' }),
      mkSprint({ id: 2, number: 2, status: 'Запланирован' }),
    ];
    expect(pickDefaultSprint(sprints)?.id).toBe(2);
  });

  it('falls back to the most recent finished when there is no planned/active', () => {
    const sprints = [
      mkSprint({ id: 1, number: 1, status: 'Завершён' }),
      mkSprint({ id: 2, number: 2, status: 'Завершён' }),
    ];
    expect(pickDefaultSprint(sprints)?.id).toBe(2);
  });
});
