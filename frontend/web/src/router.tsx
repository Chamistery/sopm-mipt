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
import { ProjectDetailPage as MentorProjectDetailPage } from '@/features/mentor-dashboard/ProjectDetailPage';
import { ApplicantsPage } from '@/features/mentor-dashboard/ApplicantsPage';
import { MentorTaskReviewPage } from '@/features/mentor-dashboard/MentorTaskReviewPage';
import { TeamReportReviewPage } from '@/features/mentor-dashboard/TeamReportReviewPage';
import { ArchivePage } from '@/features/mentor-dashboard/ArchivePage';
import { CoordinatorLayout } from '@/features/coordinator/CoordinatorLayout';
import { CoordinatorDashboardPage } from '@/features/coordinator/CoordinatorDashboardPage';
import { ProjectsListPage } from '@/features/coordinator/ProjectsListPage';
import { ProjectDetailPage as CoordProjectDetailPage } from '@/features/coordinator/ProjectDetailPage';
import { DistributionPage } from '@/features/coordinator/DistributionPage';

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
      { path: 'mentor/projects/:id', element: <MentorProjectDetailPage /> },
      { path: 'mentor/applicants/:id', element: <ApplicantsPage /> },
      { path: 'mentor/teams/:teamId/gantt', element: <MentorTaskReviewPage /> },
      { path: 'mentor/teams/:teamId/reports', element: <TeamReportReviewPage /> },
      { path: 'mentor/archive', element: <ArchivePage /> },
      {
        path: 'admin',
        element: <CoordinatorLayout />,
        children: [
          { index: true, element: <CoordinatorDashboardPage /> },
          { path: 'projects', element: <ProjectsListPage /> },
          { path: 'projects/:id', element: <CoordProjectDetailPage /> },
          { path: 'distribution', element: <DistributionPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
