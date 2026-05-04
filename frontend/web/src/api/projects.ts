/*
 * Projects API surface — combined after integration of:
 *  - feature/student-catalog
 *  - feature/mentor-dashboard
 *  - feature/coordinator
 *  - feature/backend-gaps (?mentorId, /archive, /predecessor)
 *
 * The shape mirrors backend/project-service/swagger.yaml (with hand-written
 * fields that swagger doesn't yet cover — `acceptedCount`, `availableSlots`,
 * `currentSprint`, etc., produced by the project-service repository).
 */

import { apiFetch } from './client';
import type { Sprint, Team } from './teams';
import type { UserSummary } from './users';

export const PROJECT_STATUSES = [
  'Черновик',
  'На утверждении',
  'Утверждён',
  'Опубликован',
  'Активный',
  'Завершён',
  'Архивный',
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/** Backwards-compat aliases for feature code. */
export const PROJECT_STATUS_OFFICIAL = PROJECT_STATUSES;
export type ProjectStatusOfficial = ProjectStatus;
export const PROJECT_STATUS_PENDING: ProjectStatus = 'На утверждении';
export const PROJECT_STATUS_APPROVED: ProjectStatus = 'Утверждён';

export interface FieldValue {
  fieldId: string;
  value: string;
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
  predecessorProjectId?: number | null;
  submittedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  /** Legacy template field values, used by the catalog detail modal. */
  fieldValues?: FieldValue[];
}

/** Coordinator-side trimmed team view for project detail page. */
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
  /** Filter by mentor (added in feature/backend-gaps). */
  mentorId?: number;
}

/** Alias kept for feature/coordinator imports. */
export type ListProjectsParams = ProjectListQuery;

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
  templateId?: string;
  mentorId: number;
  creatorId?: number;
  maxSlots?: number;
  fieldValues?: FieldValue[];
  company?: string;
  course?: string;
  /** Form-level description fields used by mentor's NewProjectForm. */
  description?: string;
  fullDescription?: string;
  technologies?: string[];
  teamSizeMin?: number;
  teamSizeMax?: number;
  numTeams?: number;
  minGpa?: number;
  goal?: string;
  expectedResult?: string;
  acceptanceCriteria?: string;
  competencies?: string;
  resources?: string;
  eduResult?: string;
  durationSemesters?: number;
  predecessorProjectId?: number | null;
}

export function createProject(payload: CreateProjectRequest): Promise<Project> {
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
  ProjectListResponse
> {
  return apiFetch<ProjectListResponse>('/mentor/projects/archive', { query });
}

/**
 * Predecessor of a project (feature/backend-gaps).
 * 200 + Project — has predecessor; 200 + null — no predecessor; 404 — id missing.
 */
export function getProjectPredecessor(id: number): Promise<Project | null> {
  return apiFetch<Project | null>(`/projects/${id}/predecessor`);
}

// ─── Hand-written helpers used by feature components ────────────────────

/**
 * Maximum total slots a project can fill = numTeams * teamSizeMax.
 * Used by ProjectCard fill-bar; falls back to teamSizeMax for older payloads.
 */
export function projectMaxSlots(item: Pick<ProjectListItem, 'numTeams' | 'teamSizeMax'>): number {
  const teams = item.numTeams > 0 ? item.numTeams : 1;
  const size = item.teamSizeMax > 0 ? item.teamSizeMax : 0;
  return teams * size;
}

/** Filled-vs-total ratio, clamped to [0, 1]. */
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

export function isProjectInDistribution(status: ProjectStatus): boolean {
  return status === 'Опубликован';
}

export function isProjectArchived(status: ProjectStatus): boolean {
  return status === 'Завершён' || status === 'Архивный';
}

/**
 * Reads a string-valued template field from a Project. Carried over from
 * feature/student-catalog for legacy template field-value payloads.
 */
export function getFieldValue(project: Project | null | undefined, fieldId: string): string {
  const fields = project?.fieldValues;
  if (!fields) return '';
  const found = fields.find((f) => f.fieldId === fieldId);
  return found?.value ?? '';
}
