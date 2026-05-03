/*
 * Projects API surface — single source of truth after integration of the
 * student-catalog / mentor-dashboard / coordinator branches.
 *
 * Types come from `./types` (which re-exports the swagger-generated DTOs),
 * not from feature-local re-definitions.
 */

import { apiFetch } from './client';
import type {
  PaginatedList,
  Project,
  ProjectApplicantsResponse,
  ProjectFull,
  ProjectStatus,
} from './types';

export interface ListProjectsQuery {
  limit?: number;
  offset?: number;
  company?: string;
  course?: string;
  status?: ProjectStatus | string;
  /** Filter by mentor (added in feature/backend-gaps). */
  mentorId?: number;
}

export function listProjects(query: ListProjectsQuery = {}): Promise<PaginatedList<Project>> {
  return apiFetch<PaginatedList<Project>>('/projects', { query });
}

export function getProject(id: number): Promise<Project> {
  return apiFetch<Project>(`/projects/${id}`);
}

export function getProjectFull(id: number): Promise<ProjectFull> {
  return apiFetch<ProjectFull>(`/projects/${id}/full`);
}

export function getProjectApplicants(id: number): Promise<ProjectApplicantsResponse> {
  return apiFetch<ProjectApplicantsResponse>(`/projects/${id}/applicants`);
}

export function createProject(payload: Partial<Project>): Promise<Project> {
  return apiFetch<Project>('/projects', { method: 'POST', body: payload });
}

export function updateProject(id: number, payload: Partial<Project>): Promise<Project> {
  return apiFetch<Project>(`/projects/${id}`, { method: 'PUT', body: payload });
}

export function deleteProject(id: number): Promise<void> {
  return apiFetch<void>(`/projects/${id}`, { method: 'DELETE' });
}

/** Mentor archive — completed projects of the current mentor (feature/backend-gaps). */
export function listMentorArchive(query: { limit?: number; offset?: number } = {}): Promise<
  PaginatedList<Project>
> {
  return apiFetch<PaginatedList<Project>>('/mentor/projects/archive', { query });
}

/**
 * Predecessor of a project (feature/backend-gaps).
 * 200 + Project — has predecessor; 200 + null — no predecessor; 404 — id missing.
 */
export function getProjectPredecessor(id: number): Promise<Project | null> {
  return apiFetch<Project | null>(`/projects/${id}/predecessor`);
}
