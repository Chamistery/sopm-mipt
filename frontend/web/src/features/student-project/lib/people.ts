/*
 * Хелперы для отображения участников команды.
 */

import type { TeamMemberDto } from '@/api/teams';

export interface PersonName {
  firstName: string;
  lastName: string;
  middleName?: string | null;
}

/** «Стародубов А.» — фамилия и инициал имени, как в прототипе. */
export function shortName(p: PersonName): string {
  const initial = p.firstName ? `${p.firstName.charAt(0)}.` : '';
  return `${p.lastName} ${initial}`.trim();
}

/** «Стародубов Александр Юрьевич» — для попапов и заголовков. */
export function fullNameWithMiddle(p: PersonName): string {
  return [p.lastName, p.firstName, p.middleName ?? ''].filter(Boolean).join(' ').trim();
}

/** Двухбуквенные инициалы для аватарки: «АС». */
export function initials(p: PersonName): string {
  const a = (p.lastName || '').charAt(0);
  const b = (p.firstName || '').charAt(0);
  return (a + b).toUpperCase() || '??';
}

/** Стабильный цвет аватарки по userId, чтобы у одного человека всегда был один цвет. */
const AVATAR_PALETTE = [
  'var(--color-accent)',
  'var(--color-success)',
  'var(--color-warning)',
  'var(--color-purple)',
  '#0ea5e9',
  '#f97316',
  '#ec4899',
  '#14b8a6',
];

export function avatarColor(userId: number): string {
  const idx = ((userId % AVATAR_PALETTE.length) + AVATAR_PALETTE.length) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[idx] ?? AVATAR_PALETTE[0]!;
}

export function findMember(members: TeamMemberDto[], userId: number): TeamMemberDto | undefined {
  return members.find((m) => m.userId === userId);
}
