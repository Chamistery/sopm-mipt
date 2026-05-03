import { describe, expect, it } from 'vitest';

import { computeStats, pendingProjects } from './stats';
import type { ProjectListItem, ProjectStatus } from '@/api/projects';

function project(id: number, status: ProjectStatus): ProjectListItem {
  return {
    id,
    title: `Проект ${id}`,
    status,
    mentorId: 1,
    maxSlots: 5,
    filledSlots: 0,
  };
}

describe('computeStats', () => {
  it('returns zeros for an empty list', () => {
    expect(computeStats([])).toEqual({
      total: 0,
      active: 0,
      pending: 0,
      completed: 0,
      drafts: 0,
    });
  });

  it('buckets projects by status, treating «Опубликован» as active', () => {
    const projects = [
      project(1, 'Активный'),
      project(2, 'Опубликован'),
      project(3, 'Черновик'),
      project(4, 'На утверждении'),
      project(5, 'На утверждении'),
      project(6, 'Завершен'),
      project(7, 'Архивный'),
    ];
    expect(computeStats(projects)).toEqual({
      total: 7,
      active: 2,
      pending: 2,
      completed: 1,
      drafts: 1,
    });
  });

  it('does not double-count any single project across buckets', () => {
    const stats = computeStats([project(1, 'Активный')]);
    expect(stats.total).toBe(1);
    expect(stats.active).toBe(1);
    expect(stats.pending).toBe(0);
    expect(stats.completed).toBe(0);
    expect(stats.drafts).toBe(0);
  });
});

describe('pendingProjects', () => {
  it('returns only projects awaiting approval', () => {
    const projects = [
      project(1, 'Активный'),
      project(2, 'На утверждении'),
      project(3, 'Черновик'),
      project(4, 'На утверждении'),
    ];
    const pending = pendingProjects(projects);
    expect(pending.map((p) => p.id)).toEqual([2, 4]);
  });

  it('returns empty array when nothing is pending', () => {
    expect(pendingProjects([project(1, 'Активный')])).toEqual([]);
  });
});
