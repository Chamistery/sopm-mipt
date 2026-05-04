/*
 * Inline SVG icons for notification cards.
 *
 * Each icon is wrapped so the parent can colour it via `currentColor` and
 * size via the wrapper's font-size. Icons are picked by notification kind;
 * unknown kinds fall back to `<BellIcon />`.
 */

import type { JSX } from 'react';

export type IconProps = {
  size?: number;
};

export function TaskIcon({ size = 18 }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 18 18" aria-hidden="true">
      <rect x="3" y="2" width="12" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M6 6h6M6 9h6M6 12h3"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ReviewIcon({ size = 18 }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M6 9l2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MeetingIcon({ size = 18 }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 18 18" aria-hidden="true">
      <rect x="2" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2 7h14" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6 1v3M12 1v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function CheckIcon({ size = 18 }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M5 9l3 3 5-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CrossIcon({ size = 18 }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M5 5l8 8M13 5l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function ReportIcon({ size = 18 }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M4 2h7l3 3v11H4z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M11 2v3h3" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M7 9h4M7 12h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function InviteIcon({ size = 18 }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M2 5l7 5 7-5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <rect x="2" y="4" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function ProjectIcon({ size = 18 }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M2 6a2 2 0 012-2h3l1.5 2H14a2 2 0 012 2v5a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BellIcon({ size = 18 }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M4 13h10l-1.5-2.5V8a3.5 3.5 0 10-7 0v2.5L4 13z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 15a1.5 1.5 0 003 0"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

const ICON_BY_KIND: Record<string, (p: IconProps) => JSX.Element> = {
  // task lifecycle
  task_status: TaskIcon,
  task_assigned_by_lead: TaskIcon,
  task_assigned: TaskIcon,
  task_pending_approval: TaskIcon,
  task_for_review: ReviewIcon,
  task_approved: CheckIcon,
  task_accepted: CheckIcon,
  task_rejected: CrossIcon,
  task_returned: ReviewIcon,
  task_canceled_by_student: CrossIcon,
  task_deadline: TaskIcon,
  teammate_task_approved: CheckIcon,
  teammate_task_rejected: CrossIcon,
  teammate_review_submitted: ReviewIcon,
  mentor_task_attention: TaskIcon,

  // applications & invitations
  application_invite: InviteIcon,
  application_response: InviteIcon,
  project_invitation: InviteIcon,
  student_accepted_invite: CheckIcon,
  student_declined_invite: CrossIcon,
  all_members_accepted: CheckIcon,
  student_excluded: CrossIcon,

  // meetings
  meeting_update: MeetingIcon,
  meeting_scheduled: MeetingIcon,
  meeting_proposed_by_lead: MeetingIcon,
  meeting_confirmed_by_mentor: CheckIcon,
  meeting_rejected_by_mentor: CrossIcon,
  no_meeting_in_sprint: MeetingIcon,

  // reports
  team_report_submitted: ReportIcon,
  team_report_reviewed: ReportIcon,
  mentor_report_submitted: ReportIcon,
  teammate_report_missing: ReportIcon,

  // projects & coordinator
  project_submitted: ProjectIcon,
  project_application_new: ProjectIcon,
  project_ready_to_launch: ProjectIcon,
  team_started: ProjectIcon,
  distribution_complete: CheckIcon,
  students_unassigned: ProjectIcon,
};

// eslint-disable-next-line react-refresh/only-export-components
export function iconForKind(kind: string): (p: IconProps) => JSX.Element {
  return ICON_BY_KIND[kind] ?? BellIcon;
}
