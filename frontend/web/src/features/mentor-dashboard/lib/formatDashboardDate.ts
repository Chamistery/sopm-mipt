/**
 * Russian month-name formatters for the mentor dashboard. Centralised so
 * we don't sprinkle `Intl.DateTimeFormat('ru-RU', …)` across components
 * and the Storybook stories stay deterministic.
 *
 * The prototype shows two date forms in the project card:
 *   - `17 мар — 6 апр`  (sprint range, no year, abbreviated month)
 *   - `сентябрь 2025`   (project start, full month name)
 */

const MONTHS_SHORT = [
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

const MONTHS_LONG = [
  'январь',
  'февраль',
  'март',
  'апрель',
  'май',
  'июнь',
  'июль',
  'август',
  'сентябрь',
  'октябрь',
  'ноябрь',
  'декабрь',
];

/** "2026-03-17" → `17 мар`. Falsy / unparseable input → empty string. */
export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = parseIso(iso);
  if (!date) return '';
  return `${date.day} ${MONTHS_SHORT[date.monthIdx]}`;
}

/** "2026-03-17" — "2026-04-06" → `17 мар — 6 апр`. */
export function formatSprintRange(start: string | null | undefined, end: string | null | undefined): string {
  const lhs = formatShortDate(start);
  const rhs = formatShortDate(end);
  if (!lhs && !rhs) return '';
  if (!rhs) return lhs;
  if (!lhs) return rhs;
  return `${lhs} — ${rhs}`;
}

/** "2025-09-01" → `сентябрь 2025`. */
export function formatLongMonthYear(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = parseIso(iso);
  if (!date) return '';
  return `${MONTHS_LONG[date.monthIdx]} ${date.year}`;
}

/**
 * Computes sprint length in whole weeks ((endDate - startDate + 1 day) / 7).
 * Matches what the prototype shows: "по 3 недели" for 21-day sprints.
 */
export function sprintDurationWeeks(startIso: string | null | undefined, endIso: string | null | undefined): number {
  const start = startIso ? parseIso(startIso) : null;
  const end = endIso ? parseIso(endIso) : null;
  if (!start || !end) return 0;
  const startMs = Date.UTC(start.year, start.monthIdx, start.day);
  const endMs = Date.UTC(end.year, end.monthIdx, end.day);
  const diffDays = Math.round((endMs - startMs) / 86_400_000) + 1;
  return Math.max(1, Math.round(diffDays / 7));
}

interface ParsedDate {
  year: number;
  monthIdx: number;
  day: number;
}

function parseIso(iso: string): ParsedDate | null {
  // Accept both "YYYY-MM-DD" and "YYYY-MM-DDTHH:mm:ss[.sssZ]".
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIdx = Number(match[2]) - 1;
  const day = Number(match[3]);
  if (monthIdx < 0 || monthIdx > 11) return null;
  return { year, monthIdx, day };
}
