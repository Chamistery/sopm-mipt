import { useQuery } from '@tanstack/react-query';

import { listSprintScores, type SprintScore } from '@/api/sprintScores';

interface Args {
  sprintId: number | null;
  teamId: number;
}

/**
 * Loads existing sprint scores for a (team, sprint) pair so the mentor
 * can edit previously-saved grades instead of creating duplicates.
 */
export function useSprintScores({ sprintId, teamId }: Args) {
  return useQuery<SprintScore[]>({
    queryKey: ['sprint-scores', teamId, sprintId],
    queryFn: () => listSprintScores({ teamId, sprintId: sprintId ?? undefined }),
    enabled: Number.isFinite(teamId) && teamId > 0 && sprintId != null && sprintId > 0,
  });
}
