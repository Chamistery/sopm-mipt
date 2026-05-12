/*
 * GET /api/mentor/distribution — агрегат «Незапущенные команды» по всем
 * проектам ментора. Каждый проект содержит pool заявок (qualified/unqualified
 * × приоритет) и список незапущенных команд с уже-распределёнными
 * участниками. Контракт зеркалит models.MentorDistributionResponse в Go-бэке.
 */

import { apiFetch } from './client';
import type {
  ApplicantPriorityBuckets,
  ApplicantRequirements,
  ApplicationStatus,
} from './applications';
import type { ProjectStatus } from './projects';

export interface MentorDistributionTeamMember {
  applicationId: number;
  studentId: number;
  firstName: string;
  lastName: string;
  course: number;
  group: string;
  gpa: number;
  priority: number;
  status: ApplicationStatus;
  qualified: boolean;
  /** Заполняется только в coord distribution endpoint (mentor не использует). */
  allPriorities?: TeamMemberPriority[];
}

export interface TeamMemberPriority {
  applicationId: number;
  projectId: number;
  projectTitle: string;
  company?: string;
  mentorName?: string;
  priority: number;
  status: ApplicationStatus;
}

export interface MentorDistributionTeam {
  id: number;
  name: string;
  launched: boolean;
  members: MentorDistributionTeamMember[];
}

export interface MentorDistributionPool {
  qualified: ApplicantPriorityBuckets;
  unqualified: ApplicantPriorityBuckets;
}

export interface MentorDistributionProject {
  id: number;
  title: string;
  status: ProjectStatus;
  company: string;
  teamSizeMin: number;
  teamSizeMax: number;
  numTeams: number;
  sprintsCount: number;
  sprintWeeks: number;
  /** ISO YYYY-MM-DD; последняя end_date из спринтов проекта. Может быть пустой. */
  deadline?: string;
  requirements: ApplicantRequirements;
  teams: MentorDistributionTeam[];
  pool: MentorDistributionPool;
}

export interface MentorDistributionResponse {
  projects: MentorDistributionProject[];
}

export function getMentorDistribution(): Promise<MentorDistributionResponse> {
  return apiFetch<MentorDistributionResponse>('/mentor/distribution');
}
