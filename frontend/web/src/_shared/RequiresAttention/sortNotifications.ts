/*
 * Notification sorting & bucketing.
 *
 * The «Требует внимания» block has two visual sections:
 *   1. Action-required (severity=danger/warning, plus a few info-kinds that
 *      still need a human decision — see `isActionRequired` in the API
 *      module). Always rendered.
 *   2. Informational (everything else). Hidden behind a «Показать ещё»
 *      toggle.
 *
 * Within each bucket we order by `createdAt` descending — newest on top —
 * because that's what every dashboard prototype shows.
 */

import { isActionRequired, type Notification } from '@/api/notifications';

export interface NotificationBuckets {
  actionRequired: Notification[];
  informational: Notification[];
}

export function sortByCreatedDesc(items: readonly Notification[]): Notification[] {
  return [...items].sort((a, b) => {
    if (a.createdAt === b.createdAt) return 0;
    return a.createdAt < b.createdAt ? 1 : -1;
  });
}

export function bucketNotifications(items: readonly Notification[]): NotificationBuckets {
  const actionRequired: Notification[] = [];
  const informational: Notification[] = [];
  for (const n of items) {
    if (isActionRequired(n)) actionRequired.push(n);
    else informational.push(n);
  }
  return {
    actionRequired: sortByCreatedDesc(actionRequired),
    informational: sortByCreatedDesc(informational),
  };
}
