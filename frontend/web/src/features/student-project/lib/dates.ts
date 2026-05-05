/*
 * Чистые функции для расчёта Гант-метрик и форматирования дат.
 *
 * Хранение в стейте — ISO-строки (см. ADR 0001). Здесь они конвертятся
 * в `Date` и обратно. start/dur — производные, нигде в стейте не лежат.
 */

const DAY_MS = 86_400_000;

const MONTHS_GENITIVE_RU = [
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

const MONTHS_RU = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

/** Парсит YYYY-MM-DD в локальный Date с обнулённым временем. */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/** Сериализует Date в YYYY-MM-DD без зависимости от таймзоны. */
export function formatISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Кол-во календарных дней между двумя ISO-датами (b - a). */
export function daysBetween(aIso: string, bIso: string): number {
  const a = parseISODate(aIso).getTime();
  const b = parseISODate(bIso).getTime();
  return Math.round((b - a) / DAY_MS);
}

/** Длительность спринта в днях, считая обе границы включительно. */
export function sprintDays(startIso: string, endIso: string): number {
  return daysBetween(startIso, endIso) + 1;
}

export interface BarPosition {
  /** Смещение начала бара в днях от начала спринта (>=0). */
  start: number;
  /** Длительность в днях, минимум 1. */
  dur: number;
  /** Левый край бара в процентах ширины таймлайна. */
  leftPct: number;
  /** Ширина бара в процентах ширины таймлайна. */
  widthPct: number;
}

/** Считает позицию бара задачи внутри окна спринта. */
export function calcBarPosition(
  taskStartIso: string,
  taskEndIso: string,
  sprintStartIso: string,
  sprintEndIso: string,
): BarPosition {
  const total = sprintDays(sprintStartIso, sprintEndIso);
  const rawStart = daysBetween(sprintStartIso, taskStartIso);
  const rawEnd = daysBetween(sprintStartIso, taskEndIso);
  // clamp в окно спринта, чтобы задачи с «выпавшими» датами не ломали верстку
  const start = Math.max(0, Math.min(total - 1, rawStart));
  const endIncl = Math.max(start, Math.min(total - 1, rawEnd));
  const dur = endIncl - start + 1;
  return {
    start,
    dur,
    leftPct: (start / total) * 100,
    widthPct: (dur / total) * 100,
  };
}

/**
 * Маркер истории — смещение в днях от начала спринта → процент по ширине
 * таймлайна. Центрирует маркер на середине дня события (`day + 0.5`),
 * чтобы маркер визуально стоял в ячейке этого дня, а не на её левом краю.
 */
export function calcHistoryMarkerPct(
  dayOffset: number,
  sprintStartIso: string,
  sprintEndIso: string,
): number {
  const total = sprintDays(sprintStartIso, sprintEndIso);
  const day = Math.max(0, Math.min(total - 1, dayOffset));
  return ((day + 0.5) / total) * 100;
}

/** Процент левого края «сегодня» внутри окна спринта; null — если вне окна. */
export function calcTodayPct(
  todayIso: string,
  sprintStartIso: string,
  sprintEndIso: string,
): number | null {
  const total = sprintDays(sprintStartIso, sprintEndIso);
  const day = daysBetween(sprintStartIso, todayIso);
  if (day < 0 || day >= total) return null;
  return (day / total) * 100;
}

/** Список ISO-дат всех дней спринта. */
export function sprintDayList(startIso: string, endIso: string): string[] {
  const total = sprintDays(startIso, endIso);
  const start = parseISODate(startIso);
  const out: string[] = [];
  for (let i = 0; i < total; i += 1) {
    const dt = new Date(start);
    dt.setDate(dt.getDate() + i);
    out.push(formatISODate(dt));
  }
  return out;
}

export function isWeekend(iso: string): boolean {
  const d = parseISODate(iso).getDay();
  return d === 0 || d === 6;
}

/** «17 марта», «3 апреля». */
export function formatRuDate(iso: string): string {
  const d = parseISODate(iso);
  return `${d.getDate()} ${MONTHS_RU[d.getMonth()]}`;
}

/** «17 мар — 13 апр». */
export function formatRuRange(startIso: string, endIso: string): string {
  const a = parseISODate(startIso);
  const b = parseISODate(endIso);
  return `${a.getDate()} ${MONTHS_GENITIVE_RU[a.getMonth()]} — ${b.getDate()} ${MONTHS_GENITIVE_RU[b.getMonth()]}`;
}

/** Краткий формат для подписи дня в таймлайне: «17» внутри месяца, «1 апр» — на переходе. */
export function formatTimelineDayLabel(iso: string, prevIso: string | null): string {
  const d = parseISODate(iso);
  if (!prevIso) return `${d.getDate()} ${MONTHS_GENITIVE_RU[d.getMonth()]}`;
  const prev = parseISODate(prevIso);
  if (prev.getMonth() !== d.getMonth()) {
    return `${d.getDate()} ${MONTHS_GENITIVE_RU[d.getMonth()]}`;
  }
  return String(d.getDate());
}
