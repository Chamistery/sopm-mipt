/*
 * /admin/teams/:teamId — координатор открывает страницу команды.
 *
 * MVP-решение: редирект на менторский маршрут /mentor/teams/:teamId.
 * Менторская страница (MentorTeamPage + 3 таба) уже умеет показывать
 * Гант / отчёты / встречи; бэк-эндпоинты GET доступны и координатору.
 *
 * KNOWN TODO (не для этой ночной сессии):
 *   - breadcrumb внутри menter-страницы говорит «К дашборду» и линкует
 *     на /mentor; для координатора это путь не его дашборда. Нужен либо
 *     scope prop на MentorTeamPage, либо отдельная CoordTeamPage.
 *   - На странице доступны mentor-actions (Сделать тимлидом, утвердить
 *     задачу, оценить отчёт, создать встречу). По прототипу координатор
 *     должен видеть read-only.
 */

import { Navigate, useParams, useSearchParams } from 'react-router-dom';

export function CoordTeamRedirect(): JSX.Element {
  const params = useParams<{ teamId: string }>();
  const [searchParams] = useSearchParams();
  const teamId = params.teamId ?? '';
  const search = searchParams.toString();
  const to = `/mentor/teams/${teamId}${search ? `?${search}` : ''}`;
  return <Navigate to={to} replace />;
}
