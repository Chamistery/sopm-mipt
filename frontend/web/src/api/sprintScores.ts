import { apiFetch } from './client';
import type { SprintScore } from './types';

export interface ListSprintScoresQuery {
  sprintId?: number;
  teamId?: number;
  studentId?: number;
}

export function listSprintScores(query: ListSprintScoresQuery): Promise<SprintScore[]> {
  return apiFetch<SprintScore[]>('/sprint-scores', { query });
}

export function createSprintScore(
  payload: { sprintId: number; teamId: number; studentId: number; score: number; comment?: string },
): Promise<SprintScore> {
  return apiFetch<SprintScore>('/sprint-scores', { method: 'POST', body: payload });
}

export function updateSprintScore(
  id: number,
  payload: { score?: number; comment?: string },
): Promise<SprintScore> {
  return apiFetch<SprintScore>(`/sprint-scores/${id}`, { method: 'PUT', body: payload });
}
