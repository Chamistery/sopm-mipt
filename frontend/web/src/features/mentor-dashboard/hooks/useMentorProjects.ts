import { useQuery } from '@tanstack/react-query';

import { listProjects, type ProjectListItem } from '@/api/projects';

/**
 * Loads every project the mentor owns.
 *
 * The backend's `GET /api/projects` does not yet support a `?mentorId=`
 * filter (см. backend/project-service/internal/repository/project_repository.go,
 * `ProjectListFilters` — пока есть только company/course/status). Until it
 * lands, the mentor's list is filtered on the client.
 *
 * TODO: switch to the server-side filter once the backend agent ships it.
 * Take care to keep the hook signature stable so consumers don't change.
 */
export function useMentorProjects(mentorId: number) {
  return useQuery({
    queryKey: ['projects', 'mentor', mentorId],
    queryFn: async (): Promise<ProjectListItem[]> => {
      // Pull a generous page; mentors typically have <50 projects.
      const response = await listProjects({ limit: 200, offset: 0 });
      return response.projects.filter((p) => p.mentorId === mentorId);
    },
  });
}
