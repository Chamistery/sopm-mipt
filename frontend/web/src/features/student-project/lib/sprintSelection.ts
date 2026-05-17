import type { Sprint } from '@/api/teams';

/**
 * Активный спринт → последний завершённый → первый. Используется как
 * default-выбор в SprintSwitcher на странице студента и у ментора.
 */
export function pickDefaultSprintId(sprints: Sprint[]): number | null {
  if (sprints.length === 0) return null;
  const active = sprints.find((s) => s.status === 'Активный');
  if (active) return active.id;
  const finished = [...sprints].reverse().find((s) => s.status === 'Завершён');
  return (finished ?? sprints[0])?.id ?? null;
}
