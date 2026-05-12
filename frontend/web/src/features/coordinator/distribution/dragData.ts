/*
 * D&D payload-форматы для координаторского распределения. HTML5
 * DataTransfer возит JSON-сериализованный payload в типе
 * 'application/sopm-coord-dist'. На drop-target читаем payload, решаем
 * мутацию (recommend / unrecommend) и инвалидируем кеш TanStack Query.
 */

export const DIST_DRAG_MIME = 'application/sopm-coord-dist';

export type DistDragPayload =
  | {
      kind: 'team-member';
      applicationId: number;
      studentId: number;
      sourceTeamId: number;
    }
  | {
      kind: 'pool-student';
      studentId: number;
      /** projectId → applicationId map для всех заявок этого студента. */
      applicationsByProject: Record<number, number>;
    };

export function writeDragPayload(e: DragEvent, payload: DistDragPayload): void {
  if (!e.dataTransfer) return;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData(DIST_DRAG_MIME, JSON.stringify(payload));
}

export function readDragPayload(e: DragEvent): DistDragPayload | null {
  if (!e.dataTransfer) return null;
  const raw = e.dataTransfer.getData(DIST_DRAG_MIME);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DistDragPayload;
    if (parsed && (parsed.kind === 'team-member' || parsed.kind === 'pool-student')) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function hasDragPayload(e: DragEvent): boolean {
  if (!e.dataTransfer) return false;
  return e.dataTransfer.types.includes(DIST_DRAG_MIME);
}
