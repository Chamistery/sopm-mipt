import { describe, expect, it } from 'vitest';

import {
  EMPTY_FILTERS,
  addToFirstFreeSlot,
  countSelected,
  describeUnqualifiedReason,
  filterProjects,
  findFirstEmptySlot,
  isProjectSelected,
  isQualified,
  isSlotsFull,
  moveSlot,
  removeProject,
  slotsFromApplications,
  uniqueCompanies,
} from './catalogLogic';
import type { CatalogProject } from '../types';

const sample: CatalogProject[] = [
  {
    id: 1,
    title: 'CRM система',
    status: 'Опубликован',
    mentorId: 10,
    company: 'Яндекс',
    course: '2',
    maxSlots: 5,
    filledSlots: 0,
    createdAt: '2026-01-01T00:00:00Z',
    mentorName: 'Иванов И.',
    unqualified: false,
    unqualifiedReason: '',
  },
  {
    id: 2,
    title: 'Дашборд аналитики',
    status: 'Опубликован',
    mentorId: 11,
    company: 'Сбер',
    course: '4',
    maxSlots: 4,
    filledSlots: 2,
    createdAt: '2026-01-02T00:00:00Z',
    mentorName: 'Фёдоров И.',
    unqualified: true,
    unqualifiedReason: 'Требуется 4 курс',
  },
  {
    id: 3,
    title: 'Чат-бот',
    status: 'Опубликован',
    mentorId: 12,
    company: 'VK',
    course: '2',
    maxSlots: 3,
    filledSlots: 1,
    createdAt: '2026-01-03T00:00:00Z',
    mentorName: 'Иванова О.',
    unqualified: false,
    unqualifiedReason: '',
  },
];

describe('filterProjects', () => {
  it('returns everything when filters are empty and onlyQualified=false', () => {
    const result = filterProjects(sample, { ...EMPTY_FILTERS, onlyQualified: false });
    expect(result).toHaveLength(3);
  });

  it('hides unqualified projects when onlyQualified=true', () => {
    const result = filterProjects(sample, { ...EMPTY_FILTERS, onlyQualified: true });
    expect(result.map((p) => p.id)).toEqual([1, 3]);
  });

  it('filters by company exact match', () => {
    const result = filterProjects(sample, {
      ...EMPTY_FILTERS,
      onlyQualified: false,
      company: 'Сбер',
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(2);
  });

  it('searches case-insensitively by title and mentor', () => {
    const result = filterProjects(sample, {
      ...EMPTY_FILTERS,
      onlyQualified: false,
      search: 'дашборд',
    });
    expect(result.map((p) => p.id)).toEqual([2]);

    const byMentor = filterProjects(sample, {
      ...EMPTY_FILTERS,
      onlyQualified: false,
      search: 'иванова',
    });
    expect(byMentor.map((p) => p.id)).toEqual([3]);
  });

  it('combines all filters', () => {
    const result = filterProjects(sample, {
      search: 'crm',
      company: 'Яндекс',
      onlyQualified: true,
    });
    expect(result.map((p) => p.id)).toEqual([1]);
  });
});

describe('uniqueCompanies', () => {
  it('returns sorted unique companies and skips empty values', () => {
    const result = uniqueCompanies([
      ...sample,
      { ...sample[0], id: 4, company: null } as CatalogProject,
      { ...sample[0], id: 5, company: 'Яндекс' } as CatalogProject,
    ]);
    // Russian collation puts Cyrillic before Latin; uniqueCompanies sorts via localeCompare('ru').
    expect(result).toEqual(['Сбер', 'Яндекс', 'VK']);
  });
});

describe('isQualified / describeUnqualifiedReason', () => {
  it('passes when project has no required course', () => {
    expect(isQualified('2', null)).toBe(true);
    expect(isQualified('2', '')).toBe(true);
    expect(describeUnqualifiedReason('2', null)).toBe('');
  });

  it('passes when student course >= required', () => {
    expect(isQualified('4', '2')).toBe(true);
    expect(isQualified(3, 3)).toBe(true);
  });

  it('fails when student course < required', () => {
    expect(isQualified('2', '4')).toBe(false);
    expect(describeUnqualifiedReason('2', '4')).toContain('4');
  });

  it('fails when student course is missing but project requires one', () => {
    expect(isQualified(null, '3')).toBe(false);
  });
});

describe('priority slots', () => {
  it('findFirstEmptySlot returns the lowest empty index', () => {
    expect(findFirstEmptySlot({})).toBe(1);
    expect(findFirstEmptySlot({ 1: 10 })).toBe(2);
    expect(findFirstEmptySlot({ 1: 10, 2: 11, 3: 12, 4: 13, 5: 14 })).toBe(null);
  });

  it('isSlotsFull and countSelected', () => {
    expect(isSlotsFull({})).toBe(false);
    expect(isSlotsFull({ 1: 10, 2: 11, 3: 12, 4: 13, 5: 14 })).toBe(true);
    expect(countSelected({ 1: 10, 3: 12 })).toBe(2);
  });

  it('addToFirstFreeSlot fills the next empty slot', () => {
    const next = addToFirstFreeSlot({ 1: 10 }, 20);
    expect(next).toEqual({ 1: 10, 2: 20 });
  });

  it('addToFirstFreeSlot is a no-op when project already selected', () => {
    const slots = { 1: 10, 2: 20 };
    expect(addToFirstFreeSlot(slots, 10)).toBe(slots);
  });

  it('addToFirstFreeSlot is a no-op when full', () => {
    const slots = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 };
    expect(addToFirstFreeSlot(slots, 99)).toBe(slots);
  });

  it('removeProject clears the slot containing the id', () => {
    const next = removeProject({ 1: 10, 2: 20, 3: 30 }, 20);
    expect(next).toEqual({ 1: 10, 3: 30 });
  });

  it('isProjectSelected detects membership', () => {
    expect(isProjectSelected({ 1: 10, 2: 20 }, 20)).toBe(true);
    expect(isProjectSelected({ 1: 10 }, 99)).toBe(false);
  });

  it('moveSlot swaps two filled slots', () => {
    const next = moveSlot({ 1: 10, 2: 20 }, 1, 2);
    expect(next).toEqual({ 1: 20, 2: 10 });
  });

  it('moveSlot moves a card into an empty slot', () => {
    const next = moveSlot({ 1: 10 }, 1, 4);
    expect(next).toEqual({ 4: 10 });
  });

  it('moveSlot is a no-op for from==to', () => {
    const slots = { 1: 10 };
    expect(moveSlot(slots, 1, 1)).toBe(slots);
  });

  it('slotsFromApplications restores priorities and ignores invalid', () => {
    const result = slotsFromApplications([
      { projectId: 7, priority: 1 },
      { projectId: 8, priority: 3 },
      { projectId: 9, priority: 99 },
      { projectId: 10, priority: null },
    ]);
    expect(result).toEqual({ 1: 7, 3: 8 });
  });
});
