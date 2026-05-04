import { useQuery } from '@tanstack/react-query';

import { getProjectApplicants, type ProjectApplicantsResponse } from '@/api/applications';

/**
 * Loads the pre-grouped applicants payload for a project — qualified vs
 * unqualified × priority buckets + team buckets. Drives the mentor
 * distribution screen.
 */
export function useProjectApplicants(projectId: number) {
  return useQuery<ProjectApplicantsResponse>({
    queryKey: ['project', projectId, 'applicants'],
    queryFn: () => getProjectApplicants(projectId),
    enabled: Number.isFinite(projectId) && projectId > 0,
  });
}
