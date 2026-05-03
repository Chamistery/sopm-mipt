import { describe, expect, it } from 'vitest';

import {
  flattenPriorityBuckets,
  isInvited,
  isRecommended,
  type ApplicantItem,
  type ApplicantPriorityBuckets,
} from './applications';

const mkItem = (overrides: Partial<ApplicantItem> = {}): ApplicantItem => ({
  applicationId: 1,
  studentId: 100,
  name: 'Иванов И.',
  course: 2,
  gpa: 4.5,
  status: 'Ожидает',
  teamId: null,
  ...overrides,
});

describe('flattenPriorityBuckets', () => {
  it('returns 5 columns in priority order', () => {
    const buckets: ApplicantPriorityBuckets = {
      priority1: [mkItem({ applicationId: 1 })],
      priority2: [],
      priority3: [mkItem({ applicationId: 3 })],
      priority4: [],
      priority5: [mkItem({ applicationId: 5 })],
    };
    const flat = flattenPriorityBuckets(buckets);
    expect(flat).toHaveLength(5);
    expect(flat.map((c) => c.priority)).toEqual([1, 2, 3, 4, 5]);
    expect(flat[0]?.items).toHaveLength(1);
    expect(flat[1]?.items).toHaveLength(0);
  });
});

describe('isRecommended', () => {
  it('is true only when status is Рекомендован and a team is set', () => {
    expect(isRecommended(mkItem({ status: 'Рекомендован', teamId: 1 }))).toBe(true);
    expect(isRecommended(mkItem({ status: 'Рекомендован', teamId: null }))).toBe(false);
    expect(isRecommended(mkItem({ status: 'Принят', teamId: 1 }))).toBe(false);
  });
});

describe('isInvited', () => {
  it('is true once the mentor or student locked the slot', () => {
    expect(isInvited(mkItem({ status: 'Принято ментором' }))).toBe(true);
    expect(isInvited(mkItem({ status: 'Принят' }))).toBe(true);
    expect(isInvited(mkItem({ status: 'Рекомендован' }))).toBe(false);
    expect(isInvited(mkItem({ status: 'Ожидает' }))).toBe(false);
  });
});
