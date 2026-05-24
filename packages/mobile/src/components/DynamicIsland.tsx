import React from 'react';
import { C, F } from '../design';

interface Props {
  nowPlaying: { title: string; artist: string } | null;
  recording: boolean;
  elapsed?: number; // ms, only used when recording
}

// Formats seconds as MM:SS
function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function DynamicIsland({ nowPlaying, recording, elapsed = 0 }: Props) {
  const hasContent = recording || nowPlaying != null;

  return (
    <div style={{
      position: 'absolute',
      top: 8,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 60,
      // size
      height: 28,
      minWidth: hasContent ? 120 : 100,
      maxWidth: 260,
      // appearance
      background: hasContent ? '#050307' : '#000',
      border: hasContent ? `1px solid #1a1624` : 'none',
      borderRadius: 16,
      // layout
      display: 'flex', alignItems: 'center',
      gap: 6,
      padding: hasContent ? '0 12px 0 8px' : '0',
      // typography
      fontFamily: F.mono,
      fontSize: 9,
      color: C.paper700,
      letterSpacing: '0.03em',
      whiteSpace: 'nowrap',
      // animation
      transition: 'min-width 260ms cubic-bezier(0.32,0.72,0,1), background 200ms ease',
      overflow: 'hidden',
    }}>
      {hasContent && (
        <>
          {/* Ember dot */}
          <div style={{
            width: 5, height: 5, borderRadius: '50%',
            background: recording ? C.ember : C.ember,
            boxShadow: `0 0 6px ${C.ember}`,
            flexShrink: 0,
          }} />

          {/* Equalizer bars (music only) */}
          {nowPlaying && !recording && (
            <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 9 }}>
              {[2, 7, 4, 9].map((h, i) => (
                <div key={i} style={{ width: 2, height: h, background: C.ember, borderRadius: 0.5 }} />
              ))}
            </div>
          )}

          {/* Label */}
          {recording ? (
            <>
              <span style={{ color: C.paper900 }}>recording</span>
              <span style={{ color: C.paper500 }}>{fmt(elapsed)}</span>
            </>
          ) : nowPlaying ? (
            <span style={{ color: C.paper900, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {nowPlaying.title}
            </span>
          ) : null}
        </>
      )}
    </div>
  );
}
