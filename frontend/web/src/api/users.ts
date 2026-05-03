/*
 * Hand-written API surface for users endpoints.
 *
 * Covers /users + /users/{id}/profile + /users/{id}/files. When the
 * generated SDK is wired up (see generated/), these can become thin
 * wrappers — for now they encode the contract from the backend's
 * swagger.yaml directly so feature work isn't blocked on codegen.
 */

import { apiFetch } from './client';
import type { Role } from '@/auth/roles';

export interface UserSummary {
  id: number;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  email: string;
  role: Role;
  course?: string | null;
  group?: string | null;
  gpa?: number | null;
  direction?: string | null;
  company?: string | null;
}

export interface ProfileLink {
  type: string;
  url: string;
}

export interface UserProfile {
  userId: number;
  telegram?: string | null;
  phone?: string | null;
  about?: string | null;
  skills: string[];
  links: ProfileLink[];
  notificationsSeenAt?: string | null;
}

export interface UserProfileUpdate {
  telegram?: string | null;
  phone?: string | null;
  about?: string | null;
  skills?: string[];
  links?: ProfileLink[];
}

export function listUsers(): Promise<UserSummary[]> {
  return apiFetch<UserSummary[]>('/users');
}

export function getUser(id: number): Promise<UserSummary> {
  return apiFetch<UserSummary>(`/users/${id}`);
}

export function getUserProfile(id: number): Promise<UserProfile> {
  return apiFetch<UserProfile>(`/users/${id}/profile`);
}

export function updateUserProfile(id: number, payload: UserProfileUpdate): Promise<UserProfile> {
  return apiFetch<UserProfile>(`/users/${id}/profile`, {
    method: 'PUT',
    body: payload,
  });
}

export function fullName(user: Pick<UserSummary, 'firstName' | 'lastName'>): string {
  return `${user.lastName} ${user.firstName}`.trim();
}
