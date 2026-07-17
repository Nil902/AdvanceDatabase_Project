import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { getToken, getStoredUser } from '../lib/api';

// The shape login stores under `auth_user` (SystemUserResource).
interface StoredUser {
  role?: { role_code?: string } | null;
}

export type AppArea = 'admin' | 'registrar';

// Where a user belongs based on their role. Only the `admin` role code uses
// the admin dashboard; every other role (supervisor, registrar, viewer) uses
// the registrar portal.
export function homeForRole(roleCode?: string | null): string {
  return roleCode === 'admin' ? '/dashboard' : '/registrar';
}

/**
 * Route guard. Redirects to /login when unauthenticated, and — when an `area`
 * is given — bounces users who don't belong in that area back to their own
 * home. This is what stops a registrar from opening the admin dashboard and an
 * admin from opening the registrar portal.
 */
export function AuthGuard({
  area,
  children,
}: {
  area?: AppArea;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      navigate('/login', { replace: true });
      return;
    }

    const user = getStoredUser<StoredUser>();
    const home = homeForRole(user?.role?.role_code);

    if (area === 'admin' && home !== '/dashboard') {
      navigate(home, { replace: true });
      return;
    }
    if (area === 'registrar' && home !== '/registrar') {
      navigate(home, { replace: true });
      return;
    }

    setChecked(true);
  }, [navigate, area]);

  if (!checked) return null;
  return <>{children}</>;
}
