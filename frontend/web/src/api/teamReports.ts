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

/**
 * Returns the report for one (team, sprint) pair, or null if the team
 * hasn't created one yet. Backend may answer 404 — we normalise that to
 * null so the caller can branch on POST-vs-PUT without try/catch.
 */
export function getTeamReport(teamId: number, sprintId: number): Promise<TeamReport | null> {
  return apiFetch<TeamReport | null>('/team-reports', {
    query: { teamId, sprintId },
  }).catch((err: unknown) => {
    if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
      return null;
    }
    throw err;
  });
}

export interface CreateTeamReportPayload {
  teamId: number;
  sprintId: number;
  summary: string;
  problems: string;
  nextPlan: string;
  status?: TeamReportStatus;
}

export function createTeamReport(payload: CreateTeamReportPayload): Promise<TeamReport> {
  return apiFetch<TeamReport>('/team-reports', { method: 'POST', body: payload });
}

export interface UpdateTeamReportPayload {
  summary?: string;
  problems?: string;
  nextPlan?: string;
  status?: TeamReportStatus;
}

export function updateTeamReport(id: number, payload: UpdateTeamReportPayload): Promise<TeamReport> {
  return apiFetch<TeamReport>(`/team-reports/${id}`, { method: 'PUT', body: payload });
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
