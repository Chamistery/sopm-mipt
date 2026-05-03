/*
 * Local view-model types for the student catalog feature.
 *
 * The catalog enriches the API ProjectListItem with derived data (mentor name,
 * qualification check, derived course/maxSlots) so the UI only deals with
 * one shape.
 */

import type { ProjectListItem, ProjectStatus } from '@/api';

/*
 * Partial extends so test fixtures can construct minimal CatalogProject
 * objects without spelling every field of the larger ProjectListItem
 * (numTeams / teamSizeMax / filledTeams / acceptedCount / availableSlots
 * / updatedAt). The page wires real data from listProjects() which
 * already populates them; the tests don't exercise those numeric paths.
 *
 * TODO(integration): once tests use a fixture builder, drop Partial<>.
 */
export interface CatalogProject extends Partial<Omit<ProjectListItem, 'company' | 'id' | 'title' | 'status' | 'mentorId'>> {
  id: number;
  title: string;
  status: ProjectStatus;
  mentorId: number;

  /** Allow null in test fixtures where company is absent. */
  company?: string | null;

  /** Display name of the mentor, resolved via /api/users. May be empty until loaded. */
  mentorName: string;
  /** True when the current student doesn't meet `course` requirement of the project. */
  unqualified: boolean;
  /** Reason text shown next to the «Не соответствует требованиям» badge. */
  unqualifiedReason: string;

  /* Derived from API for UI convenience — ProjectListItem uses `courses: number[]`. */
  /** First admissible course label (e.g. "2"). */
  course?: string | null;
  /** Total slots = numTeams × teamSizeMax. */
  maxSlots?: number;
  /** Convenience alias for `acceptedCount`. */
  filledSlots?: number;
}

export interface PrioritySlots {
  /** slot index (1..5) → projectId, or undefined when slot is empty. */
  [slot: number]: number | undefined;
}

export const SLOT_COUNT = 5;
export const SLOT_INDICES: ReadonlyArray<number> = [1, 2, 3, 4, 5];
