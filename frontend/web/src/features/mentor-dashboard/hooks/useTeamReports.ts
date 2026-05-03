import { useQuery } from '@tanstack/react-query';

import { listTeamReports, type TeamReport } from '@/api/teamReports';

/** Loads every report belonging to a team. */
export function useTeamReports(teamId: number) {
  return useQuery<TeamReport[]>({
    queryKey: ['team', teamId, 'reports'],
    queryFn: () => listTeamReports({ teamId }),
    enabled: Number.isFinite(teamId) && teamId > 0,
  });
}
