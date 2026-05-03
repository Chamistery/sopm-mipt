/*
 * Applications API surface. Used by:
 *  - student-catalog: submit applications
 *  - mentor-dashboard: recommend / unrecommend / invite
 *  - coordinator:     exclude
 *
 * Status transitions are enforced server-side; the helpers below just hit the
 * relevant action endpoint. See backend/project-service/swagger.yaml.
 */

import { apiFetch } from './client';
import type { Application, PaginatedList } from './types';

export interface SubmitApplicationInput {
  projectId: number;
  studentId: number;
  priority: number; // 1..5
}

export function submitApplication(input: SubmitApplicationInput): Promise<Application> {
  return apiFetch<Application>('/applications', { method: 'POST', body: input });
}

export function getApplicationsByStudent(
  studentId: number,
): Promise<PaginatedList<Application>> {
  return apiFetch<PaginatedList<Application>>('/applications', { query: { studentId } });
}

export function getApplicationsByProject(
  projectId: number,
): Promise<PaginatedList<Application>> {
  return apiFetch<PaginatedList<Application>>('/applications/project', { query: { projectId } });
}

export function getApplication(id: number): Promise<Application> {
  return apiFetch<Application>(`/applications/${id}`);
}

export function recommendApplication(id: number, teamId: number): Promise<Application> {
  return apiFetch<Application>(`/applications/${id}/recommend`, {
    method: 'PUT',
    body: { teamId },
  });
}

export function unrecommendApplication(id: number): Promise<Application> {
  return apiFetch<Application>(`/applications/${id}/unrecommend`, { method: 'PUT' });
}

export function inviteApplication(id: number): Promise<Application> {
  return apiFetch<Application>(`/applications/${id}/invite`, { method: 'PUT' });
}

export function acceptInvite(id: number): Promise<Application> {
  return apiFetch<Application>(`/applications/${id}/accept`, { method: 'PUT' });
}

export function declineInvite(id: number): Promise<Application> {
  return apiFetch<Application>(`/applications/${id}/decline`, { method: 'PUT' });
}

export function excludeApplication(
  id: number,
  reason?: string,
): Promise<Application> {
  return apiFetch<Application>(`/applications/${id}/exclude`, {
    method: 'PUT',
    body: reason ? { reason } : undefined,
  });
}

export function deleteApplication(id: number): Promise<void> {
  return apiFetch<void>(`/applications/${id}`, { method: 'DELETE' });
}
