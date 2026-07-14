import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { getToken } from '../lib/api';

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    if (getToken()) {
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  return null;
}
