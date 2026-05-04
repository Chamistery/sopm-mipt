/*
 * Hand-written API surface for team reports + the mentor review action.
 */

import { apiFetch } from './client';

export const TEAM_REPORT_STATUSES = ['Черновик', 'Отправлен', 'Проверен'] as const;
export type TeamReportStatus = (typeof TEAM_REPORT_STATUSES)[number];

export interface TeamReport {
  id: number;
  sprintId: number;
  teamId: number;
  summary?: string;
  problems?: string;
  nextPlan?: string;
  status: TeamReportStatus;
  mentorComment?: string;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListTeamReportsQuery {
  teamId: number;
  sprintId?: number;
}

export function listTeamReports(query: ListTeamReportsQuery): Promise<TeamReport[]> {
  return apiFetch<TeamReport[]>('/team-reports', { query });
}

export interface ReviewTeamReportPayload {
  mentorComment: string;
}

export function reviewTeamReport(id: number, payload: ReviewTeamReportPayload): Promise<TeamReport> {
  return apiFetch<TeamReport>(`/team-reports/${id}/review`, {
    method: 'PUT',
    body: payload,
  });
}

/** Returns true when a mentor still needs to review the report. */
export function reportNeedsReview(status: TeamReportStatus): boolean {
  return status === 'Отправлен';
}
