import React, { useState, useRef } from 'react';
import { Entry } from '@memoir/contract';
import { api } from '../api/client';
import { Position } from '../hooks/useGPS';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { C, F } from '../design';

interface Props {
  position: Position | null;
  placeName: string | null;
  nowPlaying: { title: string; artist: string } | null;
  onSave: (entry: Entry) => void;
  onCancel: () => void;
}

export function NoteSheet({ position, placeName, nowPlaying, onSave, onCancel }: Props) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { enqueue } = useOfflineQueue(onSave);

  async function save() {
    if (!text.trim()) return;
    const pos = position ? { lat: position.lat, lng: position.lng, accuracy: position.accuracy } : {};
    const body = { type: 'note' as const, body: text.trim(), ...pos };

    try {
      const res = await api.entries.create({ body });
      if (res.status !== 201) throw new Error();
      onSave(res.body);
    } catch {
      enqueue({ body });
      onSave({
        ...body, id: `offline-${Date.now()}`, created_at: Date.now(), imported_at: null, source: 'native',
        lat: pos.lat ?? null, lng: pos.lng ?? null, accuracy: pos.accuracy ?? null, altitude: null,
        place_name: 'Queued offline', title: null, media_path: null, media_thumb: null, waveform: null,
        transcript: null, duration_ms: null, music_title: null, music_artist: null, music_key: null,
        tags: [], weather: null, device_id: null, external_id: null,
      });
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { void save(); }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: C.ink050,
      borderTop: `1px solid ${C.ink300}`,
      borderRadius: '22px 22px 0 0',
      zIndex: 40,
      display: 'flex', flexDirection: 'column',
      animation: 'slideUp 360ms cubic-bezier(0.32,0.72,0,1) forwards',
    }}>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(42%); }
          to   { transform: translateY(0); }
        }
      `}</style>

      {/* Handle */}
      <div style={{ padding: '14px 0 8px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: 38, height: 4, background: 'rgba(243,236,224,0.3)', borderRadius: 4 }} />
      </div>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        padding: '0 22px 16px',
      }}>
        <div>
          <div style={{ fontFamily: F.mono, fontSize: 9, color: C.paper400, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            // note · fragment
          </div>
          <div style={{ fontFamily: F.display, fontStyle: 'italic', fontSize: 22, color: C.paper900, marginTop: 2 }}>
            A fragment.
          </div>
        </div>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.note, boxShadow: `0 0 8px ${C.noteGlow}` }} />
      </div>

      {/* Context pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, padding: '0 22px 16px' }}>
        {placeName && (
          <span style={{ fontFamily: F.mono, fontSize: 10, color: C.paper700, border: `1px solid ${C.ink300}`, borderRadius: 100, padding: '4px 10px', background: 'rgba(28,25,36,0.4)' }}>
            📍 {placeName}
          </span>
        )}
        {nowPlaying && (
          <span style={{ fontFamily: F.mono, fontSize: 10, color: C.paper700, border: `1px solid ${C.ink300}`, borderRadius: 100, padding: '4px 10px', background: 'rgba(28,25,36,0.4)' }}>
            ♪ {nowPlaying.title}
          </span>
        )}
        <span style={{ fontFamily: F.mono, fontSize: 10, color: C.paper400, border: `1px solid ${C.ink300}`, borderRadius: 100, padding: '4px 10px', background: 'rgba(28,25,36,0.4)' }}>
          {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
        </span>
      </div>

      {/* Fragment input */}
      <div style={{ padding: '0 22px 16px', flex: 1 }}>
        <textarea
          ref={inputRef}
          autoFocus
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder='"the light was strange today'
          rows={3}
          style={{
            width: '100%', border: `1px solid ${C.note}`,
            background: `oklch(74% 0.10 15 / 0.06)`,
            borderRadius: 12, padding: '16px 18px',
            fontFamily: F.display, fontStyle: 'italic', fontSize: 22,
            color: C.paper900, lineHeight: 1.3, letterSpacing: '-0.005em',
            resize: 'none', outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Save bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px 40px', gap: 12 }}>
        <div style={{ fontFamily: F.mono, fontSize: 10, color: C.paper500, letterSpacing: '0.06em' }}>↩ save · ⌘ enter</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ border: 0, background: 'transparent', fontFamily: F.mono, fontSize: 10, color: C.paper500, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer' }}>cancel</button>
          <button
            onClick={() => { void save(); }}
            disabled={!text.trim()}
            style={{ border: 0, background: text.trim() ? C.note : C.ink300, color: text.trim() ? C.ink000 : C.paper500, padding: '9px 18px', borderRadius: 100, fontFamily: F.mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', cursor: text.trim() ? 'pointer' : 'default', transition: 'background 200ms' }}
          >save</button>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 7, left: '50%', transform: 'translateX(-50%)', width: 100, height: 4, background: 'rgba(243,236,224,0.35)', borderRadius: 4, pointerEvents: 'none' }} />
    </div>
  );
}
