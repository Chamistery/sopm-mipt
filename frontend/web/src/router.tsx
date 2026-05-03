import { createBrowserRouter, Navigate } from 'react-router-dom';

import { RequireAuth } from '@/auth/RequireAuth';
import { AppShell } from '@/layout/AppShell';
import { LoginPage } from '@/features/auth/LoginPage';
import { ProfilePage } from '@/features/profile/ProfilePage';
import { StudentCatalogPage } from '@/features/student-catalog';
import { StudentProjectPage } from '@/features/student-project';
import { NotFoundPage } from '@/features/errors/NotFoundPage';
import { PlaceholderPage } from '@/features/errors/PlaceholderPage';
import { redirectByRole } from '@/auth/redirectByRole';
import { MentorDashboardPage } from '@/features/mentor-dashboard/MentorDashboardPage';
import { NewProjectPage } from '@/features/mentor-dashboard/NewProjectPage';
import { ProjectDetailPage } from '@/features/mentor-dashboard/ProjectDetailPage';
import { ApplicantsPage } from '@/features/mentor-dashboard/ApplicantsPage';
import { MentorTaskReviewPage } from '@/features/mentor-dashboard/MentorTaskReviewPage';
import { TeamReportReviewPage } from '@/features/mentor-dashboard/TeamReportReviewPage';
import { ArchivePage } from '@/features/mentor-dashboard/ArchivePage';

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
      { path: 'student', element: <StudentCatalogPage /> },
      {
        path: 'student/project',
        element: <StudentProjectPage />,
      },
      { path: 'mentor', element: <MentorDashboardPage /> },
      { path: 'mentor/projects/new', element: <NewProjectPage /> },
      { path: 'mentor/projects/:id', element: <ProjectDetailPage /> },
      { path: 'mentor/applicants/:id', element: <ApplicantsPage /> },
      { path: 'mentor/teams/:teamId/gantt', element: <MentorTaskReviewPage /> },
      { path: 'mentor/teams/:teamId/reports', element: <TeamReportReviewPage /> },
      { path: 'mentor/archive', element: <ArchivePage /> },
      {
        path: 'admin',
        element: <PlaceholderPage feature="Панель координатора" branch="coordinator" />,
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
