import { useQuery } from '@tanstack/react-query';

import { getTeamGantt, type GanttResponse } from '@/api/teams';

/**
 * Loads gantt data (sprint + members + tasks) for a team. Disabled until
 * we know which sprint to show.
 */
export function useTeamGantt(teamId: number, sprintId: number | null) {
  return useQuery<GanttResponse>({
    queryKey: ['team', teamId, 'gantt', sprintId],
    queryFn: () => getTeamGantt(teamId, sprintId ?? 0),
    enabled: Number.isFinite(teamId) && teamId > 0 && sprintId != null && sprintId > 0,
  });
}
