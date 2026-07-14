import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { getToken, getStoredUser } from '../lib/api';

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!getToken()) {
      navigate('/login', { replace: true });
      return;
    }
    const user = getStoredUser<{ role?: { role_code?: string } }>();
    const role = user?.role?.role_code;
    navigate(role === 'admin' ? '/dashboard' : '/registrar', { replace: true });
  }, [navigate]);

  return null;
}
