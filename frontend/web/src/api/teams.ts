/*
 * Teams + sprint + gantt + tasks + team-reports helpers.
 *
 * After integration this file holds two layers of DTOs:
 *
 *   1. Standard team / sprint / member shapes used by mentor-dashboard
 *      and others (`Team`, `Sprint`, `TeamMember`, `GanttResponse`,
 *      `GanttMember`, `SprintStatus`).
 *   2. The richer hand-written DTOs that the student-project feature was
 *      built against (`TeamContextDto`, `GanttResponseDto`, `TaskDto`,
 *      `TeamReportDto`). The backend swagger doesn't yet cover the extra
 *      fields these carry (`mentor` block on team context, `wasOverdue`,
 *      `history`, `mentorComments`, `whatDone`, etc.) — keep them here
 *      until swagger.yaml catches up, then collapse into (1).
 *
 * `tasks.ts` and `teamReports.ts` host the mentor-side surfaces
 * (approve/reject/accept/return + review action) and are imported
 * directly to avoid name collisions with the rich DTOs here.
 *
 * See ADR 0001 (Russian status strings, ISO dates, numeric IDs).
 */

import { apiFetch } from './client';
import type { UserSummary } from './users';
import type { Task as TaskListItem } from './tasks';
import type { Role } from '@/auth/roles';

// ─── Standard team / sprint surface (mentor-dashboard) ──────────────────

export const SPRINT_STATUSES = ['Запланирован', 'Активный', 'Завершён'] as const;
export type SprintStatus = (typeof SPRINT_STATUSES)[number];

export interface Sprint {
  id: number;
  projectId: number;
  number: number;
  startDate: string;
  endDate: string;
  status: SprintStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface TeamMember {
  id: number;
  teamId: number;
  userId: number;
  roleInTeam?: string;
  isLeader: boolean;
  joinedAt?: string;
  user: UserSummary;
}

export interface Team {
  id: number;
  projectId: number;
  name: string;
  leaderId?: number | null;
  leader?: UserSummary | null;
  members?: TeamMember[];
  currentSprint?: Sprint | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface GanttMember {
  userId: number;
  name: string;
  roleInTeam?: string;
  isLeader: boolean;
}

export interface GanttResponse {
  sprint: Sprint;
  members: GanttMember[];
  tasks: TaskListItem[];
}

export function listTeamsByProject(projectId: number): Promise<Team[]> {
  return apiFetch<Team[]>('/teams', { query: { projectId } });
}

/** Alias kept for older call sites that used `listTeams`. */
export const listTeams = listTeamsByProject;

export function getTeam(id: number): Promise<Team> {
  return apiFetch<Team>(`/teams/${id}`);
}

export function getTeamGantt(teamId: number, sprintId: number): Promise<GanttResponse> {
  return apiFetch<GanttResponse>(`/teams/${teamId}/gantt`, { query: { sprintId } });
}

export function createTeam(payload: {
  projectId: number;
  name: string;
  leaderId?: number;
}): Promise<Team> {
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

export function listSprintsByProject(projectId: number): Promise<Sprint[]> {
  return apiFetch<Sprint[]>('/sprints', { query: { projectId } });
}

/**
 * Picks the best sprint to show on the mentor task-review screen by default:
 * the active one, otherwise the next planned, otherwise the most recent.
 * Pure helper — exposed for unit tests.
 */
export function pickDefaultSprint(sprints: Sprint[]): Sprint | null {
  if (sprints.length === 0) return null;
  const active = sprints.find((s) => s.status === 'Активный');
  if (active) return active;
  const planned = sprints
    .filter((s) => s.status === 'Запланирован')
    .sort((a, b) => a.number - b.number);
  if (planned.length > 0) return planned[0] ?? null;
  const sorted = [...sprints].sort((a, b) => b.number - a.number);
  return sorted[0] ?? null;
}

/** Re-exported so sproject and other features can import status from here too. */
export type { TeamReportStatus } from './teamReports';

// ─── Rich DTOs used by feature/student-project ──────────────────────────

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
  startDate: string;
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

// ─── Team reports (rich DTOs for student-project) ──────────────────────
// `TeamReportStatus` is the single shared union, defined in `./teamReports.ts`.
// The DTO below carries student-project's richer shape (whatDone/score)
// that the mentor TeamReport doesn't have.

import type { TeamReportStatus } from './teamReports';

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

export function updateTeamReport(id: number, payload: TeamReportUpsert): Promise<TeamReportDto> {
  return apiFetch<TeamReportDto>(`/team-reports/${id}`, { method: 'PUT', body: payload });
}
