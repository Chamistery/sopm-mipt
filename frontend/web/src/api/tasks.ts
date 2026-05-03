import { apiFetch } from './client';
import type { Task } from './types';

export interface ListTasksQuery {
  sprintId?: number;
  teamId?: number;
  assigneeId?: number;
}

export function listTasks(query: ListTasksQuery): Promise<Task[]> {
  return apiFetch<Task[]>('/tasks', { query });
}

export function getTask(id: number): Promise<Task> {
  return apiFetch<Task>(`/tasks/${id}`);
}

export function createTask(payload: Partial<Task>): Promise<Task> {
  return apiFetch<Task>('/tasks', { method: 'POST', body: payload });
}

export function updateTask(id: number, payload: Partial<Task>): Promise<Task> {
  return apiFetch<Task>(`/tasks/${id}`, { method: 'PUT', body: payload });
}

export function deleteTask(id: number): Promise<void> {
  return apiFetch<void>(`/tasks/${id}`, { method: 'DELETE' });
}

/* Mentor-only state transitions — comment is required for reject/return. */

export function approveTask(id: number, comment?: string): Promise<Task> {
  return apiFetch<Task>(`/tasks/${id}/approve`, {
    method: 'PUT',
    body: comment ? { comment } : undefined,
  });
}

export function rejectTask(id: number, comment: string): Promise<Task> {
  return apiFetch<Task>(`/tasks/${id}/reject`, { method: 'PUT', body: { comment } });
}

export function acceptTask(id: number, comment?: string): Promise<Task> {
  return apiFetch<Task>(`/tasks/${id}/accept`, {
    method: 'PUT',
    body: comment ? { comment } : undefined,
  });
}

export function returnTask(id: number, comment: string): Promise<Task> {
  return apiFetch<Task>(`/tasks/${id}/return`, { method: 'PUT', body: { comment } });
}

/* Assignee actions */

export function submitTaskForReview(id: number): Promise<Task> {
  return apiFetch<Task>(`/tasks/${id}/submit-review`, { method: 'PUT' });
}
