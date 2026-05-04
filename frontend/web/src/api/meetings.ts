import { apiFetch } from './client';
import type { Meeting } from './types';

export interface ListMeetingsQuery {
  teamId: number;
  upcoming?: boolean;
}

export function listMeetings(query: ListMeetingsQuery): Promise<Meeting[]> {
  return apiFetch<Meeting[]>('/meetings', { query });
}

export function createMeeting(payload: Partial<Meeting>): Promise<Meeting> {
  return apiFetch<Meeting>('/meetings', { method: 'POST', body: payload });
}

export function updateMeeting(id: number, payload: Partial<Meeting>): Promise<Meeting> {
  return apiFetch<Meeting>(`/meetings/${id}`, { method: 'PUT', body: payload });
}

export function deleteMeeting(id: number): Promise<void> {
  return apiFetch<void>(`/meetings/${id}`, { method: 'DELETE' });
}
