import type { JSX } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';

/**
 * Редирект со старого URL ментор-страницы команды
 * (`/mentor/teams/:teamId/gantt` и `/reports`) на новую объединённую
 * `/mentor/teams/:teamId?tab=...`. Сохраняет существующий query
 * (например, sprintId) и подставляет нужный tab.
 *
 * Используется только в router.tsx; сюда же e2e-сценарии бьются после
 * обновления URL'ов (например, mentor-gantt.spec.ts), и редирект
 * незаметно их «доносит» до новой страницы.
 */
export function MentorTeamLegacyRedirect({
  tab,
}: {
  tab: 'gantt' | 'reports';
}): JSX.Element {
  const params = useParams<{ teamId: string }>();
  const location = useLocation();
  const sp = new URLSearchParams(location.search);
  sp.set('tab', tab);
  return <Navigate to={`/mentor/teams/${params.teamId ?? ''}?${sp.toString()}`} replace />;
}
