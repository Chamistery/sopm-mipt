import { useQuery } from '@tanstack/react-query';

import { getProject, type Project } from '@/api/projects';

/**
 * Lightweight project loader — used by team-context screens that just
 * need the project title for breadcrumbs/subtitle. Skips the heavy
 * `/projects/{id}/full` aggregate which also pulls sprints + teams.
 */
export function useProject(projectId: number | null) {
  return useQuery<Project>({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId ?? 0),
    enabled: projectId != null && Number.isFinite(projectId) && projectId > 0,
  });
}
