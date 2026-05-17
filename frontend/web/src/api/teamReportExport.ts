/*
 * Скачивание DOCX-отчёта об итерации через GET /api/team-reports/export.
 *
 * Бэк отдаёт application/vnd.openxmlformats-officedocument.wordprocessingml.document
 * blob (см. backend/project-service/internal/handlers/team_report_export_handler.go).
 * apiFetch не подходит — он распаковывает JSON envelope. Используем прямой
 * fetch + auth-headers.
 */

import { API_BASE_URL, ApiError, buildAuthHeaders } from './client';

export type ExportReportKind = 'team' | 'student';

export interface ExportTeamReportParams {
  teamId: number;
  /** Один спринт. Игнорируется, если задан `sprintIds`. */
  sprintId?: number;
  /**
   * Несколько спринтов в одном DOCX (page break между). Перебивает
   * `sprintId`. Для kind='student' бэк отказывает (см. handler).
   */
  sprintIds?: number[];
  kind?: ExportReportKind;
  /** Обязательный при kind=student. */
  studentId?: number;
}

export interface ExportedReport {
  blob: Blob;
  /** Имя файла из Content-Disposition (для save dialog). */
  filename: string;
}

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export async function exportTeamReportDocx(
  params: ExportTeamReportParams,
): Promise<ExportedReport> {
  const search = new URLSearchParams();
  search.set('teamId', String(params.teamId));
  if (params.sprintIds && params.sprintIds.length > 0) {
    search.set('sprintIds', params.sprintIds.join(','));
  } else if (params.sprintId != null) {
    search.set('sprintId', String(params.sprintId));
  } else {
    throw new Error('exportTeamReportDocx: provide sprintId or sprintIds');
  }
  search.set('kind', params.kind ?? 'team');
  if (params.studentId != null) {
    search.set('studentId', String(params.studentId));
  }

  const response = await fetch(`${API_BASE_URL}/team-reports/export?${search.toString()}`, {
    method: 'GET',
    headers: { Accept: DOCX_MIME, ...buildAuthHeaders() },
  });

  if (!response.ok) {
    let errMsg = `HTTP ${response.status}`;
    const text = await response.text();
    try {
      const parsed = JSON.parse(text) as { error?: string };
      if (parsed.error) errMsg = parsed.error;
    } catch {
      if (text) errMsg = text;
    }
    throw new ApiError(response.status, errMsg, text);
  }

  const blob = await response.blob();
  const fallback =
    params.sprintIds && params.sprintIds.length > 0
      ? `sprint_report_team${params.teamId}_all.docx`
      : `sprint_report_team${params.teamId}_sprint${params.sprintId}.docx`;
  const filename =
    parseFilename(response.headers.get('Content-Disposition')) ?? fallback;
  return { blob, filename };
}

/** Триггерит сохранение blob на диск через временный <a download>. */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // отложенно — иначе Chrome иногда отменяет скачивание
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function parseFilename(header: string | null): string | null {
  if (!header) return null;
  // Content-Disposition: attachment; filename="..."
  const match = /filename="([^"]+)"/i.exec(header) ?? /filename=([^;]+)/i.exec(header);
  return match ? match[1].trim() : null;
}
