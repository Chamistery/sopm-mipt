import { apiFetch } from './client';
import type { TeamReport, TeamReportStatus } from './types';

export interface ListTeamReportsQuery {
  teamId: number;
  sprintId?: number;
}

export function listTeamReports(query: ListTeamReportsQuery): Promise<TeamReport[]> {
  return apiFetch<TeamReport[]>('/team-reports', { query });
}

export function createTeamReport(payload: Partial<TeamReport>): Promise<TeamReport> {
  return apiFetch<TeamReport>('/team-reports', { method: 'POST', body: payload });
}

export function updateTeamReport(
  id: number,
  payload: Partial<TeamReport> & { status?: TeamReportStatus | string },
): Promise<TeamReport> {
  return apiFetch<TeamReport>(`/team-reports/${id}`, { method: 'PUT', body: payload });
}

export function reviewTeamReport(id: number, mentorComment: string): Promise<TeamReport> {
  return apiFetch<TeamReport>(`/team-reports/${id}/review`, {
    method: 'PUT',
    body: { mentorComment },
  });
}
