import { useEffect, useRef, useState } from 'react';

const IDLE_MS = 4000;
const RESTORE_MS = 250;

export function useIdleFade() {
  const [idle, setIdle] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onMove = () => {
      setIdle(false);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setIdle(true), IDLE_MS);
    };

    timer.current = setTimeout(() => setIdle(true), IDLE_MS);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mousedown', onMove);
    window.addEventListener('keydown', onMove);

    return () => {
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onMove);
      window.removeEventListener('keydown', onMove);
    };
  }, []);

  return idle;
}
