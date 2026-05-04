/*
 * Pure helpers для таба «Отчёты по спринтам» у ментора.
 *
 * Расчёт агрегатной оценки команды за спринт, текст статус-бейджа,
 * сортировка отчётов и форматирование заголовка карточки по диапазону
 * дат спринта. Никакой работы с DOM — чтобы можно было покрыть unit-тестами
 * без рендера.
 */

import type { SprintScore } from '@/api/sprintScores';
import type { Sprint } from '@/api/teams';
import type { TeamReport, TeamReportStatus } from '@/api/teamReports';

const MONTH_RU_SHORT = [
  'янв',
  'фев',
  'мар',
  'апр',
  'мая',
  'июн',
  'июл',
  'авг',
  'сен',
  'окт',
  'ноя',
  'дек',
];

/**
 * Среднее по списку оценок, округлённое до одного знака. Если оценок
 * нет — возвращает null (карточка покажет «Проверен» без числа).
 */
export function averageScore(scores: ReadonlyArray<Pick<SprintScore, 'score'>>): number | null {
  if (scores.length === 0) return null;
  const sum = scores.reduce((acc, s) => acc + s.score, 0);
  const avg = sum / scores.length;
  return Math.round(avg * 10) / 10;
}

export interface StatusBadgeInfo {
  text: string;
  /** Семантический ключ цвета — в CSS-Modules маппим в success/warning/danger. */
  tone: 'success' | 'warning' | 'danger' | 'muted';
}

/**
 * Текст и цвет бейджа в шапке карточки отчёта по статусу + средней оценке.
 * Прототип: «Проверен · 8/10» / «Ждёт проверки» / «На доработке» / «Черновик».
 */
export function reportBadge(
  status: TeamReportStatus,
  avg: number | null,
): StatusBadgeInfo {
  if (status === 'Проверен') {
    if (avg == null) return { text: 'Проверен', tone: 'success' };
    return { text: `Проверен · ${formatScore(avg)}/10`, tone: 'success' };
  }
  if (status === 'Отправлен') {
    return { text: 'Ждёт проверки', tone: 'warning' };
  }
  // Черновик пока не имеет отдельного цвета в прототипе — маркируем muted.
  return { text: 'Черновик', tone: 'muted' };
}

function formatScore(n: number): string {
  // Округлённые целые показываем как «8», а не «8.0» — в прототипе так.
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1);
}

/**
 * Сортирует отчёты по sprintNumber DESC (новый — сверху). Если в карте
 * sprintsById нет данных по спринту — фолбэк по sprintId DESC, чтобы
 * порядок оставался стабильным даже при отсутствии справочника.
 */
export function sortReports(
  reports: ReadonlyArray<TeamReport>,
  sprintsById: ReadonlyMap<number, Sprint>,
): TeamReport[] {
  return [...reports].sort((a, b) => {
    const na = sprintsById.get(a.sprintId)?.number ?? a.sprintId;
    const nb = sprintsById.get(b.sprintId)?.number ?? b.sprintId;
    return nb - na;
  });
}

/**
 * Заголовок карточки отчёта: «Спринт N (DD ммм — DD ммм)».
 * Если спринт не найден или даты битые — фолбэк на «Отчёт спринта #id».
 */
export function reportTitle(report: TeamReport, sprint: Sprint | null): string {
  if (sprint == null) return `Отчёт спринта #${report.sprintId}`;
  const range = formatDateRange(sprint.startDate, sprint.endDate);
  return range
    ? `Спринт ${sprint.number} (${range})`
    : `Спринт ${sprint.number}`;
}

/**
 * «17 мар — 6 апр». Возвращает пустую строку, если хотя бы одна из дат
 * невалидна, чтобы caller подменил на чистый «Спринт N».
 */
export function formatDateRange(startISO: string, endISO: string): string {
  const s = parseISO(startISO);
  const e = parseISO(endISO);
  if (s == null || e == null) return '';
  return `${formatDay(s)} — ${formatDay(e)}`;
}

function parseISO(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  const dt = new Date(year, month, day);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function formatDay(d: Date): string {
  return `${d.getDate()} ${MONTH_RU_SHORT[d.getMonth()]}`;
}
