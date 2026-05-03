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
import type { Sprint, Team } from './teams';

export const PROJECT_STATUSES = [
  'Черновик',
  'Опубликован',
  'Активный',
  'Завершён',
  'Архивный',
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export interface FieldValue {
  fieldId: string;
  value: string;
}

export interface UserSummary {
  id: number;
  firstName: string;
  lastName: string;
}

export interface CurrentSprintInfo {
  id: number;
  number: number;
  status: string;
  startDate: string;
  endDate: string;
}

export interface ProjectListItem {
  id: number;
  title: string;
  status: ProjectStatus;
  mentorId: number;
  company?: string;
  courses?: number[];
  description?: string;
  technologies?: string[];
  teamSizeMin: number;
  teamSizeMax: number;
  numTeams: number;
  filledTeams: number;
  acceptedCount: number;
  availableSlots: number;
  minGpa?: number;
  currentSprint?: CurrentSprintInfo | null;
  mentor?: UserSummary | null;
  submittedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: number;
  title: string;
  status: ProjectStatus;
  mentorId: number;
  company?: string;
  courses?: number[];
  description?: string;
  fullDescription?: string;
  technologies?: string[];
  teamSizeMin: number;
  teamSizeMax: number;
  numTeams: number;
  minGpa?: number;
  eduResult?: string;
  acceptanceCriteria?: string;
  goal?: string;
  expectedResult?: string;
  competencies?: string;
  resources?: string;
  durationSemesters?: number;
  submittedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFull {
  project: Project;
  sprints: Sprint[];
  teams: Team[];
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
  mentorId?: number;
}

export function listProjects(query: ProjectListQuery = {}): Promise<ProjectListResponse> {
  return apiFetch<ProjectListResponse>('/projects', { query });
}

export function getProject(id: number): Promise<Project> {
  return apiFetch<Project>(`/projects/${id}`);
}

export function getProjectFull(id: number): Promise<ProjectFull> {
  return apiFetch<ProjectFull>(`/projects/${id}/full`);
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
 * Maximum total slots a project can fill = numTeams * teamSizeMax.
 * Used by ProjectCard fill-bar; fall back to teamSizeMax for older
 * payloads where numTeams is missing.
 */
export function projectMaxSlots(item: Pick<ProjectListItem, 'numTeams' | 'teamSizeMax'>): number {
  const teams = item.numTeams > 0 ? item.numTeams : 1;
  const size = item.teamSizeMax > 0 ? item.teamSizeMax : 0;
  return teams * size;
}

/**
 * Computes filled-vs-total ratio for a project list item, clamped to [0, 1].
 * Used by ProjectCard to render the progress bar.
 */
export function projectFillRatio(
  item: Pick<ProjectListItem, 'acceptedCount' | 'numTeams' | 'teamSizeMax'>,
): number {
  const max = projectMaxSlots(item);
  if (max <= 0) return 0;
  const ratio = item.acceptedCount / max;
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

/**
 * Returns true when the project is finished/archived — used for the
 * mentor archive screen filter.
 */
export function isProjectArchived(status: ProjectStatus): boolean {
  return status === 'Завершён' || status === 'Архивный';
}
