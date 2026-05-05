/*
 * Helpers для рендера чипа: инициалы, цвет аватара (детерминированный по
 * studentId — чтобы переотрисовка после mutation не меняла цвет).
 */

const AVATAR_COLORS = [
  '#a78bfa',
  '#ec4899',
  '#3b82f6',
  '#14b8a6',
  '#f59e0b',
  '#8b5cf6',
  '#10b981',
  '#64748b',
  '#ef4444',
];

export function avatarColorFor(studentId: number): string {
  const idx = Math.abs(studentId) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx]!;
}

export function initialsFor(firstName: string, lastName: string): string {
  const f = firstName.trim().charAt(0).toUpperCase();
  const l = lastName.trim().charAt(0).toUpperCase();
  return `${l}${f}`;
}

/** «Фамилия И.» — компактное имя для чипа в команде. */
export function shortName(firstName: string, lastName: string): string {
  const f = firstName.trim().charAt(0).toUpperCase();
  return f ? `${lastName} ${f}.` : lastName;
}
