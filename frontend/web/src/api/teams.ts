import { apiFetch } from './client';
import type { GanttResponse, Team, TeamMember, UserTeamContext } from './types';

export function listTeams(projectId: number): Promise<Team[]> {
  return apiFetch<Team[]>('/teams', { query: { projectId } });
}

export function getTeam(id: number): Promise<Team> {
  return apiFetch<Team>(`/teams/${id}`);
}

export function getTeamGantt(teamId: number, sprintId: number): Promise<GanttResponse> {
  return apiFetch<GanttResponse>(`/teams/${teamId}/gantt`, { query: { sprintId } });
}

export function createTeam(payload: { projectId: number; name: string; leaderId?: number }): Promise<Team> {
  return apiFetch<Team>('/teams', { method: 'POST', body: payload });
}

export function updateTeam(id: number, payload: Partial<Team>): Promise<Team> {
  return apiFetch<Team>(`/teams/${id}`, { method: 'PUT', body: payload });
}

export function deleteTeam(id: number): Promise<void> {
  return apiFetch<void>(`/teams/${id}`, { method: 'DELETE' });
}

export function addTeamMember(
  teamId: number,
  payload: { userId: number; roleInTeam?: string },
): Promise<TeamMember> {
  return apiFetch<TeamMember>(`/teams/${teamId}/members`, { method: 'POST', body: payload });
}

export function removeTeamMember(teamId: number, userId: number): Promise<void> {
  return apiFetch<void>(`/teams/${teamId}/members/${userId}`, { method: 'DELETE' });
}

/** `GET /api/users/{id}/team` — returns the user's current team + project context. */
export function getUserTeam(userId: number): Promise<UserTeamContext> {
  return apiFetch<UserTeamContext>(`/users/${userId}/team`);
}
