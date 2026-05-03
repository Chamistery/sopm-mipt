import { useQuery } from '@tanstack/react-query';

import { getTeam, listSprintsByProject, type Team, type Sprint } from '@/api/teams';

/** Loads a single team — used by the gantt + reports screens for context. */
export function useTeam(teamId: number) {
  return useQuery<Team>({
    queryKey: ['team', teamId],
    queryFn: () => getTeam(teamId),
    enabled: Number.isFinite(teamId) && teamId > 0,
  });
}

/** Loads all sprints of a project so the mentor can switch between them. */
export function useProjectSprints(projectId: number | null) {
  return useQuery<Sprint[]>({
    queryKey: ['project', projectId, 'sprints'],
    queryFn: () => listSprintsByProject(projectId ?? 0),
    enabled: projectId != null && Number.isFinite(projectId) && projectId > 0,
  });
}
