import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import {
  getCoordinatorDashboard,
  type CoordinatorDashboardResponse,
} from '@/api/coordinatorDashboard';

export const COORDINATOR_DASHBOARD_KEY = ['coordinator', 'dashboard'] as const;

export function useCoordinatorDashboard(): UseQueryResult<CoordinatorDashboardResponse, unknown> {
  return useQuery({
    queryKey: COORDINATOR_DASHBOARD_KEY,
    queryFn: getCoordinatorDashboard,
  });
}
