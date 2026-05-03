import { useQuery } from '@tanstack/react-query';

import { getProjectFull, type ProjectFull } from '@/api/projects';

/**
 * Loads a project together with its sprints and teams via the
 * `/projects/{id}/full` aggregate endpoint. Disabled when the URL param
 * isn't a positive integer so we don't fire bad requests during render.
 */
export function useProjectDetail(projectId: number) {
  return useQuery<ProjectFull>({
    queryKey: ['project', projectId, 'full'],
    queryFn: () => getProjectFull(projectId),
    enabled: Number.isFinite(projectId) && projectId > 0,
  });
}
