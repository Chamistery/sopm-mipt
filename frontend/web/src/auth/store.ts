import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { isRole, type Role } from './roles';
import { setAuthHeaderProvider } from '@/api/client';

export interface CurrentUser {
  userId: number;
  role: Role;
  /** Display name cached from /api/users for the sidebar. */
  displayName: string;
}

interface AuthState {
  user: CurrentUser | null;
  signIn: (user: CurrentUser) => void;
  signOut: () => void;
  switchRole: (role: Role) => void;
}

const STORAGE_KEY = 'sopm.auth.v1';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      signIn: (user) => set({ user }),
      signOut: () => set({ user: null }),
      switchRole: (role) =>
        set((state) => (state.user ? { user: { ...state.user, role } } : state)),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user }),
    },
  ),
);

setAuthHeaderProvider(() => {
  const user = useAuthStore.getState().user;
  if (!user) return null;
  return { userId: user.userId, role: user.role };
});

export function readPersistedRole(raw: unknown): Role | null {
  return isRole(raw) ? raw : null;
}
