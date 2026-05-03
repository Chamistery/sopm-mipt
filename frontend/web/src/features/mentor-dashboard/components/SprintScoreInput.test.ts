import { describe, expect, it } from 'vitest';

import type { SprintScore } from '@/api/sprintScores';
import { buildScoreDrafts } from '../lib/scoreDrafts';

describe('buildScoreDrafts', () => {
  const members = [
    { userId: 1, name: 'Иванов И.' },
    { userId: 2, name: 'Петрова П.' },
  ];

  it('returns one draft per member, all empty when no scores exist', () => {
    const drafts = buildScoreDrafts(members, []);
    expect(drafts).toHaveLength(2);
    expect(drafts[0]).toMatchObject({
      studentId: 1,
      studentName: 'Иванов И.',
      existingId: null,
      score: null,
      comment: '',
      dirty: false,
    });
  });

  it('hydrates existing scores from the saved list', () => {
    const saved: SprintScore[] = [
      {
        id: 99,
        sprintId: 5,
        teamId: 7,
        studentId: 1,
        score: 8,
        comment: 'Хорошо',
        scoredById: 100,
      },
    ];
    const drafts = buildScoreDrafts(members, saved);
    expect(drafts[0]).toMatchObject({
      studentId: 1,
      existingId: 99,
      score: 8,
      comment: 'Хорошо',
      dirty: false,
    });
    expect(drafts[1]?.existingId).toBeNull();
  });

  it('keeps the order from the members list', () => {
    const drafts = buildScoreDrafts(members, []);
    expect(drafts.map((d) => d.studentId)).toEqual([1, 2]);
  });
});
