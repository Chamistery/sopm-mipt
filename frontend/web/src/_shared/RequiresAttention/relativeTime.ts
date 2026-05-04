/*
 * Russian relative-time formatter for notification cards.
 *
 * Why hand-rolled and not Intl.RelativeTimeFormat: we need
 *   - «только что», «вчера», «сегодня», «N часов назад»
 *   - correct Russian plural forms (1 час / 2 часа / 5 часов)
 *   - no extra dependencies (Intl in some Node versions ships limited
 *     'ru' data and we run vitest in jsdom).
 *
 * The function is pure and deterministic given (now, iso) — both are
 * passed in so tests don't depend on Date.now().
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Russian plural picker. Returns one of three forms based on `n`. */
export function pluralRu(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/**
 * Formats `iso` relative to `now`. Both are timestamps; `iso` may be a
 * partial ISO string (no zone) — we treat it as UTC if no zone is present.
 */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  if (!iso) return '';
  const ts = parseTimestamp(iso);
  if (Number.isNaN(ts)) return '';

  const deltaMs = now.getTime() - ts;
  if (deltaMs < 0) {
    // Future timestamps — keep it short and neutral.
    return 'скоро';
  }

  if (deltaMs < MINUTE) return 'только что';
  if (deltaMs < HOUR) {
    const m = Math.floor(deltaMs / MINUTE);
    return `${m} ${pluralRu(m, 'минуту', 'минуты', 'минут')} назад`;
  }
  if (deltaMs < DAY) {
    const h = Math.floor(deltaMs / HOUR);
    return `${h} ${pluralRu(h, 'час', 'часа', 'часов')} назад`;
  }

  const days = Math.floor(deltaMs / DAY);
  if (days === 1) return 'вчера';
  if (days < 7) return `${days} ${pluralRu(days, 'день', 'дня', 'дней')} назад`;
  if (days < 30) {
    const w = Math.floor(days / 7);
    return `${w} ${pluralRu(w, 'неделю', 'недели', 'недель')} назад`;
  }
  if (days < 365) {
    const mo = Math.floor(days / 30);
    return `${mo} ${pluralRu(mo, 'месяц', 'месяца', 'месяцев')} назад`;
  }
  const y = Math.floor(days / 365);
  return `${y} ${pluralRu(y, 'год', 'года', 'лет')} назад`;
}

function parseTimestamp(iso: string): number {
  // Accept both "2026-04-08T12:30:00" (no zone, treat as UTC) and full ISO.
  const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso);
  const normalized = hasZone ? iso : `${iso}Z`;
  return new Date(normalized).getTime();
}
