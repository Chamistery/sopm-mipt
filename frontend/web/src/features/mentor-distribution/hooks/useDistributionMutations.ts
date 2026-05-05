import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  inviteApplicant,
  recommendApplicant,
  unrecommendApplicant,
} from '@/api/applications';
import { launchTeam } from '@/api/teams';
import { MENTOR_DISTRIBUTION_KEY } from './useMentorDistribution';

/**
 * Объединяет четыре мутации, нужные view-distribution. После каждого
 * успеха инвалидируется единственный query-ключ (агрегат всей страницы)
 * — повторный fetch вернёт согласованный snapshot и пересчитает счётчики
 * приоритетов.
 *
 * Сценарии drag&drop:
 *   - Перетаскивание из пула в слот команды           → recommend
 *   - Drop чипа из команды обратно в свой приоритет   → unrecommend
 *   - Кнопка «✓ Пригласить» на чипе в команде         → invite
 *   - Кнопка «Запустить команду»                      → launchTeam
 */
export function useDistributionMutations() {
  const qc = useQueryClient();
  const invalidate = (): Promise<unknown> =>
    qc.invalidateQueries({ queryKey: MENTOR_DISTRIBUTION_KEY });

  const recommend = useMutation({
    mutationFn: ({ applicationId, teamId }: { applicationId: number; teamId: number }) =>
      recommendApplicant(applicationId, teamId),
    onSuccess: invalidate,
  });

  const unrecommend = useMutation({
    mutationFn: (applicationId: number) => unrecommendApplicant(applicationId),
    onSuccess: invalidate,
  });

  const invite = useMutation({
    mutationFn: (applicationId: number) => inviteApplicant(applicationId),
    onSuccess: invalidate,
  });

  const launch = useMutation({
    mutationFn: (teamId: number) => launchTeam(teamId),
    onSuccess: invalidate,
  });

  return { recommend, unrecommend, invite, launch };
}
