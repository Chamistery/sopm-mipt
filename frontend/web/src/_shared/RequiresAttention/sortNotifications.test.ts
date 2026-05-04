import { describe, it, expect } from 'vitest';

import type { Notification } from '@/api/notifications';
import { bucketNotifications, sortByCreatedDesc } from './sortNotifications';

function n(partial: Partial<Notification> & { id: string }): Notification {
  return {
    kind: 'task_status',
    severity: 'info',
    title: 'Title',
    createdAt: '2026-05-04T10:00:00Z',
    isRead: false,
    ...partial,
  };
}

describe('sortByCreatedDesc', () => {
  it('places newest first', () => {
    const a = n({ id: 'a', createdAt: '2026-05-04T10:00:00Z' });
    const b = n({ id: 'b', createdAt: '2026-05-04T11:00:00Z' });
    const c = n({ id: 'c', createdAt: '2026-05-04T09:00:00Z' });
    const out = sortByCreatedDesc([a, b, c]).map((x) => x.id);
    expect(out).toEqual(['b', 'a', 'c']);
  });

  it('does not mutate the input', () => {
    const a = n({ id: 'a', createdAt: '2026-05-04T10:00:00Z' });
    const b = n({ id: 'b', createdAt: '2026-05-04T11:00:00Z' });
    const input = [a, b];
    sortByCreatedDesc(input);
    expect(input.map((x) => x.id)).toEqual(['a', 'b']);
  });
});

describe('bucketNotifications', () => {
  it('puts action-required (warning/danger) into its own bucket', () => {
    const items: Notification[] = [
      n({ id: 'i1', severity: 'info' }),
      n({ id: 'a1', severity: 'warning', kind: 'mentor_task_attention' }),
      n({ id: 'a2', severity: 'danger', kind: 'task_rejected' }),
      n({ id: 'i2', severity: 'success', kind: 'task_approved' }),
    ];
    const { actionRequired, informational } = bucketNotifications(items);
    expect(actionRequired.map((x) => x.id).sort()).toEqual(['a1', 'a2']);
    expect(informational.map((x) => x.id).sort()).toEqual(['i1', 'i2']);
  });

  it('treats action-required kinds as such even with severity=info', () => {
    // application_invite is in ACTION_REQUIRED_KINDS — needs a human
    // response even though it's not destructive.
    const items: Notification[] = [n({ id: 'inv', kind: 'application_invite', severity: 'info' })];
    const { actionRequired } = bucketNotifications(items);
    expect(actionRequired.map((x) => x.id)).toEqual(['inv']);
  });

  it('sorts each bucket independently by createdAt desc', () => {
    const items: Notification[] = [
      n({ id: 'a-old', severity: 'warning', createdAt: '2026-05-01T10:00:00Z' }),
      n({ id: 'a-new', severity: 'warning', createdAt: '2026-05-04T10:00:00Z' }),
      n({ id: 'i-old', severity: 'info', createdAt: '2026-05-01T10:00:00Z' }),
      n({ id: 'i-new', severity: 'info', createdAt: '2026-05-04T10:00:00Z' }),
    ];
    const { actionRequired, informational } = bucketNotifications(items);
    expect(actionRequired.map((x) => x.id)).toEqual(['a-new', 'a-old']);
    expect(informational.map((x) => x.id)).toEqual(['i-new', 'i-old']);
  });

  it('returns empty buckets for empty input', () => {
    expect(bucketNotifications([])).toEqual({ actionRequired: [], informational: [] });
  });
});
