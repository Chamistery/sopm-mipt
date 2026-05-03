import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useCurrentUser } from './useCurrentUser';

interface Props {
  children: ReactNode;
}

export function RequireAuth({ children }: Props): ReactNode {
  const user = useCurrentUser();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
