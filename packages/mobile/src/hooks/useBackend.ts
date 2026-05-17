import { useState, useEffect } from 'react';
import { api } from '../api/client';

export function useBackend() {
  const [online, setOnline] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await api.entries.list({ query: { limit: 1 } });
        setOnline(res.status === 200);
      } catch {
        setOnline(false);
      }
    };
    check();
    const id = setInterval(check, 10000);
    return () => clearInterval(id);
  }, []);

  return online;
}
