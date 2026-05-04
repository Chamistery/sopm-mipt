import { useMemo } from 'react';

import type { ProjectListItem } from '@/api/projects';
import { useMentorProjects } from './useMentorProjects';

/**
 * Список архивных проектов ментора, пригодных как «проект-предшественник»
 * для нового продолжения. Просто прокладка над useMentorProjects(archive=true).
 */
export function useArchivedProjectsForTemplate(mentorId: number) {
  const query = useMentorProjects(mentorId, { archive: true });

  const archived = useMemo<ProjectListItem[]>(
    () => query.data ?? [],
    [query.data],
  );

  return { archived, isLoading: query.isLoading, isError: query.isError };
}
