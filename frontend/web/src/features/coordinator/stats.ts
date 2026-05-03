/*
 * Client-side aggregation of project statuses for the coordinator dashboard.
 *
 * Backend has no aggregation endpoint yet (TODO follow-up). For MVP we pull
 * the full list once per filter and bucket on the client. This keeps the
 * surface tiny and avoids guessing at server-side semantics.
 */

import type { ProjectListItem, ProjectStatus } from '@/api/projects';
import { PROJECT_STATUS_PENDING } from '@/api/projects';

export interface CoordinatorStats {
  total: number;
  active: number;
  pending: number;
  completed: number;
  drafts: number;
}

const ACTIVE_STATUSES: ReadonlySet<ProjectStatus> = new Set(['Активный', 'Опубликован']);

export function computeStats(projects: readonly ProjectListItem[]): CoordinatorStats {
  const stats: CoordinatorStats = { total: 0, active: 0, pending: 0, completed: 0, drafts: 0 };
  for (const p of projects) {
    stats.total += 1;
    if (ACTIVE_STATUSES.has(p.status)) stats.active += 1;
    if (p.status === PROJECT_STATUS_PENDING) stats.pending += 1;
    if (p.status === 'Завершен') stats.completed += 1;
    if (p.status === 'Черновик') stats.drafts += 1;
  }
  return stats;
}

export function pendingProjects(
  projects: readonly ProjectListItem[],
): readonly ProjectListItem[] {
  return projects.filter((p) => p.status === PROJECT_STATUS_PENDING);
}
