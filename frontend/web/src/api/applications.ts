/*
 * Applications API surface — combined after integration of:
 *  - feature/student-catalog (submit, list-student)
 *  - feature/mentor-dashboard (recommend / unrecommend / invite / exclude
 *    + ProjectApplicantsResponse + helpers)
 *
 * The mentor distribution UI relies on the dedicated /recommend etc.
 * endpoints; the student-catalog flow relies on POST /applications.
 *
 * Status transitions are enforced server-side; the helpers below just hit
 * the relevant action endpoint. See backend/project-service/swagger.yaml.
 */

import { apiFetch } from './client';

export const APPLICATION_STATUSES = [
  'Ожидает',
  'Не подходит',
  'Не рекомендован',
  'Рекомендован',
  'Принято ментором',
  'Принят',
  'Студент отклонил',
  'Авто-отклонено',
  'Исключён',
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export interface Application {
  id: number;
  projectId: number;
  studentId: number;
  teamId?: number | null;
  priority: number;
  status: ApplicationStatus;
  statusChangedAt?: string;
  invitedAt?: string | null;
  respondedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationWithProject extends Application {
  projectTitle?: string;
  company?: string;
}

// ─── Mentor distribution surface ────────────────────────────────────────

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

export function listProjectApplications(projectId: number): Promise<Application[]> {
  return apiFetch<Application[]>('/applications/project', { query: { projectId } });
}

export function listStudentApplications(
  studentId: number,
): Promise<ApplicationWithProject[]> {
  return apiFetch<ApplicationWithProject[]>('/applications', { query: { studentId } });
}

/** Recommends a student into a specific team — mentor distribution action. */
export function recommendApplicant(id: number, teamId: number): Promise<Application> {
  return apiFetch<Application>(`/applications/${id}/recommend`, {
    method: 'PUT',
    body: { teamId },
  });
}

/** Removes a previous recommendation, returning the application to the pool. */
export function unrecommendApplicant(id: number): Promise<Application> {
  return apiFetch<Application>(`/applications/${id}/unrecommend`, { method: 'PUT' });
}

/** Sends the official invite — moves the application to "Принято ментором". */
export function inviteApplicant(id: number): Promise<Application> {
  return apiFetch<Application>(`/applications/${id}/invite`, { method: 'PUT' });
}

/** Excludes a student from the project altogether. */
export function excludeApplicant(id: number): Promise<Application> {
  return apiFetch<Application>(`/applications/${id}/exclude`, { method: 'PUT' });
}

export interface ApplicantItem {
  applicationId: number;
  studentId: number;
  name: string;
  course: number;
  gpa: number;
  status: ApplicationStatus;
  teamId?: number | null;
}

export interface ApplicantPriorityBuckets {
  priority1: ApplicantItem[];
  priority2: ApplicantItem[];
  priority3: ApplicantItem[];
  priority4: ApplicantItem[];
  priority5: ApplicantItem[];
}

export interface ApplicantTeamMember {
  applicationId: number;
  studentId: number;
  name: string;
  status: ApplicationStatus;
}

export interface ApplicantTeamBucket {
  teamId: number;
  name: string;
  maxSize: number;
  members: ApplicantTeamMember[];
}

export interface ApplicantRequirements {
  minCourse: number;
  minGpa: number;
}

export interface ProjectApplicantsResponse {
  projectId: number;
  requirements: ApplicantRequirements;
  qualified: ApplicantPriorityBuckets;
  unqualified: ApplicantPriorityBuckets;
  teams: ApplicantTeamBucket[];
}

export function getProjectApplicants(projectId: number): Promise<ProjectApplicantsResponse> {
  return apiFetch<ProjectApplicantsResponse>(`/projects/${projectId}/applicants`);
}

export const MAX_PRIORITY = 5;

export function flattenPriorityBuckets(
  buckets: ApplicantPriorityBuckets,
): Array<{ priority: number; items: ApplicantItem[] }> {
  return [
    { priority: 1, items: buckets.priority1 },
    { priority: 2, items: buckets.priority2 },
    { priority: 3, items: buckets.priority3 },
    { priority: 4, items: buckets.priority4 },
    { priority: 5, items: buckets.priority5 },
  ];
}

export function isRecommended(item: ApplicantItem): boolean {
  return item.status === 'Рекомендован' && item.teamId != null;
}

export function isInvited(item: ApplicantItem): boolean {
  return item.status === 'Принято ментором' || item.status === 'Принят';
}

// ─── Student catalog surface ────────────────────────────────────────────

export interface SubmitApplicationInput {
  projectId: number;
  studentId: number;
  priority: number; // 1..5
}

export function submitApplication(input: SubmitApplicationInput): Promise<Application> {
  return apiFetch<Application>('/applications', { method: 'POST', body: input });
}

export function getApplication(id: number): Promise<Application> {
  return apiFetch<Application>(`/applications/${id}`);
}

export function getApplicationsByStudentExpanded(
  studentId: number,
): Promise<ApplicationWithProject[]> {
  return apiFetch<ApplicationWithProject[]>('/applications', {
    query: { studentId, expand: 'project' },
  });
}

// ─── Coordinator + student response actions ─────────────────────────────

export function acceptInvite(id: number): Promise<Application> {
  return apiFetch<Application>(`/applications/${id}/accept`, { method: 'PUT' });
}

export function declineInvite(id: number): Promise<Application> {
  return apiFetch<Application>(`/applications/${id}/decline`, { method: 'PUT' });
}

/** Coordinator-side exclusion (kept as an alias for excludeApplicant). */
export function excludeApplication(id: number, reason?: string): Promise<Application> {
  return apiFetch<Application>(`/applications/${id}/exclude`, {
    method: 'PUT',
    body: reason ? { reason } : undefined,
  });
}

export function deleteApplication(id: number): Promise<void> {
  return apiFetch<void>(`/applications/${id}`, { method: 'DELETE' });
}
