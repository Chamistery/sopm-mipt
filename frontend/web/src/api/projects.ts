/*
 * Hand-written API surface for project endpoints.
 *
 * Mirrors backend/project-service/swagger.yaml. Fields match the
 * backend DTOs (Project / ProjectListItem / CreateProjectRequest).
 *
 * Once `npm run gen:api` is wired and stable, this can be replaced
 * with thin wrappers around the generated SDK — for now we encode
 * the contract explicitly so feature work isn't blocked on codegen.
 */

import { apiFetch } from './client';

export const PROJECT_STATUSES = [
  'Черновик',
  'Опубликован',
  'Активный',
  'Завершен',
  'Архивный',
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export interface FieldValue {
  fieldId: string;
  value: string;
}

export interface ProjectListItem {
  id: number;
  title: string;
  status: ProjectStatus;
  mentorId: number;
  company?: string;
  course?: string;
  maxSlots: number;
  filledSlots: number;
  createdAt: string;
}

export interface Project extends Omit<ProjectListItem, 'filledSlots'> {
  templateId: string;
  fieldValues: FieldValue[];
  creatorId: number;
  updatedAt: string;
}

export interface ProjectListResponse {
  projects: ProjectListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface ProjectListQuery {
  limit?: number;
  offset?: number;
  company?: string;
  course?: string;
  status?: ProjectStatus;
}

export function listProjects(query: ProjectListQuery = {}): Promise<ProjectListResponse> {
  return apiFetch<ProjectListResponse>('/projects', { query });
}

export function getProject(id: number): Promise<Project> {
  return apiFetch<Project>(`/projects/${id}`);
}

export interface CreateProjectRequest {
  title: string;
  templateId: string;
  mentorId: number;
  creatorId: number;
  maxSlots: number;
  fieldValues?: FieldValue[];
  company?: string;
  course?: string;
}

export function createProject(payload: CreateProjectRequest): Promise<Project> {
  return apiFetch<Project>('/projects', { method: 'POST', body: payload });
}

/**
 * Computes filled-vs-total ratio for a project list item, clamped to [0, 1].
 * Used by ProjectCard to render the progress bar.
 */
export function projectFillRatio(item: Pick<ProjectListItem, 'filledSlots' | 'maxSlots'>): number {
  if (item.maxSlots <= 0) return 0;
  const ratio = item.filledSlots / item.maxSlots;
  if (ratio < 0) return 0;
  if (ratio > 1) return 1;
  return ratio;
}

/**
 * Returns true when the project is in a state where the mentor can run
 * student distribution (review applications, assign to teams).
 */
export function isProjectInDistribution(status: ProjectStatus): boolean {
  return status === 'Опубликован';
}
