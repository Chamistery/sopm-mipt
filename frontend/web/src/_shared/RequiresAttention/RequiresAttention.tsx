/*
 * Cross-feature «Требует внимания» block. Lives in `_shared/` because every
 * role dashboard (student, mentor, coordinator) needs the
 * exact same widget — extracting it once keeps notification policy in one
 * place and lets us iterate on icons / sort order without touching N pages.
 *
 * Data: TanStack Query against `listUserNotifications`, refetched every
 * 30s while the dashboard is open. Errors are swallowed (logged) — a
 * notifications block disappearing is preferable to a red banner on every
 * dashboard the moment the API hiccups.
 *
 * The component reads the current user via `useCurrentUser()` itself, so
 * pages just drop `<RequiresAttention />` at the top — no plumbing.
 */

import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { listUserNotifications, type Notification } from '@/api/notifications';
import { useCurrentUser } from '@/auth/useCurrentUser';
import { bucketNotifications } from './sortNotifications';
import { formatRelativeTime } from './relativeTime';
import { iconForKind } from './icons';
import styles from './RequiresAttention.module.css';

const REFETCH_INTERVAL_MS = 30_000;

export interface RequiresAttentionProps {
  /**
   * Override the user — useful in Storybook / tests / admin views that
   * peek at someone else's dashboard. Defaults to the signed-in user.
   */
  userId?: number;
  /** Heading text. Defaults to «Требует внимания». */
  title?: string;
}

export function RequiresAttention({
  userId: userIdProp,
  title = 'Требует внимания',
}: RequiresAttentionProps): JSX.Element | null {
  const me = useCurrentUser();
  const userId = userIdProp ?? me?.userId;

  const query = useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => listUserNotifications(userId as number),
    enabled: typeof userId === 'number',
    refetchInterval: REFETCH_INTERVAL_MS,
    staleTime: 10_000,
  });

  if (typeof userId !== 'number') return null;

  if (query.error) {
    // Swallow errors visually — the block disappears rather than scaring
    // the user with red banners on every page when the API blips.
    console.warn('[RequiresAttention] failed to load notifications', query.error);
    return null;
  }

  const items = query.data ?? [];

  return (
    <RequiresAttentionView title={title} items={items} isLoading={query.isLoading} />
  );
}

export interface RequiresAttentionViewProps {
  title: string;
  items: readonly Notification[];
  isLoading: boolean;
}

/** Pure presentational. Exported for Storybook + tests. */
export function RequiresAttentionView({
  title,
  items,
  isLoading,
}: RequiresAttentionViewProps): JSX.Element {
  const [showAll, setShowAll] = useState(false);
  const buckets = useMemo(() => bucketNotifications(items), [items]);
  const total = buckets.actionRequired.length + buckets.informational.length;

  // Прототип (mentor.html:548-639) показывает по умолчанию **первые 2**
  // элемента из объединённого списка (action + info) и кнопку
  // «Показать ещё N ▾». При раскрытии — все + «Свернуть ▴».
  const ordered = [...buckets.actionRequired, ...buckets.informational];
  const VISIBLE_DEFAULT = 2;
  const visible = showAll ? ordered : ordered.slice(0, VISIBLE_DEFAULT);
  const hidden = ordered.length - visible.length;

  return (
    <section className={styles.section} aria-label={title}>
      <header className={styles.head}>
        <h2 className={styles.title}>{title}</h2>
        {!isLoading && total > 0 ? <span className={styles.badge}>{total}</span> : null}
      </header>

      {isLoading ? (
        <div className={styles.list}>
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
      ) : total === 0 ? (
        <div className={styles.empty}>Сейчас всё под контролем</div>
      ) : (
        <div className={styles.list}>
          {visible.map((n) => (
            <NotificationCard key={n.id} notification={n} />
          ))}

          {hidden > 0 ? (
            <button
              type="button"
              className={styles.toggle}
              onClick={() => setShowAll(true)}
            >
              Показать ещё {hidden} ▾
            </button>
          ) : null}

          {showAll && ordered.length > VISIBLE_DEFAULT ? (
            <button
              type="button"
              className={styles.toggle}
              onClick={() => setShowAll(false)}
            >
              Свернуть ▴
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}

interface NotificationCardProps {
  notification: Notification;
}

function NotificationCard({ notification }: NotificationCardProps): JSX.Element {
  const Icon = iconForKind(String(notification.kind));
  const severity = notification.severity;
  const itemSeverityClass =
    severity === 'danger'
      ? styles.itemDanger
      : severity === 'warning'
        ? styles.itemWarning
        : severity === 'success'
          ? styles.itemSuccess
          : styles.itemInfo;
  const iconSeverityClass =
    severity === 'danger'
      ? styles.iconDanger
      : severity === 'warning'
        ? styles.iconWarning
        : severity === 'success'
          ? styles.iconSuccess
          : styles.iconInfo;

  const content = (
    <>
      <span className={`${styles.icon} ${iconSeverityClass}`}>
        <Icon />
      </span>
      <div className={styles.body}>
        <div className={styles.itemTitle}>{notification.title}</div>
        {notification.body ? (
          <div className={styles.itemBody}>{notification.body}</div>
        ) : null}
      </div>
      <span className={styles.date}>{formatRelativeTime(notification.createdAt)}</span>
    </>
  );

  if (notification.link) {
    return (
      <a
        href={notification.link}
        className={`${styles.item} ${itemSeverityClass} ${styles.itemClickable}`}
      >
        {content}
      </a>
    );
  }

  return (
    <div className={`${styles.item} ${itemSeverityClass} ${styles.itemNonClickable}`}>
      {content}
    </div>
  );
}

function Skeleton(): JSX.Element {
  return (
    <div className={styles.skeleton} aria-hidden="true">
      <div className={styles.skeletonIcon} />
      <div className={styles.skeletonLines}>
        <div className={styles.skeletonLine} />
        <div className={styles.skeletonLine} />
      </div>
    </div>
  );
}
