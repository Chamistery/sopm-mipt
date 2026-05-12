/*
 * GET /api/coordinator/applications — список проектов, требующих утверждения:
 *   - status='На утверждении' (новый проект)
 *   - pendingProposalData != null (заявка на редактирование)
 *
 * Возвращает плоский массив Project (с заполненным mentor + proposal/pending).
 */

import { apiFetch } from './client';
import type { Project } from './projects';

export interface CoordinatorApplicationsResponse {
  applications: Project[];
}

export function getCoordinatorApplications(): Promise<CoordinatorApplicationsResponse> {
  return apiFetch<CoordinatorApplicationsResponse>('/coordinator/applications');
}
