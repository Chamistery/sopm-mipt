export const POOL_WIDTH_STORAGE_KEY = 'mentor_distribution_pool_width';
export const POOL_WIDTH_DEFAULT = 380;

/** Загружает сохранённую ширину или возвращает default. */
export function loadPoolWidth(): number {
  if (typeof window === 'undefined') return POOL_WIDTH_DEFAULT;
  const raw = window.localStorage.getItem(POOL_WIDTH_STORAGE_KEY);
  if (!raw) return POOL_WIDTH_DEFAULT;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 200 || n > 800) return POOL_WIDTH_DEFAULT;
  return n;
}

export function savePoolWidth(width: number): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(POOL_WIDTH_STORAGE_KEY, String(width));
}
