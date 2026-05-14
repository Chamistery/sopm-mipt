/*
 * Loads the project catalog plus the data needed to enrich it: mentor
 * names (so cards can show «Тимохин В.Н.» rather than mentorId=1) and the
 * student's existing applications (to detect read-only mode).
 *
 * Mentor names are fetched once via /api/users (small list, sidebar reuses
 * the same dataset). Per-project mentor-fetch would be wasteful.
 */

import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';

import {
  getApplicationsByStudentExpanded,
  getProject,
  listProjects,
  type ApplicationWithProject,
  type Project,
  type ProjectListItem,
} from '@/api';
import { fullName, listUsers, type UserSummary } from '@/api/users';
import { useRequireUser } from '@/auth/useCurrentUser';

import type { CatalogProject } from '../types';
import { describeUnqualifiedReason, isQualified } from './catalogLogic';

interface CatalogData {
  projects: CatalogProject[];
  applications: ApplicationWithProject[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
  studentCourse: string | null;
  mentorById: Map<number, UserSummary>;
}

export function useCatalog(): CatalogData {
  const me = useRequireUser();

  const projectsQuery = useQuery({
    queryKey: ['projects', 'list'],
    queryFn: () => listProjects({ limit: 100 }),
    staleTime: 60_000,
  });

  const usersQuery = useQuery({
    queryKey: ['users', 'list'],
    queryFn: () => listUsers(),
    staleTime: 5 * 60_000,
  });

  const applicationsQuery = useQuery({
    queryKey: ['applications', 'student', me.userId],
    queryFn: () => getApplicationsByStudentExpanded(me.userId),
    staleTime: 30_000,
  });

  const studentCourse = useMemo(() => {
    return usersQuery.data?.find((u) => u.id === me.userId)?.course ?? null;
  }, [usersQuery.data, me.userId]);

  const mentorById = useMemo(() => indexById(usersQuery.data ?? []), [usersQuery.data]);

  const projects = useMemo<CatalogProject[]>(() => {
    const list = projectsQuery.data?.projects ?? [];
    return list.map((p) => enrichProject(p, mentorById, studentCourse));
  }, [projectsQuery.data, mentorById, studentCourse]);

  const isLoading =
    projectsQuery.isLoading || usersQuery.isLoading || applicationsQuery.isLoading;

  return {
    projects,
    applications: applicationsQuery.data ?? [],
    isLoading,
    isError: projectsQuery.isError,
    error: projectsQuery.error ?? usersQuery.error ?? applicationsQuery.error,
    refetch: () => {
      void projectsQuery.refetch();
      void applicationsQuery.refetch();
    },
    studentCourse,
    mentorById,
  };
}

/**
 * Loads the full Project (with fieldValues) for a single id when the
 * details modal is open. Caches per-id so flipping between projects is
 * instant on revisit.
 */
export function useProjectDetails(id: number | null): {
  data: Project | undefined;
  isLoading: boolean;
  error: unknown;
} {
  const query = useQuery({
    queryKey: ['project', id ?? -1],
    queryFn: () => getProject(id as number),
    enabled: id !== null,
    staleTime: 5 * 60_000,
  });
  return { data: query.data, isLoading: query.isLoading, error: query.error };
}

/** Used by the read-only summary to fetch fieldValues for several ids in parallel. */
export function useProjectDetailsBatch(ids: readonly number[]): {
  byId: Map<number, Project>;
  isLoading: boolean;
} {
  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['project', id],
      queryFn: () => getProject(id),
      staleTime: 5 * 60_000,
    })),
  });
  const byId = new Map<number, Project>();
  for (let i = 0; i < ids.length; i++) {
    const r = results[i];
    const id = ids[i];
    if (r?.data && id !== undefined) {
      byId.set(id, r.data);
    }
  }
  return { byId, isLoading: results.some((r) => r.isLoading) };
}

function indexById(users: readonly UserSummary[]): Map<number, UserSummary> {
  const m = new Map<number, UserSummary>();
  for (const u of users) m.set(u.id, u);
  return m;
}

function enrichProject(
  p: ProjectListItem,
  mentorById: Map<number, UserSummary>,
  studentCourse: string | null,
): CatalogProject {
  const mentor = mentorById.get(p.mentorId);
  const mentorName = mentor ? fullName(mentor) : `Ментор #${p.mentorId}`;
  const projectCourse = projectFirstCourse(p.courses);
  const qualified = isQualified(studentCourse, projectCourse);
  const numTeams = p.numTeams > 0 ? p.numTeams : 1;
  const teamSizeMax = p.teamSizeMax > 0 ? p.teamSizeMax : 0;
  return {
    ...p,
    mentorName,
    unqualified: !qualified,
    unqualifiedReason: qualified ? '' : describeUnqualifiedReason(studentCourse, projectCourse),
    course: projectCourse,
    maxSlots: numTeams * teamSizeMax,
    filledSlots: p.acceptedCount,
  };
}

function projectFirstCourse(courses: number[] | undefined): string | null {
  if (!courses || courses.length === 0) return null;
  return String(courses[0]);
}
