/*
 * Hand-written API surface for application endpoints.
 *
 * Mirrors backend/project-service/swagger.yaml. The endpoints mentioned
 * in the mentor-dashboard brief that don't exist yet on the backend
 * (/applications/{id}/recommend, /unrecommend, /invite) are emulated
 * here on top of the generic PUT /applications/{id} until the backend
 * agent ships dedicated routes. See TODO blocks below.
 */

import { apiFetch } from './client';

export const APPLICATION_STATUSES = ['Ожидает', 'Принято', 'Отклонено'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export interface Application {
  id: number;
  projectId: number;
  studentId: number;
  priority: number;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationWithProject extends Application {
  projectTitle?: string;
  company?: string;
}

export function listProjectApplications(projectId: number): Promise<Application[]> {
  return apiFetch<Application[]>('/applications/project', { query: { projectId } });
}

export function listStudentApplications(studentId: number): Promise<ApplicationWithProject[]> {
  return apiFetch<ApplicationWithProject[]>('/applications', { query: { studentId } });
}

export interface UpdateApplicationRequest {
  priority?: number;
  status?: ApplicationStatus;
}

export function updateApplication(
  id: number,
  payload: UpdateApplicationRequest,
): Promise<Application> {
  return apiFetch<Application>(`/applications/${id}`, { method: 'PUT', body: payload });
}

/**
 * Mentor invites a student into the project — moves the application to
 * "Принято". Backend currently exposes only the generic update endpoint;
 * once `/applications/{id}/invite` lands we'll switch to it.
 */
export function inviteApplicant(id: number): Promise<Application> {
  return updateApplication(id, { status: 'Принято' });
}

/**
 * Mentor rejects a student — sets status to "Отклонено". Same caveat as
 * inviteApplicant: replace with `/applications/{id}/unrecommend` once
 * the backend route exists.
 */
export function rejectApplicant(id: number): Promise<Application> {
  return updateApplication(id, { status: 'Отклонено' });
}

export interface ApplicantsByPriority {
  /** priority 1..5 → applications. Index 0 holds priority 1, etc. */
  buckets: Application[][];
  /** Applications without a priority slot or beyond MAX_PRIORITY. */
  other: Application[];
}

export const MAX_PRIORITY = 5;

/**
 * Splits a flat list of project applications into priority buckets so the
 * mentor distribution board can render columns 1..5. Pure function — used
 * both by the page and tested directly.
 */
export function groupApplicantsByPriority(applications: Application[]): ApplicantsByPriority {
  const buckets: Application[][] = Array.from({ length: MAX_PRIORITY }, () => []);
  const other: Application[] = [];
  for (const app of applications) {
    const idx = app.priority - 1;
    if (Number.isInteger(app.priority) && idx >= 0 && idx < MAX_PRIORITY) {
      buckets[idx]?.push(app);
    } else {
      other.push(app);
    }
  }
  return { buckets, other };
}
