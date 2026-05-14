/*
 * Mirrors backend/project-service/internal/auth/auth.go.
 *
 * Backend accepts these strings in the X-User-Role header. Keep these
 * values in sync — there is no runtime enum on the wire, just strings.
 */

export const ROLES = ['student', 'teamlead', 'mentor', 'coordinator'] as const;

export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export const ROLE_LABELS_RU: Record<Role, string> = {
  student: 'Студент',
  teamlead: 'Тимлид',
  mentor: 'Ментор',
  coordinator: 'Координатор',
};
