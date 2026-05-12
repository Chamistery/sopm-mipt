/*
 * Унифицированный хук для смены статуса application через status-menu.
 *
 * Маппинг key → API endpoint (см. statusInfo.ts + admin.html status-menu):
 *   accepted  → PUT /applications/:id/accept    (status='Принят')
 *   invited   → PUT /applications/:id/invite    (status='Принято ментором')
 *   recommend → PUT /applications/:id/recommend (status='Рекомендован', нужен teamId)
 *
 * После успешной мутации инвалидируется COORDINATOR_DISTRIBUTION_KEY,
 * чтобы перерендерить чипы с новым цветом бейджа.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import {
  acceptInvite,
  inviteApplicant,
  recommendApplicant,
  type Application,
} from '@/api/applications';
import { COORDINATOR_DISTRIBUTION_KEY } from '../hooks/useCoordinatorDistribution';
import type { GdistStatusKey } from './statusInfo';

interface SetStatusVars {
  applicationId: number;
  /** Нужен для recommend (бэк проверяет принадлежность к проекту). */
  teamId: number;
  key: GdistStatusKey;
}

export function useSetApplicationStatus(): UseMutationResult<
  Application,
  unknown,
  SetStatusVars
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: SetStatusVars) => {
      switch (vars.key) {
        case 'accepted':
          return acceptInvite(vars.applicationId);
        case 'invited':
          return inviteApplicant(vars.applicationId);
        case 'recommend':
          return recommendApplicant(vars.applicationId, vars.teamId);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: COORDINATOR_DISTRIBUTION_KEY });
    },
  });
}
