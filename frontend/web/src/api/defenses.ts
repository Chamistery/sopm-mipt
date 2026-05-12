/*
 * Defenses CRUD — /api/defenses[/:id].
 * Pixel-port из admin.html view-grading tab «Защиты».
 */

import { apiFetch } from './client';

export interface DefenseExpert {
  userId: number;
  firstName: string;
  lastName: string;
}

export interface DefenseProject {
  projectId: number;
  title: string;
  teamsCount: number;
}

export interface Defense {
  id: number;
  title: string;
  startsAt: string;
  endsAt?: string | null;
  location?: string;
  description?: string;
  semesterLabel?: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  projectIds: number[];
  experts: DefenseExpert[];
  projects: DefenseProject[];
}

export interface DefensesResponse {
  defenses: Defense[];
}

export interface DefenseInput {
  title: string;
  startsAt: string;
  endsAt?: string | null;
  location?: string;
  description?: string;
  semesterLabel?: string;
  completed?: boolean;
  projectIds?: number[];
  expertUserIds?: number[];
}

export function listDefenses(): Promise<DefensesResponse> {
  return apiFetch<DefensesResponse>('/defenses');
}

export function createDefense(input: DefenseInput): Promise<Defense> {
  return apiFetch<Defense>('/defenses', { method: 'POST', body: input });
}

export function updateDefense(id: number, input: DefenseInput): Promise<Defense> {
  return apiFetch<Defense>(`/defenses/${id}`, { method: 'PUT', body: input });
}

export function deleteDefense(id: number): Promise<void> {
  return apiFetch<void>(`/defenses/${id}`, { method: 'DELETE' });
}
