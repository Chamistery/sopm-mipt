/*
 * Hand-written API surface for tasks + mentor approval transitions.
 *
 * Status vocabulary mirrors backend/project-service/internal/models/task.go.
 * Mentor actions: approve/reject (pending approval), accept/return
 * (in review). All four take an optional comment.
 */

import { apiFetch } from './client';

export const TASK_STATUSES = [
  'Ожидает аппрува',
  'Назначена',
  'Отклонена',
  'В работе',
  'На ревью',
  'Возвращена',
  'Готово',
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const MENTOR_COMMENT_ACTIONS = ['Аппрув', 'Отклонение', 'Принятие', 'Возврат'] as const;
export type MentorCommentAction = (typeof MENTOR_COMMENT_ACTIONS)[number];

export interface MentorComment {
  action: MentorCommentAction;
  text: string;
  createdAt?: string;
}

export interface TaskHistoryItem {
  day: number;
  event: string;
}

export interface Task {
  id: number;
  sprintId: number;
  teamId: number;
  assigneeId: number;
  assigneeName?: string;
  createdById: number;
  name: string;
  description?: string;
  status: TaskStatus;
  statusChangedAt?: string;
  wasOverdue?: boolean;
  hoursEstimate: number;
  startDate: string;
  endDate: string;
  mrLink?: string;
  workDescription?: string;
  mentorComments?: MentorComment[];
  history?: TaskHistoryItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CommentPayload {
  comment?: string;
}

export function approveTask(id: number, comment?: string): Promise<Task> {
  return apiFetch<Task>(`/tasks/${id}/approve`, {
    method: 'PUT',
    body: { comment } satisfies CommentPayload,
  });
}

export function rejectTask(id: number, comment: string): Promise<Task> {
  return apiFetch<Task>(`/tasks/${id}/reject`, {
    method: 'PUT',
    body: { comment } satisfies CommentPayload,
  });
}

export function acceptTask(id: number, comment?: string): Promise<Task> {
  return apiFetch<Task>(`/tasks/${id}/accept`, {
    method: 'PUT',
    body: { comment } satisfies CommentPayload,
  });
}

export function returnTask(id: number, comment: string): Promise<Task> {
  return apiFetch<Task>(`/tasks/${id}/return`, {
    method: 'PUT',
    body: { comment } satisfies CommentPayload,
  });
}

/**
 * Returns true when a mentor needs to act on the task — either approve a
 * fresh task or review a delivered one. Used to drive the "needs action"
 * filter on MentorTaskReviewPage.
 */
export function taskNeedsMentorAction(status: TaskStatus): boolean {
  return status === 'Ожидает аппрува' || status === 'На ревью';
}
