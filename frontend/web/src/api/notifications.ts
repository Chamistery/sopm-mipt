/*
 * Hand-written API surface for /api/users/{id}/notifications.
 *
 * Backend contract (see backend/project-service/internal/service/notification_service.go
 * and internal/models/meeting.go::Notification):
 *
 *   GET /api/users/{id}/notifications  ->  Notification[]
 *   {
 *     code:      string,   // notification kind, see NOTIFICATION_KINDS
 *     title:     string,   // short human-readable header
 *     message:   string,   // body text (often the related entity's name/title)
 *     entity:    string,   // 'task' | 'application' | 'meeting' | 'team_report' | 'project'
 *     entityId:  number,   // id of the related row in `entity`'s table
 *     createdAt: string    // ISO timestamp
 *   }
 *
 * Mark-seen contract:
 *   The backend has no dedicated PUT/POST .../notifications/seen endpoint
 *   (swagger.yaml only declares the GET). Instead, the GET handler
 *   automatically updates `user_profiles.notifications_seen_at = NOW()` for
 *   the *self* request — i.e. the act of opening the dashboard marks
 *   everything older than the previous open as seen.
 *   See notification_service.go:163-165 (UpdateNotificationsSeenAt).
 *
 *   TODO: when the backend grows a real mark-seen endpoint, add a
 *   `markNotificationsSeen(userId)` mutation here and invalidate the
 *   ['notifications', userId] query.
 *
 * Frontend re-shape:
 *   We expose a slightly richer typed shape on top of the raw payload:
 *     - `id`              — derived as `${code}:${entity}:${entityId}` so
 *                           React keys are stable even though the backend
 *                           doesn't emit a primary key.
 *     - `severity`        — derived from `code` (action-required vs info).
 *     - `link`            — derived router path for the related entity.
 *     - `body`            — raw `message` from backend.
 *     - `relatedKind/Id`  — passthrough of `entity`/`entityId`.
 *     - `isRead`          — currently always `false` because the backend
 *                           updates the seen-at marker server-side on read.
 *
 *   Keeping the derivation here (and not inside the React component) means
 *   the `Notification` type is reusable anywhere — RequiresAttention is just
 *   one consumer.
 */

import { apiFetch } from './client';

/** All notification kinds emitted by the backend today. */
export const NOTIFICATION_KINDS = [
  // Backend-emitted (see notification_service.go)
  'task_status',
  'task_assigned_by_lead',
  'application_invite',
  'application_response',
  'meeting_update',
  'mentor_task_attention',
  'mentor_report_submitted',
  'project_submitted',

  // Spec-only kinds (frontend/prototypes/notifications.md, 30 events).
  // Backend doesn't emit these yet but the union encodes the full ТЗ so the
  // UI is ready when the backend catches up.
  'task_approved',
  'task_rejected',
  'task_returned',
  'task_accepted',
  'task_assigned',
  'project_invitation',
  'task_deadline',
  'meeting_scheduled',
  'team_report_reviewed',
  'meeting_confirmed_by_mentor',
  'meeting_rejected_by_mentor',
  'teammate_task_approved',
  'teammate_task_rejected',
  'teammate_review_submitted',
  'teammate_report_missing',
  'task_pending_approval',
  'task_for_review',
  'task_canceled_by_student',
  'student_accepted_invite',
  'student_declined_invite',
  'team_report_submitted',
  'no_meeting_in_sprint',
  'all_members_accepted',
  'meeting_proposed_by_lead',
  'project_application_new',
  'distribution_complete',
  'team_started',
  'students_unassigned',
  'student_excluded',
  'project_ready_to_launch',
] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export type NotificationSeverity = 'danger' | 'warning' | 'success' | 'info';

export type NotificationRelatedKind =
  | 'task'
  | 'application'
  | 'meeting'
  | 'team_report'
  | 'project'
  | 'team'
  | 'user';

