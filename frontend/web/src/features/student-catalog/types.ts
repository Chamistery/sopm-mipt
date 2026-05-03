/*
 * Local view-model types for the student catalog feature.
 *
 * The catalog enriches the API Project DTO with derived data (mentor name,
 * applied count, qualification check) so the UI only deals with one shape.
 */

import type { Project } from '@/api';

export interface CatalogProject extends Omit<Project, 'company'> {
  /** Always present in the UI even though the DTO marks them optional. */
  id: number;
  title: string;

  /** Allow null in test fixtures where company is absent. */
  company?: string | null;

  /** Display name of the mentor, resolved via /api/users. May be empty until loaded. */
  mentorName: string;
  /** True when the current student doesn't meet `course` requirement of the project. */
  unqualified: boolean;
  /** Reason text shown next to the «Не соответствует требованиям» badge. */
  unqualifiedReason: string;

  /* Derived from API for UI convenience — Project DTO uses different fields. */
  /** First admissible course (Project uses `courses: number[]`). */
  course?: string | null;
  /** Total slots = numTeams × teamSizeMax. */
  maxSlots?: number;
  /** Currently accepted (computed by backend in some endpoints, may be undefined). */
  filledSlots?: number | null;
  /** Backend may include `createdAt`; not in the Project schema yet but used in fixtures. */
  createdAt?: string;
}

export interface PrioritySlots {
  /** slot index (1..5) → projectId, or undefined when slot is empty. */
  [slot: number]: number | undefined;
}

export const SLOT_COUNT = 5;
export const SLOT_INDICES: ReadonlyArray<number> = [1, 2, 3, 4, 5];
