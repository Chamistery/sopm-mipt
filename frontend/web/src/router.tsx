import { createBrowserRouter, Navigate } from 'react-router-dom';

import { RequireAuth } from '@/auth/RequireAuth';
import { AppShell } from '@/layout/AppShell';
import { LoginPage } from '@/features/auth/LoginPage';
import { ProfilePage } from '@/features/profile/ProfilePage';
import { NotFoundPage } from '@/features/errors/NotFoundPage';
import { PlaceholderPage } from '@/features/errors/PlaceholderPage';
import { redirectByRole } from '@/auth/redirectByRole';
import { CoordinatorLayout } from '@/features/coordinator/CoordinatorLayout';
import { CoordinatorDashboardPage } from '@/features/coordinator/CoordinatorDashboardPage';
import { ProjectsListPage } from '@/features/coordinator/ProjectsListPage';
import { ProjectDetailPage } from '@/features/coordinator/ProjectDetailPage';
import { DistributionPage } from '@/features/coordinator/DistributionPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
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
      {
        path: 'student',
        element: <PlaceholderPage feature="Каталог проектов студента" branch="student-catalog" />,
      },
      {
        path: 'student/project',
        element: (
          <PlaceholderPage feature="Текущий проект студента/тимлида" branch="student-project" />
        ),
      },
      {
        path: 'mentor',
        element: <PlaceholderPage feature="Дашборд ментора" branch="mentor-dashboard" />,
      },
      {
        path: 'admin',
        element: <CoordinatorLayout />,
        children: [
          { index: true, element: <CoordinatorDashboardPage /> },
          { path: 'projects', element: <ProjectsListPage /> },
          { path: 'projects/:id', element: <ProjectDetailPage /> },
          { path: 'distribution', element: <DistributionPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
