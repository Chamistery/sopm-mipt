import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { getTeamContext, type TeamContextDto } from '@/api/teams';

export function useTeamContext(userId: number): UseQueryResult<TeamContextDto> {
  return useQuery({
    queryKey: ['user', userId, 'team'],
    queryFn: () => getTeamContext(userId),
  });
}
