import { describe, expect, it } from 'vitest';

import {
  isProjectArchived,
  isProjectInDistribution,
  projectFillRatio,
  projectMaxSlots,
} from './projects';

describe('projectMaxSlots', () => {
  it('multiplies team count by max team size', () => {
    expect(projectMaxSlots({ numTeams: 3, teamSizeMax: 5 })).toBe(15);
  });

  it('falls back to one team when numTeams is 0/missing', () => {
    expect(projectMaxSlots({ numTeams: 0, teamSizeMax: 4 })).toBe(4);
  });

  it('returns 0 when teamSizeMax is missing', () => {
    expect(projectMaxSlots({ numTeams: 3, teamSizeMax: 0 })).toBe(0);
  });
});

describe('projectFillRatio', () => {
  it('clamps to [0, 1]', () => {
    expect(projectFillRatio({ acceptedCount: 0, numTeams: 3, teamSizeMax: 5 })).toBe(0);
    expect(projectFillRatio({ acceptedCount: 20, numTeams: 3, teamSizeMax: 5 })).toBe(1);
  });

  it('returns the proportion of filled slots', () => {
    expect(projectFillRatio({ acceptedCount: 6, numTeams: 3, teamSizeMax: 4 })).toBeCloseTo(0.5);
  });

  it('returns 0 when no slots are configured', () => {
    expect(projectFillRatio({ acceptedCount: 5, numTeams: 0, teamSizeMax: 0 })).toBe(0);
  });
});

describe('isProjectInDistribution', () => {
  it('is true only for the published status', () => {
    expect(isProjectInDistribution('Опубликован')).toBe(true);
    expect(isProjectInDistribution('Активный')).toBe(false);
    expect(isProjectInDistribution('Черновик')).toBe(false);
  });
});

describe('isProjectArchived', () => {
  it('matches both completed and archived statuses', () => {
    expect(isProjectArchived('Завершён')).toBe(true);
    expect(isProjectArchived('Архивный')).toBe(true);
    expect(isProjectArchived('Активный')).toBe(false);
  });
});
