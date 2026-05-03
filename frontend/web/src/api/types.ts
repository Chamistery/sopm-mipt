/*
 * Re-export of the swagger-generated DTO types as a stable public surface
 * for feature code. Always import domain types from `@/api` (or `@/api/types`),
 * never from `@/api/generated/...` — that path is regenerated on every
 * `npm run gen:api` and may move/rename without notice.
 *
 * If you find yourself defining a `ProjectListItem` or `ApplicationStatus`
 * locally, import the generated one instead.
 */

export type {
  ProjectStatus,
  ApplicationStatus,
  SprintStatus,
  MeetingStatus,
  Envelope,
  ErrorResponse,
  User,
  TeamMember,
  Team,
  Sprint,
  Project,
  Application,
  SprintScore,
  Meeting,
  CommentPayload,
  ReviewPayload,
} from './generated/types.gen';

// NB: `TaskStatus`, `Task`, `TeamReport`, `TeamReportStatus` are intentionally
// re-exported by `teams.ts` (richer hand-written shape until swagger covers
// `wasOverdue`, `history`, `mentorComments`, `whatDone`, etc.) — see ADR 0001.

// NB: `UserProfile` is intentionally re-exported by `users.ts` (extended
// hand-written shape with `notificationsSeenAt`), not from generated.

import type {
  Project,
  Sprint,
  Team,
  Application,
  TeamMember,
  Task,
} from './generated/types.gen';

/** Backend `GET /api/projects/{id}/full` response — Project plus its sprints and teams. */
export interface ProjectFull extends Project {
  sprints: Sprint[];
  teams: Team[];
}

/**
 * Backend `GET /api/projects/{id}/applicants` response — applicants split into
 * qualified/unqualified buckets by priority, and the current team rosters.
 */
export interface ProjectApplicantsResponse {
  projectId: number;
  requirements: { minCourse?: number | null; minGpa?: number | null };
  qualified: ApplicantsByPriority;
  unqualified: ApplicantsByPriority;
  teams: TeamRoster[];
}

export interface ApplicantsByPriority {
  priority1: Applicant[];
  priority2: Applicant[];
  priority3: Applicant[];
  priority4: Applicant[];
  priority5: Applicant[];
}

export interface Applicant {
  applicationId: number;
  studentId: number;
  name: string;
  course?: string | number | null;
  gpa?: number | null;
  status: Application['status'];
  teamId?: number | null;
}

export interface TeamRoster {
  teamId: number;
  name: string;
  maxSize: number;
  members: Array<{
    applicationId: number;
    studentId: number;
    name: string;
    status: Application['status'];
  }>;
}

/** Backend `GET /api/teams/{id}/gantt?sprintId=` — sprint metadata + members + tasks. */
export interface GanttResponse {
  sprint: Sprint;
  members: TeamMember[];
  tasks: Task[];
}

/** Pagination envelope used by `GET /api/projects` and similar list endpoints. */
export interface PaginatedList<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

/** `GET /api/users/{id}/team` — current team context for a signed-in user. */
export interface UserTeamContext {
  team: Team;
  project: Project;
  currentSprint: Sprint | null;
  members: TeamMember[];
  isLeader: boolean;
}
