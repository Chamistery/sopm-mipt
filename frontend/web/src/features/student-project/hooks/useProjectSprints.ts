import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { listSprintsByProject, type Sprint } from '@/api/teams';

/**
 * Все спринты проекта. Нужен в страничке распределённого студента, чтобы
 * можно было переключаться между текущим и завершёнными спринтами в Ганте
 * — так же, как у ментора в `MentorTeamGanttTab`.
 */
export function useProjectSprints(projectId: number | null): UseQueryResult<Sprint[]> {
  return useQuery({
    queryKey: ['project', projectId, 'sprints'],
    queryFn: () => listSprintsByProject(projectId as number),
    enabled: projectId != null && Number.isFinite(projectId) && projectId > 0,
  });
}
