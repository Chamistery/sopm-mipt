/*
 * GET /api/coordinator/dashboard — агрегат для дашборда координатора
 * (admin.html view-dashboard). В одном запросе:
 *   - stats: «Активных проектов» / «Команд» / «Студентов»
 *   - attention: pending applications + unassigned students
 *   - projects: тот же shape MentorDashboardProject, но без фильтра по
 *     ментору + с заполненным polem `mentor` для отображения в meta.
 */

import { apiFetch } from './client';
import type { MentorDashboardProject } from './projects';

export interface CoordinatorDashboardStats {
  activeProjects: number;
  teams: number;
  students: number;
}

export interface CoordinatorDashboardAttention {
  pendingApplications: number;
  unassignedStudents: number;
}

export interface CoordinatorDashboardResponse {
  stats: CoordinatorDashboardStats;
  attention: CoordinatorDashboardAttention;
  projects: MentorDashboardProject[];
}

export function getCoordinatorDashboard(): Promise<CoordinatorDashboardResponse> {
  return apiFetch<CoordinatorDashboardResponse>('/coordinator/dashboard');
}
