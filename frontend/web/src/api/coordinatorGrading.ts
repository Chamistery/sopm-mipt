/*
 * GET /api/coordinator/grading — агрегат оценок по студентам.
 * Pixel-port из admin.html view-grading tab «Текущие оценки».
 */

import { apiFetch } from './client';

export interface CoordinatorGradingRow {
  studentId: number;
  studentName: string;
  projectTitle?: string;
  teamName?: string;
  mentorAvg?: number | null;
  ktu?: number | null;
  tracker?: number | null;
  defense?: number | null;
  peerReview?: number | null;
  total?: number | null;
}

export interface CoordinatorGradingResponse {
  rows: CoordinatorGradingRow[];
}

export function getCoordinatorGrading(): Promise<CoordinatorGradingResponse> {
  return apiFetch<CoordinatorGradingResponse>('/coordinator/grading');
}
