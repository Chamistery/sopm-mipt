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
  type TeamReport,
  type TeamReportStatus,
  type UpdateTeamReportPayload,
} from '@/api/teamReports';

export function useTeamReport(
  teamId: number | null,
  sprintId: number | null,
): UseQueryResult<TeamReport | null> {
  return useQuery({
    queryKey: ['team', teamId, 'report', sprintId],
    queryFn: () => getTeamReport(teamId as number, sprintId as number),
    enabled: teamId != null && sprintId != null,
  });
}

export interface SaveTeamReportInput {
  current: TeamReport | null;
  summary: string;
  problems: string;
  nextPlan: string;
  status?: TeamReportStatus;
}

export function useSaveTeamReport(
  teamId: number,
  sprintId: number,
): UseMutationResult<TeamReport, unknown, SaveTeamReportInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ current, summary, problems, nextPlan, status }: SaveTeamReportInput) => {
      if (current) {
        const patch: UpdateTeamReportPayload = { summary, problems, nextPlan };
        if (status) patch.status = status;
        return updateTeamReport(current.id, patch);
      }
      return createTeamReport({
        teamId,
        sprintId,
        summary,
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
