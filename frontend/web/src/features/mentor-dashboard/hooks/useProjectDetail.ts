import { useQuery } from '@tanstack/react-query';

import { getProject } from '@/api/projects';

/**
 * Loads a single project for the mentor's detail screen.
 *
 * Brief mentioned `/projects/{id}/full` (project + sprints + teams) but
 * that endpoint isn't in swagger.yaml yet. For MVP we reuse the standard
 * `GET /projects/{id}`. Teams/sprints will be wired here once the
 * backend agent ships the aggregated route.
 */
export function useProjectDetail(projectId: number) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId),
    enabled: Number.isFinite(projectId) && projectId > 0,
  });
}
