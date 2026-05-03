import { apiFetch } from './client';

/*
 * Distribution service is implemented externally (not in this repo). The
 * project-service exposes proxy endpoints; treat 5xx/501/503 as "service
 * temporarily unavailable" in the UI rather than as a bug.
 */

export type DistributionState = 'idle' | 'running' | 'done' | 'error' | 'unavailable';

export interface DistributionStatus {
  state: DistributionState;
  startedAt?: string | null;
  finishedAt?: string | null;
  message?: string | null;
}

export function generateDistribution(): Promise<DistributionStatus> {
  return apiFetch<DistributionStatus>('/distribution/generate', { method: 'POST' });
}

export function getDistributionStatus(): Promise<DistributionStatus> {
  return apiFetch<DistributionStatus>('/distribution/status');
}
