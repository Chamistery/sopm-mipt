/*
 * HTML5 DataTransfer — единый формат payload для drag&drop студентов.
 *
 * Используем кастомный MIME `application/x-applicant`, чтобы:
 *  1. Drop-target мог через `e.dataTransfer.types.includes(MIME)` проверить,
 *     что это именно наш drag (не текст из адресной строки и не файл).
 *  2. На dragstart храним сразу всё нужное для условного логического
 *     drop-target — applicationId, projectId, priority, sourceTeamId.
 *     Так при drop в другой проект мы можем мгновенно отрисовать «нельзя».
 *
 * `text/plain` дублируем для отладки и совместимости — Firefox/Chromium
 * всегда показывают валидный preview.
 */

export const APPLICANT_MIME = 'application/x-applicant';

export interface ApplicantDragPayload {
  applicationId: number;
  projectId: number;
  priority: number;
  /** Пришёл из пула (null) или из конкретной команды (teamId). */
  sourceTeamId: number | null;
  qualified: boolean;
}

export function setApplicantDragData(
  dataTransfer: DataTransfer,
  payload: ApplicantDragPayload,
): void {
  const json = JSON.stringify(payload);
  dataTransfer.setData(APPLICANT_MIME, json);
  dataTransfer.setData('text/plain', json);
  dataTransfer.effectAllowed = 'move';
}

export function readApplicantDragData(
  dataTransfer: DataTransfer,
): ApplicantDragPayload | null {
  const raw = dataTransfer.getData(APPLICANT_MIME) || dataTransfer.getData('text/plain');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ApplicantDragPayload>;
    if (
      typeof parsed.applicationId !== 'number' ||
      typeof parsed.projectId !== 'number' ||
      typeof parsed.priority !== 'number' ||
      typeof parsed.qualified !== 'boolean'
    ) {
      return null;
    }
    return {
      applicationId: parsed.applicationId,
      projectId: parsed.projectId,
      priority: parsed.priority,
      sourceTeamId: typeof parsed.sourceTeamId === 'number' ? parsed.sourceTeamId : null,
      qualified: parsed.qualified,
    };
  } catch {
    return null;
  }
}

export function hasApplicantDragData(dataTransfer: DataTransfer): boolean {
  return dataTransfer.types.includes(APPLICANT_MIME) || dataTransfer.types.includes('text/plain');
}
