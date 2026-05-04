import type { SprintScore } from '@/api/sprintScores';

/**
 * Финальная оценка архивного проекта = плоское среднее по всем
 * sprintScores команды (без весов; все участники, все спринты).
 *
 * Бэк не хранит итоговую оценку отдельным полем. Если/когда добавит —
 * заменим этот хелпер на чтение `Project.finalGrade`.
 *
 * Возврат — строка вида «4.6», либо `'—'` если оценок нет (показывает,
 * что финального ещё/уже нет, без падения UI).
 */
export function calcFinalGrade(scores: ReadonlyArray<Pick<SprintScore, 'score'>>): string {
  if (scores.length === 0) return '—';
  const sum = scores.reduce((acc, s) => acc + s.score, 0);
  const avg = sum / scores.length;
  return avg.toFixed(1);
}

export function formatFinalGradeLabel(scores: ReadonlyArray<Pick<SprintScore, 'score'>>): string {
  return `Оценка: ${calcFinalGrade(scores)}`;
}
