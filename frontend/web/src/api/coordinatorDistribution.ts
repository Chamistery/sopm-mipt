/*
 * GET /api/coordinator/distribution — агрегат для admin.html view-distribution.
 * Координатор видит ВСЕ активные проекты + общий пул нераспределённых.
 *
 * Контракт зеркалит CoordinatorDistributionResponse в Go-бэке.
 */

import { apiFetch } from './client';
import type {
  MentorDistributionTeam,
} from './mentorDistribution';
import type { ApplicationStatus } from './applications';
import type { ProjectStatus } from './projects';

export interface CoordinatorDistributionMentor {
  id: number;
  firstName: string;
  lastName: string;
}

export interface CoordinatorDistributionProject {
  id: number;
  title: string;
  status: ProjectStatus;
  company: string;
  mentor?: CoordinatorDistributionMentor | null;
  teamSizeMin: number;
  teamSizeMax: number;
  numTeams: number;
  teams: MentorDistributionTeam[];
}

export interface CoordinatorPoolPriority {
  applicationId: number;
  projectId: number;
  projectTitle: string;
  priority: number;
  status: ApplicationStatus;
}

export interface CoordinatorPoolStudent {
  studentId: number;
  firstName: string;
  lastName: string;
  course: number;
  group: string;
  gpa: number;
  priorities: CoordinatorPoolPriority[];
}

export interface CoordinatorDistributionResponse {
  deadline?: string;
  projects: CoordinatorDistributionProject[];
  pool: CoordinatorPoolStudent[];
}

export function getCoordinatorDistribution(): Promise<CoordinatorDistributionResponse> {
  return apiFetch<CoordinatorDistributionResponse>('/coordinator/distribution');
}
