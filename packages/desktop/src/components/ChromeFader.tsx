import React from 'react';
import { useIdleFade } from '../hooks/useIdleFade';

interface Props { children: React.ReactNode; }

export function ChromeFader({ children }: Props) {
  const idle = useIdleFade();
  return (
    <div style={{
      opacity: idle ? 0.15 : 1,
      transition: idle
        ? 'opacity 1s ease'
        : 'opacity 250ms ease',
      display: 'contents',
    }}>
      {children}
    </div>
  );
}
