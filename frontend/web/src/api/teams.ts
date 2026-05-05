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

/** Запустить команду — переключает teams.launched=true. Используется на
 *  странице «Незапущенные команды» у ментора. */
export function launchTeam(id: number): Promise<Team> {
  return apiFetch<Team>(`/teams/${id}/launch`, { method: 'POST' });
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
  /**
   * Смещение события в днях от `sprint.startDate` (0 = первый день спринта).
   * Бэк хранит именно offset (см. backend/project-service/internal/models/task.go),
   * фронт отображает как абсолютную позицию на ширине бара.
   */
  day: number;
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

/*
 * Adapter layer between sproject's rich DTOs (TaskDto/TeamContextDto/...) and
 * the actual backend shapes (Task with hoursEstimate/mrLink, Team without
 * embedded project/sprint metadata). Sproject components stay unchanged;
 * the wire payload now matches what backend/project-service really
 * accepts and emits.
 *
 * Once swagger ships these as composite endpoints (UserTeamContext,
 * GanttResponse with members), drop these adapters and let components
 * hit the standard layer directly.
 */

import { getProject } from './projects';
import {
  acceptTask as acceptTaskRich,
  approveTask as approveTaskRich,
  rejectTask as rejectTaskRich,
  returnTask as returnTaskRich,
  type Task as BackendTask,
} from './tasks';

function taskToDto(t: BackendTask): TaskDto {
  return {
    id: t.id,
    teamId: t.teamId,
    sprintId: t.sprintId,
    assigneeId: t.assigneeId,
    name: t.name,
    description: t.description ?? null,
    status: t.status,
    hours: t.hoursEstimate,
    startDate: t.startDate,
    endDate: t.endDate,
    mr: t.mrLink ?? null,
    workDescription: t.workDescription ?? null,
    wasOverdue: t.wasOverdue,
    history: t.history?.map((h) => ({
      // Бэк хранит `day` как смещение в днях от начала спринта; фронт
      // оперирует тем же offset'ом и считает позицию маркера на TaskBar.
      day: typeof h.day === 'number' ? h.day : 0,
      event:
        h.event === 'review' || h.event === 'returned' || h.event === 'accepted'
          ? h.event
          : 'review',
    })),
    mentorComments: t.mentorComments?.map((c) => ({ action: c.action, text: c.text })),
  };
}

function dtoToCreatePayload(p: CreateTaskPayload): Partial<BackendTask> {
  const out: Partial<BackendTask> = {
    teamId: p.teamId,
    sprintId: p.sprintId,
    assigneeId: p.assigneeId,
    name: p.name,
    hoursEstimate: p.hours,
    startDate: p.startDate,
    endDate: p.endDate,
  };
  if (p.description !== undefined && p.description !== null) out.description = p.description;
  return out;
}

function dtoToUpdatePayload(p: UpdateTaskPayload): Partial<BackendTask> {
  const out: Partial<BackendTask> = {};
  if (p.name !== undefined) out.name = p.name;
  if (p.description !== undefined && p.description !== null) out.description = p.description;
  if (p.hours !== undefined) out.hoursEstimate = p.hours;
  if (p.mr !== undefined && p.mr !== null) out.mrLink = p.mr;
  if (p.workDescription !== undefined && p.workDescription !== null)
    out.workDescription = p.workDescription;
  return out;
}

function memberToDto(m: TeamMember): TeamMemberDto {
  return {
    userId: m.userId,
    firstName: m.user.firstName,
    lastName: m.user.lastName,
    middleName: null,
    role: 'student' as Role,
    projectRole: m.roleInTeam ?? null,
    isLeader: m.isLeader,
  };
}

function sprintToDto(s: Sprint): SprintDto {
  return {
    id: s.id,
    number: s.number,
    startDate: s.startDate,
    endDate: s.endDate,
    status: s.status,
  };
}

/**
 * `GET /api/users/{id}/team` — backend returns Team alone. We compose with
 * project + sprint list to give sproject pages a single ready-to-render shape.
 */
export async function getTeamContext(userId: number): Promise<TeamContextDto> {
  const team = await apiFetch<Team>(`/users/${userId}/team`);
  const projectId = team.projectId;
  const [project, sprints] = await Promise.all([
    getProject(projectId),
    listSprintsByProject(projectId),
  ]);
  const currentSprint = pickDefaultSprint(sprints) ?? sprints[sprints.length - 1] ?? {
    id: 0,
    projectId,
    number: 0,
    startDate: '',
    endDate: '',
    status: 'Запланирован' as const,
  };
  return {
    teamId: team.id,
    teamName: team.name,
    projectId,
    projectTitle: project.title,
    initiator: project.company ?? null,
    mentor: null, // No mentor info in /users/{id}/team yet — leave null until swagger adds it
    currentSprint: sprintToDto(currentSprint),
    sprintsTotal: sprints.length,
    members: (team.members ?? []).map(memberToDto),
  };
}

/**
 * `GET /api/teams/{id}/gantt` returns standard GanttResponse. We re-shape its
 * tasks/members to the dto sproject expects.
 */
export async function getGantt(teamId: number, sprintId: number): Promise<GanttResponseDto> {
  const data = await apiFetch<GanttResponse>(`/teams/${teamId}/gantt`, { query: { sprintId } });
  return {
    team: { id: teamId, name: '' },
    sprint: sprintToDto(data.sprint),
    members: data.members.map((m) => ({
      userId: m.userId,
      firstName: '',
      lastName: m.name,
      middleName: null,
      role: 'student' as Role,
      projectRole: m.roleInTeam ?? null,
      isLeader: m.isLeader,
    })),
    tasks: data.tasks.map((t) => taskToDto(t as unknown as BackendTask)),
  };
}

export async function createTask(payload: CreateTaskPayload): Promise<TaskDto> {
  const created = await apiFetch<BackendTask>('/tasks', {
    method: 'POST',
    body: dtoToCreatePayload(payload),
  });
  return taskToDto(created);
}

export async function updateTask(id: number, payload: UpdateTaskPayload): Promise<TaskDto> {
  const updated = await apiFetch<BackendTask>(`/tasks/${id}`, {
    method: 'PUT',
    body: dtoToUpdatePayload(payload),
  });
  return taskToDto(updated);
}

export async function submitTaskForReview(id: number): Promise<TaskDto> {
  const updated = await apiFetch<BackendTask>(`/tasks/${id}/submit-review`, { method: 'PUT' });
  return taskToDto(updated);
}

export function deleteTask(id: number): Promise<void> {
  return apiFetch<void>(`/tasks/${id}`, { method: 'DELETE' });
}

/* Re-export mentor task actions (approve/reject/accept/return) so callers
 * have a single import path. They already return BackendTask — adapt at the
 * call site if a TaskDto is needed. */
export { approveTaskRich, rejectTaskRich, acceptTaskRich, returnTaskRich };

// Team report functions live in `./teamReports.ts` — single source of truth
// (backend uses `summary`, not `whatDone`). The duplicates that used to live
// here were removed in cleanup/m1; sproject components now import from
// `@/api/teamReports` directly.
