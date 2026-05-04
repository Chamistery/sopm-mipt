import { useAuthStore, type CurrentUser } from './store';

/** Returns the signed-in user, or null when nobody is signed in. */
export function useCurrentUser(): CurrentUser | null {
  return useAuthStore((s) => s.user);
}

/** Throws when called outside an authenticated route. Use inside RequireAuth-protected pages. */
export function useRequireUser(): CurrentUser {
  const user = useCurrentUser();
  if (!user) {
    throw new Error('useRequireUser called outside of an authenticated route');
  }
  return user;
}
