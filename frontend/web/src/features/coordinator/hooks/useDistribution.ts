/*
 * Distribution polling. We treat the distribution service as a real backend
 * even though it lives outside this repo — the project-service exposes thin
 * proxy stubs. The query polls every 5s while a run is in progress; once
 * the service signals «done» / «error» / «unavailable», polling stops.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

import {
  generateDistribution,
  getDistributionStatus,
  type DistributionRunResult,
  type DistributionStatus,
} from '@/api/distribution';

const POLL_INTERVAL_MS = 5000;
const STATUS_KEY = ['coordinator', 'distribution', 'status'] as const;

export function useDistributionStatusQuery(): UseQueryResult<DistributionStatus, unknown> {
  return useQuery({
    queryKey: STATUS_KEY,
    queryFn: getDistributionStatus,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return POLL_INTERVAL_MS;
      return data.stage === 'running' ? POLL_INTERVAL_MS : false;
    },
    refetchIntervalInBackground: false,
  });
}

export function useGenerateDistribution(): UseMutationResult<
  DistributionRunResult,
  unknown,
  void
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => generateDistribution(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: STATUS_KEY });
    },
  });
}
