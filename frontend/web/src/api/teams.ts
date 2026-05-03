/*
 * Teams + sprint + gantt + team-reports + tasks helpers used by
 * feature/student-project.
 *
 * After integration this file holds two layers:
 *
 *   1. The thin generated-DTO wrappers (`getUserTeam`, `getTeamGantt`, …)
 *      that everything new should use.
 *   2. The richer hand-written DTOs that the student-project feature was
 *      built against (`TeamContextDto`, `GanttResponseDto`, `TaskDto`, …).
 *      The backend swagger doesn't cover all of these fields yet
 *      (`mentor` block on team context, `wasOverdue`, `history`,
 *      `mentorComments`), so the feature kept its own contract. They live
 *      here for now to avoid touching the feature components — collapse
 *      into (1) once swagger.yaml catches up.
 *
 * See ADR 0001 (Russian status strings, ISO dates, numeric IDs).
 */

import { apiFetch } from './client';
import type { GanttResponse, Team, TeamMember, UserTeamContext } from './types';
import type { Role } from '@/auth/roles';

// ─── Generated-DTO surface ──────────────────────────────────────────────

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

/** `GET /api/users/{id}/team` — generated-DTO version. */
export function getUserTeam(userId: number): Promise<UserTeamContext> {
  return apiFetch<UserTeamContext>(`/users/${userId}/team`);
}

// ─── Rich DTOs used by feature/student-project ──────────────────────────
// These describe response fields not yet present in swagger.yaml — keep
// in sync with backend until the schema catches up.

export type TaskStatus =
  | 'Ожидает аппрува'
  | 'Назначена'
  | 'В работе'
  | 'На ревью'
  | 'Возвращена'
  | 'Готово'
  | 'Отклонена';

export type TaskHistoryEvent = 'review' | 'returned' | 'accepted';

export interface TaskHistoryEntry {
  /** Дата события, ISO YYYY-MM-DD. */
  date: string;
  event: TaskHistoryEvent;
}

export interface MentorComment {
  action: string;
  text: string;
}

export interface TaskDto {
  id: number;
  teamId: number;
  sprintId: number;
  assigneeId: number;
  name: string;
  description: string | null;
  status: TaskStatus;
  hours: number;
  /** ISO YYYY-MM-DD. */
  startDate: string;
  /** ISO YYYY-MM-DD, включительно. */
  endDate: string;
  mr: string | null;
  workDescription: string | null;
  wasOverdue?: boolean;
  history?: TaskHistoryEntry[];
  mentorComments?: MentorComment[];
}

export interface TeamMemberDto {
  userId: number;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  role: Role;
  /** Роль внутри проекта (Frontend-разработчик, Аналитик, ...). */
  projectRole?: string | null;
  isLeader: boolean;
}

export interface SprintDto {
  id: number;
  number: number;
  /** ISO YYYY-MM-DD. */
  startDate: string;
  /** ISO YYYY-MM-DD, включительно. */
  endDate: string;
  status: 'Запланирован' | 'Активный' | 'Завершён';
}

export interface TeamContextDto {
  teamId: number;
  teamName: string;
  projectId: number;
  projectTitle: string;
  initiator?: string | null;
  mentor?: {
    userId: number;
    firstName: string;
    lastName: string;
    middleName?: string | null;
  } | null;
  currentSprint: SprintDto;
  sprintsTotal: number;
  members: TeamMemberDto[];
}

export interface GanttResponseDto {
  team: { id: number; name: string };
  sprint: SprintDto;
  members: TeamMemberDto[];
  tasks: TaskDto[];
}

export interface CreateTaskPayload {
  teamId: number;
  sprintId: number;
  assigneeId: number;
  name: string;
  description?: string | null;
  hours: number;
  startDate: string;
  endDate: string;
}

export interface UpdateTaskPayload {
  name?: string;
  description?: string | null;
  hours?: number;
  mr?: string | null;
  workDescription?: string | null;
}

/** `GET /api/users/{id}/team` — student-project's rich variant. */
export function getTeamContext(userId: number): Promise<TeamContextDto> {
  return apiFetch<TeamContextDto>(`/users/${userId}/team`);
}

export function getGantt(teamId: number, sprintId: number): Promise<GanttResponseDto> {
  return apiFetch<GanttResponseDto>(`/teams/${teamId}/gantt`, { query: { sprintId } });
}

export function createTask(payload: CreateTaskPayload): Promise<TaskDto> {
  return apiFetch<TaskDto>('/tasks', { method: 'POST', body: payload });
}

export function updateTask(id: number, payload: UpdateTaskPayload): Promise<TaskDto> {
  return apiFetch<TaskDto>(`/tasks/${id}`, { method: 'PUT', body: payload });
}

export function submitTaskForReview(id: number): Promise<TaskDto> {
  return apiFetch<TaskDto>(`/tasks/${id}/submit-review`, { method: 'PUT' });
}

export function deleteTask(id: number): Promise<void> {
  return apiFetch<void>(`/tasks/${id}`, { method: 'DELETE' });
}

// ─── Team reports (rich DTOs) ───────────────────────────────────────────

export type TeamReportStatus = 'Черновик' | 'Отправлен' | 'Проверен';

export interface TeamReportDto {
  id: number;
  teamId: number;
  sprintId: number;
  whatDone: string;
  problems: string;
  nextPlan: string;
  status: TeamReportStatus;
  mentorComment?: string | null;
  score?: string | null;
  updatedAt?: string | null;
}

export interface TeamReportUpsert {
  whatDone: string;
  problems: string;
  nextPlan: string;
  status?: TeamReportStatus;
}

export function getTeamReport(
  teamId: number,
  sprintId: number,
): Promise<TeamReportDto | null> {
  return apiFetch<TeamReportDto | null>('/team-reports', {
    query: { teamId, sprintId },
  }).catch((err: unknown) => {
    if (err instanceof Error && 'status' in err && (err as { status: number }).status === 404) {
      return null;
    }
    throw err;
  });
}

export function createTeamReport(payload: {
  teamId: number;
  sprintId: number;
  whatDone: string;
  problems: string;
  nextPlan: string;
  status?: TeamReportStatus;
}): Promise<TeamReportDto> {
  return apiFetch<TeamReportDto>('/team-reports', { method: 'POST', body: payload });
}

export function updateTeamReport(
  id: number,
  payload: TeamReportUpsert,
): Promise<TeamReportDto> {
  return apiFetch<TeamReportDto>(`/team-reports/${id}`, { method: 'PUT', body: payload });
}
