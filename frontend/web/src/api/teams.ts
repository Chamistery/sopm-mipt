/*
 * Hand-written API surface for teams, sprints and the gantt aggregation.
 *
 * Mirrors backend/project-service/swagger.yaml + the actual JSON shapes
 * emitted by the Go service (see internal/models/team.go and
 * internal/handlers/task_handler.go::Gantt).
 */

import { apiFetch } from './client';
import type { UserSummary } from './projects';
import type { Task } from './tasks';

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

export function listTeamsByProject(projectId: number): Promise<Team[]> {
  return apiFetch<Team[]>('/teams', { query: { projectId } });
}

export function getTeam(id: number): Promise<Team> {
  return apiFetch<Team>(`/teams/${id}`);
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
  tasks: Task[];
}

export function getTeamGantt(teamId: number, sprintId: number): Promise<GanttResponse> {
  return apiFetch<GanttResponse>(`/teams/${teamId}/gantt`, { query: { sprintId } });
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
