import React, { useEffect, useMemo, useState } from 'react';
import { Entry, PhotoSession } from '@memoir/contract';
import { api } from '../api/client';
import { C, F } from '../design';

interface Props {
  entries: Entry[];
  onSelectEntry: (e: Entry) => void;
}

interface DayBucket {
  day:      string;
  date:     Date;
  photos:   Entry[];
  sessions: PhotoSession[];
}

// Single warm gradient — at 4-col mobile size the RollSurface THUMB_TONES rotation reads chaotic.
const TILE_BG = 'linear-gradient(135deg, #3a2c1e, #1a1410)';

export function PhotoGrid({ entries, onSelectEntry }: Props) {
  const [sessions, setSessions] = useState<PhotoSession[]>([]);

  // Server returns 10-min / 50-m clusters (D-17). Contract: GET /api/sessions.
  useEffect(() => {
    let cancelled = false;
    api.sessions.list({ query: {} }).then(res => {
      if (cancelled) return;
      if (res.status === 200) setSessions(res.body);
    }).catch(() => { /* offline — render loose photos only */ });
    return () => { cancelled = true; };
  }, []);

  const sessionEntryIds = useMemo(
    () => new Set(sessions.flatMap(s => s.entry_ids)),
    [sessions],
  );

  // Day-bucketing — copied from RollSurface.tsx:32-51 with mobile token substitutions.
  const days: DayBucket[] = useMemo(() => {
    const photos = entries.filter(e => e.type === 'photo');
    const map = new Map<string, DayBucket>();

    for (const e of photos) {
      const d = new Date(e.created_at);
      const key = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      if (!map.has(key)) map.set(key, { day: key, date: d, photos: [], sessions: [] });
      if (!sessionEntryIds.has(e.id)) map.get(key)!.photos.push(e);
    }
    for (const s of sessions) {
      const d = new Date(s.started_at);
      const key = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      if (!map.has(key)) map.set(key, { day: key, date: d, photos: [], sessions: [] });
      map.get(key)!.sessions.push(s);
    }
    return [...map.values()].sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [entries, sessions, sessionEntryIds]);

  if (days.length === 0) {
    return (
      <div style={{
        fontFamily: F.display, fontStyle: 'italic', fontSize: 18, color: C.paper500,
        paddingTop: 60, textAlign: 'center',
      }}>
        no photos yet
      </div>
    );
  }

  return (
    <div style={{ padding: '4px 16px 80px' }}>
      {days.map(bucket => (
        <DayRow
          key={bucket.day}
          bucket={bucket}
          entries={entries}
          onSelectEntry={onSelectEntry}
        />
      ))}
    </div>
  );
}

// ── Day header + 4-col grid ───────────────────────────────────────────────────

function DayRow({ bucket, entries, onSelectEntry }: {
  bucket: DayBucket;
  entries: Entry[];
  onSelectEntry: (e: Entry) => void;
}) {
  const items = bucket.photos.length + bucket.sessions.length;
  if (items === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Day header — RollSurface.tsx:152-165 adapted for mobile */}
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        padding: '14px 0 8px',
        borderBottom: `1px solid ${C.ink300}`,
      }}>
        <div style={{
          fontFamily: F.display, fontStyle: 'italic', fontSize: 18, color: C.paper900,
        }}>
          {bucket.day}
        </div>
        <div style={{
          fontFamily: F.mono, fontSize: 9, color: C.paper400,
          letterSpacing: '0.12em', textTransform: 'uppercase',
        }}>
          {items} {items === 1 ? 'frame' : 'frames'}
        </div>
      </div>

      {/* 4-col grid — sessions first, then loose photos (desktop convention) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 4,
        marginTop: 10,
      }}>
        {bucket.sessions.map(s => (
          <SessionTile
            key={`s-${s.started_at}`}
            session={s}
            onClick={() => {
              const first = entries.find(e => e.id === s.entry_ids[0]);
              if (first) onSelectEntry(first);
            }}
          />
        ))}
        {bucket.photos.map(e => (
          <PhotoTile key={e.id} entry={e} onClick={() => onSelectEntry(e)} />
        ))}
      </div>
    </div>
  );
}

// ── Photo tile (single thumbnail) ─────────────────────────────────────────────

function PhotoTile({ entry, onClick }: { entry: Entry; onClick: () => void }) {
  // Server strips the leading "media/" prefix from URL params (RollSurface.tsx:178).
  const src = entry.media_thumb
    ? `/api/media/${entry.media_thumb.replace('media/', '')}`
    : null;

  return (
    <div onClick={onClick} style={{
      aspectRatio: '1',
      background: TILE_BG,
      border: `1px solid ${C.ink300}`,
      position: 'relative', overflow: 'hidden',
      cursor: 'pointer',
    }}>
      {src && (
        <img
          src={src}
          loading="lazy"
          alt=""
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
          }}
        />
      )}
    </div>
  );
}

// ── Session tile (stacked-frames effect + count badge) ────────────────────────

function SessionTile({ session, onClick }: { session: PhotoSession; onClick: () => void }) {
  // Verbatim from RollSurface.tsx:208-236 with mobile token substitutions.
  return (
    <div onClick={onClick} style={{ aspectRatio: '1', position: 'relative', cursor: 'pointer' }}>
      {[
        { z: 1, transform: 'translate(5px, 5px) rotate(2.5deg)',   opacity: 0.7  },
        { z: 2, transform: 'translate(-3px, 7px) rotate(-1.8deg)', opacity: 0.85 },
        { z: 3, transform: 'none',                                   opacity: 1    },
      ].map(({ z, transform, opacity }) => (
        <div key={z} style={{
          position: z === 1 ? 'relative' : 'absolute',
          inset: 0,
          background: TILE_BG,
          border: `1px solid ${C.ink300}`,
          aspectRatio: z === 1 ? '1' : undefined,
          transform, opacity, zIndex: z,
        }} />
      ))}
      <div style={{
        position: 'absolute', bottom: 5, right: 5, zIndex: 4,
        background: 'rgba(7,6,10,0.88)',
        border: `1px solid ${C.ink300}`,
        color: C.paper700,
        fontFamily: F.mono, fontSize: 9, letterSpacing: '0.06em',
        padding: '1px 6px', borderRadius: 100,
      }}>
        {session.frame_count}
      </div>
    </div>
  );
}
