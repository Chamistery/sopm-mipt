/*
 * Hand-written API surface for /api/applications endpoints needed by the
 * coordinator feature. Other features may extend this file with their own
 * helpers (no breaking changes to existing exports without coordination).
 */

import { apiFetch } from './client';

/**
 * Excludes a participant from a team via their application record.
 * Endpoint: PUT /api/applications/{id}/exclude (not yet in swagger — the
 * backend will add it; a 404 surfaces as ApiError to the caller).
 */
export function excludeApplication(applicationId: number): Promise<void> {
  return apiFetch<void>(`/applications/${applicationId}/exclude`, {
    method: 'PUT',
  });
}
