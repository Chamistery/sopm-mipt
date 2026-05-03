import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { getGantt, type GanttResponseDto } from '@/api/teams';

export function useGantt(
  teamId: number | null,
  sprintId: number | null,
): UseQueryResult<GanttResponseDto> {
  return useQuery({
    queryKey: ['team', teamId, 'gantt', sprintId],
    queryFn: () => getGantt(teamId as number, sprintId as number),
    enabled: teamId != null && sprintId != null,
  });
}
