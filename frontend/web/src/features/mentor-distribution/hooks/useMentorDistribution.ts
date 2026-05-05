import { useQuery } from '@tanstack/react-query';

import {
  getMentorDistribution,
  type MentorDistributionResponse,
} from '@/api/mentorDistribution';

export const MENTOR_DISTRIBUTION_KEY = ['mentor', 'distribution'] as const;

/**
 * Загружает агрегированный пейлоад для страницы «Незапущенные команды»:
 * проекты ментора, у каждого свой пул заявок (qualified/unqualified ×
 * приоритет) и список незапущенных команд с уже-распределёнными
 * участниками. Полностью покрывает страницу — drag&drop оперирует только
 * этой кэшированной структурой.
 */
export function useMentorDistribution() {
  return useQuery<MentorDistributionResponse>({
    queryKey: MENTOR_DISTRIBUTION_KEY,
    queryFn: getMentorDistribution,
  });
}
