import React, { useMemo, useRef, useState } from 'react';
import { ScrollArea } from '@mantine/core';
import { Entry, PhotoSession } from '@memoir/contract';
import { Surface, SurfaceSwitcher } from './SurfaceSwitcher';

const THUMB_TONES = ['t-warm', 't-cool', 't-green', 't-rose', 't-dim', 't-bright'] as const;
const TONE_BG: Record<string, string> = {
  't-warm':   'linear-gradient(135deg, #3a2c1e, #1a1410)',
  't-cool':   'linear-gradient(135deg, #1c2230, #0e1218)',
  't-green':  'linear-gradient(135deg, #1f2820, #0e120e)',
  't-rose':   'linear-gradient(135deg, #2e1f25, #170c12)',
  't-dim':    'linear-gradient(135deg, #1a1820, #0a0810)',
  't-bright': 'linear-gradient(135deg, #4a3a2a, #251a12)',
};

interface Props {
  entries:      Entry[];
  sessions:     PhotoSession[];
  surface:      Surface;
  onSurface:    (s: Surface) => void;
  onEntryClick: (e: Entry) => void;
}

interface DayBucket {
  day:      string;
  date:     Date;
  photos:   Entry[];
  sessions: PhotoSession[];
}

export function RollSurface({ entries, sessions, surface, onSurface, onEntryClick }: Props) {
  const sessionIds = useMemo(() => new Set(sessions.flatMap(s => s.entry_ids)), [sessions]);

  const days = useMemo(() => {
    const photos = entries.filter(e => e.type === 'photo');
    const map = new Map<string, DayBucket>();

    for (const e of photos) {
      const d = new Date(e.created_at);
      const key = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      if (!map.has(key)) map.set(key, { day: key, date: d, photos: [], sessions: [] });
      if (!sessionIds.has(e.id)) map.get(key)!.photos.push(e);
    }
    for (const s of sessions) {
      const d = new Date(s.started_at);
      const key = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      if (!map.has(key)) map.set(key, { day: key, date: d, photos: [], sessions: [] });
      map.get(key)!.sessions.push(s);
    }
    return [...map.values()].sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [entries, sessions, sessionIds]);

  const totalPhotos = entries.filter(e => e.type === 'photo').length;
  const years = [...new Set(days.map(d => d.date.getFullYear()))].sort((a, b) => b - a);

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'var(--ink-000)',
      display: 'grid',
      gridTemplateColumns: '56px 1fr 56px',
      gridTemplateRows: '88px 1fr',
      overflow: 'hidden',
    }}>
      {/* Left rail — type filter icons */}
      <div style={{
        gridColumn: 1, gridRow: '1 / 3',
        borderRight: '1px solid var(--ink-300)',
        background: 'var(--ink-050)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', padding: '20px 0', gap: 20,
      }}>
        {[
          { type: 'photo',  color: 'var(--photo)',  label: '⬛' },
          { type: 'audio',  color: 'var(--audio)',  label: '◉' },
          { type: 'moment', color: 'var(--moment)', label: '◎' },
          { type: 'note',   color: 'var(--note)',   label: '▤' },
        ].map(({ type, color, label }) => (
          <button key={type} title={type} style={{
            width: 28, height: 28, borderRadius: '50%',
            border: '1px solid var(--ink-400)',
            background: 'transparent', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color, fontSize: 12,
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* Top head */}
      <div style={{
        gridColumn: '2 / 4', gridRow: 1,
        borderBottom: '1px solid var(--ink-300)',
        padding: '0 48px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 24, minWidth: 0 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 36, color: 'var(--paper-900)', lineHeight: 1, whiteSpace: 'nowrap' }}>
            the roll
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--paper-500)', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            {totalPhotos} frames
          </span>
        </div>
        <SurfaceSwitcher current={surface} onChange={onSurface} />
      </div>

      {/* Main grid */}
      <ScrollArea style={{ gridColumn: 2, gridRow: 2 }}>
        <div style={{ padding: '32px 48px 64px', maskImage: 'linear-gradient(to bottom, black 92%, transparent 100%)' }}>
          {days.length === 0 && (
            <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--paper-400)', fontSize: 22, textAlign: 'center', paddingTop: 60 }}>
              no photos yet
            </div>
          )}
          {days.map(bucket => (
            <DayRow key={bucket.day} bucket={bucket} onEntryClick={onEntryClick} />
          ))}
        </div>
      </ScrollArea>

      {/* Right scrubber */}
      <div style={{
        gridColumn: 3, gridRow: 2,
        borderLeft: '1px solid var(--ink-300)',
        background: 'var(--ink-050)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', padding: '20px 0', gap: 8,
      }}>
        {years.map(y => (
          <span key={y} style={{
            fontFamily: 'var(--font-mono)', fontSize: 10,
            letterSpacing: '0.16em',
            color: y === new Date().getFullYear() ? 'var(--ember)' : 'var(--paper-400)',
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            cursor: 'pointer',
          }}>
            {y}
          </span>
        ))}
      </div>
    </div>
  );
}

function DayRow({ bucket, onEntryClick }: { bucket: DayBucket; onEntryClick: (e: Entry) => void }) {
  const items = bucket.photos.length + bucket.sessions.length;
  if (items === 0) return null;

  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        paddingBottom: 10, marginBottom: 14,
        borderBottom: '1px solid var(--ink-300)',
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 24, color: 'var(--paper-900)', lineHeight: 1 }}>
          {bucket.day}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--paper-400)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          {items} {items === 1 ? 'frame' : 'frames'}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 6 }}>
        {bucket.sessions.map(s => <SessionThumb key={`s-${s.started_at}`} session={s} />)}
        {bucket.photos.map((e, i) => (
          <PhotoThumb key={e.id} entry={e} tone={THUMB_TONES[i % THUMB_TONES.length]} onClick={() => onEntryClick(e)} />
        ))}
      </div>
    </div>
  );
}

