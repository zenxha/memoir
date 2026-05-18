import React, { useEffect } from 'react';

export type Surface = 'sky' | 'atlas' | 'roll';

interface Props {
  current: Surface;
  onChange: (s: Surface) => void;
}

const SURFACES: { key: Surface; label: string; shortcut: string }[] = [
  { key: 'sky',   label: 'Sky',   shortcut: '1' },
  { key: 'atlas', label: 'Atlas', shortcut: '2' },
  { key: 'roll',  label: 'Roll',  shortcut: '3' },
];

export function SurfaceSwitcher({ current, onChange }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '1') onChange('sky');
      if (e.key === '2') onChange('atlas');
      if (e.key === '3') onChange('roll');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onChange]);

  return (
    <div style={{
      display: 'flex',
      border: '1px solid var(--ink-300)',
      borderRadius: 100,
      padding: 2,
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      gap: 0,
      userSelect: 'none',
    }}>
      {SURFACES.map(({ key, label }) => (
        <button key={key} onClick={() => onChange(key)} style={{
          padding: '6px 16px',
          borderRadius: 100,
          border: current === key ? '1px solid var(--ink-300)' : '1px solid transparent',
          background: current === key ? 'rgba(243,236,224,0.06)' : 'transparent',
          color: current === key ? 'var(--paper-900)' : 'var(--paper-500)',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: 'inherit',
          letterSpacing: 'inherit',
          textTransform: 'inherit',
          whiteSpace: 'nowrap',
        }}>
          {label}
        </button>
      ))}
    </div>
  );
}
