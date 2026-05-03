import { beforeEach, describe, expect, it } from 'vitest';

import { useAuthStore } from './store';
import { isRole } from './roles';

beforeEach(() => {
  useAuthStore.getState().signOut();
  localStorage.clear();
});

describe('auth store', () => {
  it('persists sign-in to localStorage', () => {
    useAuthStore.getState().signIn({ userId: 1, role: 'mentor', displayName: 'Тимохин В.Н.' });
    const raw = localStorage.getItem('sopm.auth.v1');
    expect(raw).toBeTruthy();
    const parsed = raw ? JSON.parse(raw) : null;
    expect(parsed?.state?.user?.userId).toBe(1);
    expect(parsed?.state?.user?.role).toBe('mentor');
  });

  it('clears the user on sign-out', () => {
    const { signIn, signOut } = useAuthStore.getState();
    signIn({ userId: 5, role: 'student', displayName: 'Стародубов А.' });
    signOut();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('switchRole updates only the role', () => {
    const { signIn, switchRole } = useAuthStore.getState();
    signIn({ userId: 5, role: 'student', displayName: 'Стародубов А.' });
    switchRole('teamlead');
    const u = useAuthStore.getState().user;
    expect(u?.userId).toBe(5);
    expect(u?.role).toBe('teamlead');
  });

  it('isRole guards against unknown values', () => {
    expect(isRole('mentor')).toBe(true);
    expect(isRole('hacker')).toBe(false);
    expect(isRole(undefined)).toBe(false);
  });
});
