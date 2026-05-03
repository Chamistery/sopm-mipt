import { useQuery } from '@tanstack/react-query';

import { listProjects, type ProjectListItem } from '@/api/projects';

interface Options {
  /** When true, only completed/archived projects are returned. */
  archive?: boolean;
}

/**
 * Loads every project the mentor owns.
 *
 * The backend supports `?mentorId=` since the latest backend-gaps merge.
 * For the archive screen we additionally filter by completed/archived
 * status on the client — `?status=` only accepts a single value, and
 * "Завершён" | "Архивный" should both show up.
 */
export function useMentorProjects(mentorId: number, options: Options = {}) {
  return useQuery({
    queryKey: ['projects', 'mentor', mentorId, options.archive ? 'archive' : 'active'],
    queryFn: async (): Promise<ProjectListItem[]> => {
      const response = await listProjects({ limit: 200, offset: 0, mentorId });
      const owned = response.projects.filter((p) => p.mentorId === mentorId);
      if (options.archive) {
        return owned.filter((p) => p.status === 'Завершён' || p.status === 'Архивный');
      }
      return owned.filter((p) => p.status !== 'Завершён' && p.status !== 'Архивный');
    },
  });
}
