import { useQueryClient } from '@tanstack/react-query';

import { getProjectProposal } from '@/api/projects';
import type { ProposalData } from '../lib/projectFormState';

/**
 * Imperatively загружает заявку выбранного проекта-предшественника.
 *
 * Не useQuery: пользователь не «листает» подходящие шаблоны — он
 * нажимает кнопку «Заполнить по шаблону» один раз. После этого результат
 * в стейт формы переписывается, не нужно держать его в кэше дольше, чем
 * на 5 минут.
 */
export function useProposalTemplate(): {
  fetchProposal: (projectId: number) => Promise<ProposalData | null>;
} {
  const queryClient = useQueryClient();

  const fetchProposal = async (projectId: number): Promise<ProposalData | null> => {
    return queryClient.fetchQuery({
      queryKey: ['project', projectId, 'proposal'],
      queryFn: () => getProjectProposal(projectId),
      staleTime: 5 * 60_000,
    });
  };

  return { fetchProposal };
}
