import { describe, expect, it } from 'vitest';

import { filterProjects } from './filters';
import type { ProjectListItem } from '@/api/projects';

function p(id: number, title: string, company: string | null = null): ProjectListItem {
  return {
    id,
    title,
    status: 'Активный',
    mentorId: 1,
    teamSizeMin: 3,
    teamSizeMax: 4,
    numTeams: 1,
    filledTeams: 0,
    acceptedCount: 0,
    availableSlots: 4,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    maxSlots: 4,
    filledSlots: 0,
    ...(company === null ? {} : { company }),
  };
}

describe('filterProjects', () => {
  const list = [
    p(1, 'AI чат-бот', 'Сбер'),
    p(2, 'Платформа аналитики', 'Яндекс'),
    p(3, 'AR-кабинет', null),
  ];

  it('returns the same list when query is empty or whitespace', () => {
    expect(filterProjects(list, '')).toEqual(list);
    expect(filterProjects(list, '   ')).toEqual(list);
  });

  it('matches by title case-insensitively', () => {
    expect(filterProjects(list, 'ai').map((x) => x.id)).toEqual([1]);
    expect(filterProjects(list, 'плАт').map((x) => x.id)).toEqual([2]);
  });

  it('matches by company when set', () => {
    expect(filterProjects(list, 'яндекс').map((x) => x.id)).toEqual([2]);
  });

  it('returns empty list when nothing matches', () => {
    expect(filterProjects(list, 'нетничегоТакого')).toEqual([]);
  });
});
