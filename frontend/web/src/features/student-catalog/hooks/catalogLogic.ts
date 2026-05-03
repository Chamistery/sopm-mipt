/*
 * Pure helpers for the student catalog: filtering, qualification check,
 * priority-slot manipulation. Kept free of React so they can be unit-tested
 * in isolation and reused by the page component / hooks.
 */

import type { CatalogProject, PrioritySlots } from '../types';
import { SLOT_COUNT, SLOT_INDICES } from '../types';

export interface CatalogFilters {
  search: string;
  company: string;
  /** When true, projects the current student doesn't qualify for are hidden. */
  onlyQualified: boolean;
}

export const EMPTY_FILTERS: CatalogFilters = {
  search: '',
  company: '',
  onlyQualified: true,
};

export function filterProjects(
  projects: readonly CatalogProject[],
  filters: CatalogFilters,
): CatalogProject[] {
  const search = filters.search.trim().toLowerCase();
  return projects.filter((p) => {
    if (filters.company && (p.company ?? '') !== filters.company) return false;
    if (filters.onlyQualified && p.unqualified) return false;
    if (search) {
      const hay = [p.title, p.company ?? '', p.mentorName].join(' ').toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
}

export function uniqueCompanies(
  projects: readonly { company?: string | null }[],
): string[] {
  const set = new Set<string>();
  for (const p of projects) {
    const c = (p.company ?? '').trim();
    if (c) set.add(c);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'ru'));
}

/**
 * Quick qualification check: a student is "qualified" if their course is
 * greater than or equal to the project's required course. When the project
 * has no `course` field, anyone qualifies.
 *
 * `studentCourse` and `requiredCourse` are stored as strings on the wire
 * (e.g. "2", "4"); the helper accepts either string or number.
 */
export function isQualified(
  studentCourse: string | number | null | undefined,
  requiredCourse: string | number | null | undefined,
): boolean {
  if (requiredCourse === null || requiredCourse === undefined || requiredCourse === '') {
    return true;
  }
  const sc = parseCourse(studentCourse);
  const rc = parseCourse(requiredCourse);
  if (rc === null) return true;
  if (sc === null) return false;
  return sc >= rc;
}

function parseCourse(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const n = Number.parseInt(v.trim(), 10);
  return Number.isFinite(n) ? n : null;
}

export function describeUnqualifiedReason(
  studentCourse: string | number | null | undefined,
  requiredCourse: string | number | null | undefined,
): string {
  if (isQualified(studentCourse, requiredCourse)) return '';
  return `Требуется ${String(requiredCourse)} курс`;
}

/* ─── Priority slots ─── */

export function findFirstEmptySlot(slots: PrioritySlots): number | null {
  for (const i of SLOT_INDICES) {
    if (slots[i] === undefined) return i;
  }
  return null;
}

export function isSlotsFull(slots: PrioritySlots): boolean {
  return SLOT_INDICES.every((i) => slots[i] !== undefined);
}

export function countSelected(slots: PrioritySlots): number {
  let n = 0;
  for (const i of SLOT_INDICES) {
    if (slots[i] !== undefined) n++;
  }
  return n;
}

export function isProjectSelected(slots: PrioritySlots, projectId: number): boolean {
  return SLOT_INDICES.some((i) => slots[i] === projectId);
}

export function addToFirstFreeSlot(slots: PrioritySlots, projectId: number): PrioritySlots {
  if (isProjectSelected(slots, projectId)) return slots;
  const slot = findFirstEmptySlot(slots);
  if (slot === null) return slots;
  return { ...slots, [slot]: projectId };
}

export function removeProject(slots: PrioritySlots, projectId: number): PrioritySlots {
  const next: PrioritySlots = { ...slots };
  for (const i of SLOT_INDICES) {
    if (next[i] === projectId) {
      delete next[i];
    }
  }
  return next;
}

export function moveSlot(
  slots: PrioritySlots,
  from: number,
  to: number,
): PrioritySlots {
  if (from === to) return slots;
  if (from < 1 || from > SLOT_COUNT || to < 1 || to > SLOT_COUNT) return slots;
  const next: PrioritySlots = { ...slots };
  const fromVal = next[from];
  const toVal = next[to];
  if (fromVal === undefined && toVal === undefined) return slots;
  if (fromVal === undefined) {
    delete next[to];
    next[from] = toVal;
  } else if (toVal === undefined) {
    delete next[from];
    next[to] = fromVal;
  } else {
    next[from] = toVal;
    next[to] = fromVal;
  }
  return next;
}

/**
 * Restores priority slots from a list of saved applications. Applications
 * with priority outside 1..5 are dropped silently — keeps the UI safe even
 * if older data exists from a different schema.
 */
export function slotsFromApplications(
  apps: ReadonlyArray<{ projectId?: number | null; priority?: number | null }>,
): PrioritySlots {
  const out: PrioritySlots = {};
  for (const app of apps) {
    const p = app.priority ?? 0;
    const pid = app.projectId;
    if (p >= 1 && p <= SLOT_COUNT && typeof pid === 'number') {
      out[p] = pid;
    }
  }
  return out;
}
