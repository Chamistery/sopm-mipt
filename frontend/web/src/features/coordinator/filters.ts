/*
 * Pure helpers for the projects list. Server-side search by free text is not
 * yet on the backend, so we filter client-side over the current page. Once
 * the backend exposes a `q` parameter, callers should switch and remove this.
 */

import type { ProjectListItem } from '@/api/projects';

export function filterProjects(
  projects: readonly ProjectListItem[],
  query: string,
): readonly ProjectListItem[] {
  const trimmed = query.trim().toLowerCase();
  if (trimmed === '') return projects;
  return projects.filter((p) => {
    if (p.title.toLowerCase().includes(trimmed)) return true;
    if (p.company && p.company.toLowerCase().includes(trimmed)) return true;
    return false;
  });
}