export interface Notification {
  /** Stable client-side key: `${kind}:${relatedKind}:${relatedId}`. */
  id: string;
  kind: NotificationKind | string;
  severity: NotificationSeverity;
  title: string;
  body?: string;
  link?: string;
  relatedKind?: NotificationRelatedKind | string;
  relatedId?: number;
  createdAt: string;
  /**
   * Always `false` for now — the backend doesn't expose per-row read state;
   * instead it bumps `notifications_seen_at` when the GET fires for self.
   * Kept on the type so future per-row read state has a place to land
   * without a breaking change.
   */
  isRead: boolean;
}

interface RawNotification {
  code: string;
  title: string;
  message: string;
  entity: string;
  entityId: number;
  createdAt: string;
}

const ACTION_REQUIRED_KINDS: ReadonlySet<string> = new Set<NotificationKind>([
  'mentor_task_attention',
  'application_invite',
  'task_pending_approval',
  'task_for_review',
  'meeting_proposed_by_lead',
  'team_report_submitted',
  'project_application_new',
  'task_returned',
]);

const WARNING_KINDS: ReadonlySet<string> = new Set<NotificationKind>([
  'task_deadline',
  'teammate_report_missing',
  'no_meeting_in_sprint',
  'students_unassigned',
  'task_canceled_by_student',
]);

const SUCCESS_KINDS: ReadonlySet<string> = new Set<NotificationKind>([
  'task_approved',
  'task_accepted',
  'student_accepted_invite',
  'all_members_accepted',
  'team_started',
  'project_ready_to_launch',
  'team_report_reviewed',
  'meeting_confirmed_by_mentor',
  'distribution_complete',
]);

const DANGER_KINDS: ReadonlySet<string> = new Set<NotificationKind>([
  'task_rejected',
  'meeting_rejected_by_mentor',
  'student_declined_invite',
  'student_excluded',
]);

function severityFor(kind: string): NotificationSeverity {
  if (ACTION_REQUIRED_KINDS.has(kind)) return 'warning';
  if (DANGER_KINDS.has(kind)) return 'danger';
  if (WARNING_KINDS.has(kind)) return 'warning';
  if (SUCCESS_KINDS.has(kind)) return 'success';
  return 'info';
}

function linkFor(entity: string, entityId: number): string | undefined {
  if (!entityId) return undefined;
  switch (entity) {
    case 'task':
      // Tasks live inside the team/sprint context; the dashboard has no
      // direct route, so we link to the student-project page.
      return '/student/project';
    case 'application':
      return '/student/catalog';
    case 'meeting':
      return '/student/project';
    case 'team_report':
      return `/mentor/teams/${entityId}/report`;
    case 'project':
      return `/mentor/projects/${entityId}`;
    default:
      return undefined;
  }
}

function adapt(raw: RawNotification): Notification {
  const severity = severityFor(raw.code);
  const link = linkFor(raw.entity, raw.entityId);
  return {
    id: `${raw.code}:${raw.entity}:${raw.entityId}`,
    kind: raw.code,
    severity,
    title: raw.title,
    body: raw.message || undefined,
    ...(link ? { link } : {}),
    relatedKind: raw.entity || undefined,
    relatedId: raw.entityId || undefined,
    createdAt: raw.createdAt,
    isRead: false,
  };
}

export async function listUserNotifications(userId: number): Promise<Notification[]> {
  const raw = await apiFetch<RawNotification[] | null>(`/users/${userId}/notifications`);
  if (!raw) return [];
  return raw.map(adapt);
}

/**
 * No-op stub for forward-compat. The backend marks notifications seen
 * server-side on every self GET (see file header). When a real endpoint
 * appears in swagger, replace this with the real PUT call and have
 * RequiresAttention call it on mount/blur.
 *
 * TODO: wire to PUT /api/users/{id}/notifications/seen once added to backend.
 */
export async function markNotificationsSeen(_userId: number): Promise<void> {
  return Promise.resolve();
}

/** Exposed for unit tests so the sort order stays in lockstep with the UI. */
export function isActionRequired(n: Pick<Notification, 'severity' | 'kind'>): boolean {
  return (
    n.severity === 'danger' ||
    n.severity === 'warning' ||
    ACTION_REQUIRED_KINDS.has(String(n.kind))
  );
}
