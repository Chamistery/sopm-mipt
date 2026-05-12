import { createBrowserRouter, Navigate } from 'react-router-dom';

import { RequireAuth } from '@/auth/RequireAuth';
import { AppShell } from '@/layout/AppShell';
import { LoginPage } from '@/features/auth/LoginPage';
import { ProfilePage } from '@/features/profile/ProfilePage';
import { StudentCatalogPage } from '@/features/student-catalog';
import { StudentProjectPage } from '@/features/student-project';
import { NotFoundPage } from '@/features/errors/NotFoundPage';
import { redirectByRole } from '@/auth/redirectByRole';
import { MentorDashboardPage } from '@/features/mentor-dashboard/MentorDashboardPage';
import { NewProjectPage } from '@/features/mentor-dashboard/NewProjectPage';
import { MentorProjectInfoPage } from '@/features/mentor-dashboard/MentorProjectInfoPage';
import { ApplicantsPage } from '@/features/mentor-dashboard/ApplicantsPage';
import { MentorDistributionPage } from '@/features/mentor-distribution';
import { MentorTeamPage } from '@/features/mentor-dashboard/MentorTeamPage';
import { MentorTeamLegacyRedirect } from '@/features/mentor-dashboard/MentorTeamLegacyRedirect';
import { ArchivePage } from '@/features/mentor-dashboard/ArchivePage';
import { ArchiveProjectTeamsPage } from '@/features/mentor-dashboard/ArchiveProjectTeamsPage';
import { ArchiveTeamPage } from '@/features/mentor-dashboard/ArchiveTeamPage';
import { CoordinatorDashboardPage } from '@/features/coordinator/CoordinatorDashboardPage';
import { ProjectDetailPage as CoordProjectDetailPage } from '@/features/coordinator/ProjectDetailPage';
import { CoordDistributionPage } from '@/features/coordinator/distribution/CoordDistributionPage';
import { CoordApplicationsPage } from '@/features/coordinator/applications/CoordApplicationsPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to={redirectByRole()} replace /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'student', element: <StudentCatalogPage /> },
      { path: 'student/project', element: <StudentProjectPage /> },
      { path: 'mentor', element: <MentorDashboardPage /> },
      { path: 'mentor/projects/new', element: <NewProjectPage /> },
      // Страница детали проекта удалена в team-unification — у ментора есть
      // только дашборд и страница команды. Старый URL ведёт на дашборд.
      { path: 'mentor/projects/:id', element: <Navigate to="/mentor" replace /> },
      // «Полная информация о проекте» — отдельная страница (edit / readonly).
      { path: 'mentor/projects/:projectId/info', element: <MentorProjectInfoPage /> },
      { path: 'mentor/applicants/:id', element: <ApplicantsPage /> },
      { path: 'mentor/distribution', element: <MentorDistributionPage /> },
      { path: 'mentor/teams/:teamId', element: <MentorTeamPage /> },
      // Legacy URLs для обратной совместимости (e2e, старые ссылки в письмах
      // нотификаций и т.п.). Редиректим на новый формат с ?tab=.
      {
        path: 'mentor/teams/:teamId/gantt',
        element: <MentorTeamLegacyRedirect tab="gantt" />,
      },
      {
        path: 'mentor/teams/:teamId/reports',
        element: <MentorTeamLegacyRedirect tab="reports" />,
      },
      { path: 'mentor/archive', element: <ArchivePage /> },
      { path: 'mentor/archive/projects/:projectId', element: <ArchiveProjectTeamsPage /> },
      {
        path: 'mentor/archive/projects/:projectId/info',
        element: <MentorProjectInfoPage />,
      },
      { path: 'mentor/archive/teams/:teamId', element: <ArchiveTeamPage /> },
      { path: 'admin', element: <CoordinatorDashboardPage /> },
      // /admin/projects больше не используется (нет в admin.html прототипе).
      // Все ссылки на проекты ведут на дашборд или конкретную страницу проекта.
      { path: 'admin/projects', element: <Navigate to="/admin" replace /> },
      { path: 'admin/projects/:id', element: <CoordProjectDetailPage /> },
      { path: 'admin/distribution', element: <CoordDistributionPage /> },
      { path: 'admin/applications', element: <CoordApplicationsPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
