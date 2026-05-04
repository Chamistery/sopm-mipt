import { useQuery } from '@tanstack/react-query';

import { getMentorDashboard, type MentorDashboardProject } from '@/api/projects';

/**
 * Loads the aggregated mentor dashboard payload.
 *
 * We send `mentorId` for non-mentor roles (coordinator/admin peeking at a
 * specific mentor's dashboard). For the mentor themselves it's redundant —
 * the backend resolves the user via `X-User-Id` — but sending it doesn't
 * hurt and keeps the React-Query key parametric.
 */
export function useMentorDashboard(mentorId: number) {
  return useQuery({
    queryKey: ['mentor-dashboard', mentorId],
    queryFn: async (): Promise<MentorDashboardProject[]> => {
      const response = await getMentorDashboard({ mentorId });
      return response.projects;
    },
  });
}
