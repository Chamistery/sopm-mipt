import { useQuery } from '@tanstack/react-query';

import { listProjectApplications } from '@/api/applications';

/**
 * Loads the applicants for a project so the mentor can run distribution.
 *
 * Brief referenced `GET /projects/{id}/applicants` returning pre-grouped
 * buckets. The current backend exposes only `/applications/project?projectId=`
 * which returns a flat list — grouping into priority buckets happens on
 * the client via `groupApplicantsByPriority`. When the dedicated route
 * lands, swap this hook over while keeping the same cache key.
 */
export function useProjectApplicants(projectId: number) {
  return useQuery({
    queryKey: ['project', projectId, 'applicants'],
    queryFn: () => listProjectApplications(projectId),
    enabled: Number.isFinite(projectId) && projectId > 0,
  });
}
