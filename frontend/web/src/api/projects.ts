/*
 * Hand-written API surface for /api/projects.
 *
 * Mirrors backend/project-service/swagger.yaml. The Russian-language status
 * union is kept in sync with the backend ProjectStatus enum; «На утверждении»
 * is anticipated by the brief but is not yet in swagger — we accept it
 * defensively so coordinator UI does not blow up when the backend lands it.
 */

import { apiFetch } from './client';

export const PROJECT_STATUS_OFFICIAL = [
  'Черновик',
  'Опубликован',
  'Активный',
  'Завершен',
  'Архивный',
] as const;

/** Status that the brief mentions for projects waiting coordinator approval. */
export const PROJECT_STATUS_PENDING = 'На утверждении' as const;
/** Status the coordinator sets when they approve a project. Coordinator-only. */
export const PROJECT_STATUS_APPROVED = 'Утверждён' as const;

export type ProjectStatusOfficial = (typeof PROJECT_STATUS_OFFICIAL)[number];
export type ProjectStatus =
  | ProjectStatusOfficial
  | typeof PROJECT_STATUS_PENDING
  | typeof PROJECT_STATUS_APPROVED;

export interface ProjectListItem {
  id: number;
  title: string;
  status: ProjectStatus;
  mentorId: number;
  company?: string | null;
  course?: string | null;
  maxSlots: number;
  filledSlots: number;
  createdAt?: string;
}

export interface ProjectListResponse {
  projects: ProjectListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface FieldValue {
  fieldId: string;
  value: string;
}

export interface Project {
  id: number;
  title: string;
  templateId: string;
  fieldValues?: FieldValue[];
  status: ProjectStatus;
  mentorId: number;
  creatorId: number;
  maxSlots: number;
  company?: string | null;
  course?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectTeamMember {
  id: number;
  userId: number;
  fullName: string;
  role?: string | null;
}

export interface ProjectTeam {
  id: number;
  name: string;
  members: ProjectTeamMember[];
}

export interface ProjectSprintLite {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
}

/**
 * Composite response from `GET /api/projects/{id}/full`.
 *
 * Endpoint is not yet in swagger; if the backend returns 404 we fall back to
 * `getProject` and present an empty teams/sprints list so the page still
 * renders something useful.
 */
export interface ProjectFull {
  project: Project;
  sprints: ProjectSprintLite[];
  teams: ProjectTeam[];
}

export interface ListProjectsParams {
  status?: ProjectStatus;
  limit?: number;
  offset?: number;
  company?: string;
  course?: string;
}

export function listProjects(params: ListProjectsParams = {}): Promise<ProjectListResponse> {
  return apiFetch<ProjectListResponse>('/projects', { query: params });
}

export function getProject(id: number): Promise<Project> {
  return apiFetch<Project>(`/projects/${id}`);
}

export async function getProjectFull(id: number): Promise<ProjectFull> {
  try {
    return await apiFetch<ProjectFull>(`/projects/${id}/full`);
  } catch {
    // Fallback: synthesize a ProjectFull from the basic project endpoint so
    // the detail page still loads while the /full endpoint is not yet wired.
    const project = await getProject(id);
    return { project, sprints: [], teams: [] };
  }
}

export interface UpdateProjectPayload {
  title: string;
  status?: ProjectStatus;
  maxSlots?: number;
  company?: string;
  course?: string;
  fieldValues?: FieldValue[];
}

export function updateProject(id: number, payload: UpdateProjectPayload): Promise<Project> {
  return apiFetch<Project>(`/projects/${id}`, {
    method: 'PUT',
    body: payload,
  });
}
