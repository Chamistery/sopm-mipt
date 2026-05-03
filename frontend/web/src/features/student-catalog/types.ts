/*
 * Local view-model types for the student catalog feature.
 *
 * The catalog enriches API ProjectListItem with derived data (mentor name,
 * applied count, qualification check) so the UI only deals with one shape.
 */

import type { ProjectListItem } from '@/api/projects';

export interface CatalogProject extends ProjectListItem {
  /** Display name of the mentor, resolved via /api/users. May be empty until loaded. */
  mentorName: string;
  /** True when the current student doesn't meet `course` requirement of the project. */
  unqualified: boolean;
  /** Reason text shown next to the «Не соответствует требованиям» badge. */
  unqualifiedReason: string;
}

export interface PrioritySlots {
  /** slot index (1..5) → projectId, or undefined when slot is empty. */
  [slot: number]: number | undefined;
}

export const SLOT_COUNT = 5;
export const SLOT_INDICES: ReadonlyArray<number> = [1, 2, 3, 4, 5];
