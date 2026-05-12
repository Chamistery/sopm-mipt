/*
 * Хелперы для построения аватара чипа в distribution: 2 буквы (первая
 * фамилии + первая имени) + стабильный цвет на основе userId.
 */

export function initialsFor(firstName: string, lastName: string): string {
  const first = (lastName || '').trim().charAt(0).toUpperCase();
  const second = (firstName || '').trim().charAt(0).toUpperCase();
  return (first + second) || '?';
}

const PALETTE = [
  '#3b82f6',
  '#0d9668',
  '#d97706',
  '#4338ca',
  '#6366f1',
  '#f59e0b',
  '#ec4899',
  '#14b8a6',
  '#8b5cf6',
  '#f97316',
  '#06b6d4',
  '#84cc16',
  '#0ea5e9',
  '#a855f7',
  '#ef4444',
  '#22c55e',
  '#f43f5e',
  '#10b981',
];

export function colorFor(seed: number): string {
  const idx = ((seed % PALETTE.length) + PALETTE.length) % PALETTE.length;
  return PALETTE[idx];
}
