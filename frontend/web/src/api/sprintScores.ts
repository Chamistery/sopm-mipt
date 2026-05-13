/*
 * Hand-written API surface for sprint participation scores.
 *
 * Mentor uses these to grade each team member after a sprint. POST creates
 * a fresh score; PUT updates an existing one (the mentor edits their
 * previous grade before the sprint closes).
 */

import { apiFetch } from './client';
import type { UserSummary } from './users';

export type SprintScoreCategory = 'mentor' | 'tracker' | 'defense' | 'peer';

export interface SprintScore {
  id: number;
  sprintId: number;
  teamId: number;
  studentId: number;
  student?: UserSummary | null;
  score: number;
  category: SprintScoreCategory;
  ktu?: number | null;
  comment?: string;
  scoredById: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListSprintScoresQuery {
  sprintId?: number;
  teamId?: number;
  studentId?: number;
}

export function listSprintScores(query: ListSprintScoresQuery = {}): Promise<SprintScore[]> {
  return apiFetch<SprintScore[]>('/sprint-scores', { query });
}

export interface CreateSprintScorePayload {
  sprintId: number;
  teamId: number;
  studentId: number;
  score: number;
  category?: SprintScoreCategory;
  ktu?: number | null;
  comment?: string;
  scoredById: number;
}

export function createSprintScore(payload: CreateSprintScorePayload): Promise<SprintScore> {
  return apiFetch<SprintScore>('/sprint-scores', { method: 'POST', body: payload });
}

export interface UpdateSprintScorePayload {
  score: number;
  category?: SprintScoreCategory;
  ktu?: number | null;
  comment?: string;
}

export function updateSprintScore(
  id: number,
  payload: UpdateSprintScorePayload,
): Promise<SprintScore> {
  return apiFetch<SprintScore>(`/sprint-scores/${id}`, { method: 'PUT', body: payload });
}

export const MIN_SCORE = 0;
export const MAX_SCORE = 10;

export function validateScore(value: number): string | null {
  if (!Number.isFinite(value)) return 'Введите число';
  if (!Number.isInteger(value)) return 'Целое число';
  if (value < MIN_SCORE) return `Не меньше ${MIN_SCORE}`;
  if (value > MAX_SCORE) return `Не больше ${MAX_SCORE}`;
  return null;
}
