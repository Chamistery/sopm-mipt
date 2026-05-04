import type { SprintScore } from '@/api/sprintScores';
import type { SprintScoreDraft } from '../components/SprintScoreInput';

/**
 * Builds the initial draft list for a (team members, sprint scores)
 * pair. Pure helper — exposed for unit tests and used by the report
 * review page to seed its local state.
 */
export function buildScoreDrafts(
  members: Array<{ userId: number; name: string }>,
  saved: SprintScore[],
): SprintScoreDraft[] {
  const byStudent = new Map<number, SprintScore>();
  for (const s of saved) byStudent.set(s.studentId, s);
  return members.map((m) => {
    const existing = byStudent.get(m.userId);
    return {
      studentId: m.userId,
      studentName: m.name,
      existingId: existing?.id ?? null,
      score: existing?.score ?? null,
      comment: existing?.comment ?? '',
      dirty: false,
    };
  });
}
