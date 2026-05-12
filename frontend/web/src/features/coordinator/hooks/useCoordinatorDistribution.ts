import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import {
  getCoordinatorDistribution,
  type CoordinatorDistributionResponse,
} from '@/api/coordinatorDistribution';

export const COORDINATOR_DISTRIBUTION_KEY = ['coordinator', 'distribution'] as const;

export function useCoordinatorDistribution(): UseQueryResult<
  CoordinatorDistributionResponse,
  unknown
> {
  return useQuery({
    queryKey: COORDINATOR_DISTRIBUTION_KEY,
    queryFn: getCoordinatorDistribution,
  });
}
