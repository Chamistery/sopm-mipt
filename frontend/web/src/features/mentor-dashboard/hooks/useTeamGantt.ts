import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { getGantt, type GanttResponseDto } from '@/api/teams';

/**
 * Loads gantt data (sprint + members + tasks) for a team in the
 * `GanttResponseDto` shape that the shared `<GanttChart/>` consumes.
 * Disabled until we know which sprint to show. Shares `['team', id,
 * 'gantt', sprintId]` cache with sproject's `useGantt` — both call the
 * same adapter, so flicking between mentor and student views reuses
 * data.
 */
export function useTeamGantt(
  teamId: number,
  sprintId: number | null,
): UseQueryResult<GanttResponseDto> {
  return useQuery<GanttResponseDto>({
    queryKey: ['team', teamId, 'gantt', sprintId],
    queryFn: () => getGantt(teamId, sprintId ?? 0),
    enabled: Number.isFinite(teamId) && teamId > 0 && sprintId != null && sprintId > 0,
  });
}
