import React from 'react';

interface Props {
  track: { title: string; artist: string } | null;
}

export function NowPlaying({ track }: Props) {
  if (!track) return null;

  return (
    <div style={{
      position: 'absolute', bottom: 32, left: 32,
      zIndex: 20, pointerEvents: 'none',
      display: 'flex', alignItems: 'center', gap: 10,
      background: 'rgba(7,6,10,0.82)',
      border: '1px solid var(--ink-300)',
      borderRadius: 100,
      padding: '8px 16px',
      backdropFilter: 'blur(8px)',
      animation: 'npfade 400ms ease',
    }}>
      <style>{`@keyframes npfade { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:none } }`}</style>
      {/* pulsing ember dot */}
      <span style={{
        display: 'block', width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
        background: 'var(--ember)',
        boxShadow: '0 0 8px var(--ember)',
        animation: 'pulse 2s ease-in-out infinite',
      }} />
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 11,
        color: 'var(--paper-700)', letterSpacing: '0.06em',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        maxWidth: 280,
      }}>
        {track.title}
        <span style={{ color: 'var(--paper-400)', marginLeft: 6 }}>
          {track.artist}
        </span>
      </span>
    </div>
  );
}
