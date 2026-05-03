import { useAuthStore } from './store';
import type { Role } from './roles';

const ROLE_HOME: Record<Role, string> = {
  student: '/student',
  teamlead: '/student/project',
  mentor: '/mentor',
  coordinator: '/admin',
  admin: '/admin',
};

export function redirectByRole(): string {
  const role = useAuthStore.getState().user?.role;
  return role ? ROLE_HOME[role] : '/login';
}

export function homePathForRole(role: Role): string {
  return ROLE_HOME[role];
}
