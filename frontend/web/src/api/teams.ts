/*
 * API surface for team / sprint / gantt endpoints.
 *
 * Status: бэкенд-ручки этого блока ещё не описаны в swagger.yaml
 * (там сейчас только templates / projects / applications / users).
 * Контракт ниже зафиксирован по AGENT_PLAYBOOK.md и брифу фичи
 * student-project; когда swagger пополнится — этот файл схлопнется
 * до тонкой обёртки над сгенерированным SDK.
 *
 * Соглашения (см. ADR 0001):
 *   - статусы — кириллица как в БД ('Ожидает аппрува', 'Назначена', ...)
 *   - идентификаторы — числовые
 *   - даты — ISO-строки YYYY-MM-DD
 *   - start/dur — производные, считаются на фронте
 */

import { apiFetch } from './client';
import type { Role } from '@/auth/roles';

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

// ─── Team reports ───────────────────────────────────────────────────────

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
  /** ISO RFC-3339, заполняется бэком. */
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
  // Бэк возвращает либо отчёт, либо null/404, если ещё не создан.
  // Нормализуем в null, чтобы вызывающий код не различал эти ветки.
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
