import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import {
  createTeamReport,
  getTeamReport,
  updateTeamReport,
  type TeamReportDto,
  type TeamReportStatus,
  type TeamReportUpsert,
} from '@/api/teams';

export function useTeamReport(
  teamId: number | null,
  sprintId: number | null,
): UseQueryResult<TeamReportDto | null> {
  return useQuery({
    queryKey: ['team', teamId, 'report', sprintId],
    queryFn: () => getTeamReport(teamId as number, sprintId as number),
    enabled: teamId != null && sprintId != null,
  });
}

export interface SaveTeamReportInput {
  current: TeamReportDto | null;
  whatDone: string;
  problems: string;
  nextPlan: string;
  status?: TeamReportStatus;
}

export function useSaveTeamReport(
  teamId: number,
  sprintId: number,
): UseMutationResult<TeamReportDto, unknown, SaveTeamReportInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ current, whatDone, problems, nextPlan, status }: SaveTeamReportInput) => {
      if (current) {
        const patch: TeamReportUpsert = { whatDone, problems, nextPlan };
        if (status) patch.status = status;
        return updateTeamReport(current.id, patch);
      }
      return createTeamReport({
        teamId,
        sprintId,
        whatDone,
        problems,
        nextPlan,
        status: status ?? 'Черновик',
      });
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(['team', teamId, 'report', sprintId], saved);
    },
  });
}
