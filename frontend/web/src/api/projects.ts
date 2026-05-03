/*
 * Hand-written API surface for projects + applications endpoints.
 *
 * Mirrors the schemas in backend/project-service/swagger.yaml. When the
 * generated SDK is wired up these can become thin wrappers — for now the
 * contract is encoded directly so feature work isn't blocked on codegen.
 */

import { apiFetch } from './client';

export type ProjectStatus = 'Черновик' | 'Опубликован' | 'Активный' | 'Завершен' | 'Архивный';

export type ApplicationStatus = 'Ожидает' | 'Принято' | 'Отклонено';

export interface FieldValue {
  fieldId: string;
  value: string;
}

export interface ProjectListItem {
  id: number;
  title: string;
  status: ProjectStatus;
  mentorId: number;
  company?: string | null;
  course?: string | null;
  maxSlots: number;
  filledSlots?: number | null;
  createdAt: string;
}

export interface Project {
  id: number;
  title: string;
  templateId?: string | null;
  fieldValues?: FieldValue[] | null;
  status: ProjectStatus;
  mentorId: number;
  creatorId?: number | null;
  maxSlots: number;
  company?: string | null;
  course?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectListResponse {
  projects: ProjectListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface ProjectListFilters {
  limit?: number;
  offset?: number;
  company?: string;
  course?: string;
  status?: ProjectStatus;
}

export interface Application {
  id: number;
  projectId: number;
  studentId: number;
  priority?: number | null;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationWithProject extends Application {
  projectTitle?: string | null;
  company?: string | null;
}

export interface CreateApplicationInput {
  projectId: number;
  studentId: number;
  priority: number;
}

export function listProjects(filters: ProjectListFilters = {}): Promise<ProjectListResponse> {
  return apiFetch<ProjectListResponse>('/projects', { query: { ...filters } });
}

export function getProject(id: number): Promise<Project> {
  return apiFetch<Project>(`/projects/${id}`);
}

export function getApplicationsByStudent(studentId: number): Promise<ApplicationWithProject[]> {
  return apiFetch<ApplicationWithProject[]>('/applications', { query: { studentId } });
}

export function createApplication(input: CreateApplicationInput): Promise<Application> {
  return apiFetch<Application>('/applications', {
    method: 'POST',
    body: input,
  });
}

/**
 * Reads a single field value from a Project's fieldValues by fieldId.
 * Returns empty string if the field is missing — useful for UI display.
 */
export function getFieldValue(project: Project | null | undefined, fieldId: string): string {
  if (!project?.fieldValues) return '';
  const found = project.fieldValues.find((f) => f.fieldId === fieldId);
  return found?.value ?? '';
}
