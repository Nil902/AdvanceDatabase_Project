import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { getToken, getStoredUser } from '../lib/api';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      navigate('/login', { replace: true });
    } else {
      setChecked(true);
    }
  }, [navigate]);

  if (!checked) return null;
  return <>{children}</>;
}
