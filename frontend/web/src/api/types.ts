/*
 * Generated types are re-exported sparingly here. The shapes that grew
 * features-specific extras (Project, Application, Team, Sprint, SprintScore,
 * ProjectStatus, ApplicationStatus, SprintStatus, GanttResponse,
 * ProjectFull, ProjectApplicantsResponse, etc.) live in their feature-API
 * file (`./projects`, `./applications`, `./teams`, `./sprintScores`) and
 * are re-exported through `./index.ts`. This avoids duplicate-export
 * errors at the `@/api` boundary while keeping codegen output authoritative
 * for the shapes nobody has hand-extended.
 *
 * NB: `UserProfile` is intentionally re-exported by `users.ts` (extended
 * hand-written shape with `notificationsSeenAt`).
 */

export type {
  MeetingStatus,
  Envelope,
  ErrorResponse,
  User,
  Meeting,
  CommentPayload,
  ReviewPayload,
} from './generated/types.gen';

/** Pagination envelope shared by several list endpoints. */
export interface PaginatedList<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