function PhotoThumb({ entry, tone, onClick }: { entry: Entry; tone: string; onClick: () => void }) {
  const src = entry.media_thumb
    ? `/api/media/${entry.media_thumb.replace('media/', '')}`
    : null;

  return (
    <div onClick={onClick} style={{
      aspectRatio: '1',
      background: TONE_BG[tone] ?? TONE_BG['t-dim'],
      border: '1px solid var(--ink-300)',
      position: 'relative', overflow: 'hidden',
      cursor: 'pointer',
    }}>
      {src && (
        <img src={src} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
      )}
      {entry.place_name && (
        <div style={{
          position: 'absolute', bottom: 4, left: 4,
          fontFamily: 'var(--font-mono)', fontSize: 8,
          color: 'var(--paper-500)', letterSpacing: '0.1em', textTransform: 'uppercase',
          background: 'rgba(7,6,10,0.7)', padding: '1px 5px',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          maxWidth: 'calc(100% - 8px)',
        }}>
          {entry.place_name}
        </div>
      )}
    </div>
  );
}

function SessionThumb({ session }: { session: PhotoSession }) {
  return (
    <div style={{ aspectRatio: '1', position: 'relative' }}>
      {/* Stacked frames effect */}
      {[
        { z: 1, transform: 'translate(5px, 5px) rotate(2.5deg)', opacity: 0.7 },
        { z: 2, transform: 'translate(-3px, 7px) rotate(-1.8deg)', opacity: 0.85 },
        { z: 3, transform: 'none', opacity: 1 },
      ].map(({ z, transform, opacity }) => (
        <div key={z} style={{
          position: z === 1 ? 'relative' : 'absolute',
          inset: 0,
          background: TONE_BG['t-warm'],
          border: '1px solid var(--ink-300)',
          aspectRatio: z === 1 ? '1' : undefined,
          transform, opacity, zIndex: z,
        }} />
      ))}
      <div style={{
        position: 'absolute', bottom: 5, right: 5, zIndex: 4,
        background: 'rgba(7,6,10,0.88)', border: '1px solid var(--ink-300)',
        color: 'var(--paper-700)', fontFamily: 'var(--font-mono)',
        fontSize: 9, letterSpacing: '0.06em', padding: '1px 6px', borderRadius: 100,
      }}>
        {session.frame_count}
      </div>
    </div>
  );
}
