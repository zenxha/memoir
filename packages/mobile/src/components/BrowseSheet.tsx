import React, { useRef, useCallback } from 'react';
import { Entry } from '@memoir/contract';
import { C, F, typeColor, typeGlow, timeAgo, groupByDay } from '../design';
import { Position } from '../hooks/useGPS';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { api } from '../api/client';
import { PhotoGrid } from './PhotoGrid';

export type AppMode = 'home' | 'browse' | 'recording' | 'note' | 'detail' | 'search';

interface Props {
  mode: AppMode;
  entries: Entry[];
  placeName: string | null;
  nowPlaying: { title: string; artist: string } | null;
  filter: string;
  position: Position | null;
  online: boolean;
  onFilterChange: (f: string) => void;
  onOpen: () => void;
  onClose: () => void;
  onRecord: () => void;
  onNote: () => void;
  onSearch: () => void;
  onSelectEntry: (e: Entry) => void;
  onSave: (e: Entry) => void;
}

const SHEET_HOME   = 'translateY(calc(100% - 128px))';
const SHEET_BROWSE = 'translateY(38%)';

// ── Entry row ──────────────────────────────────────────────────────────────────

function EntryRow({ entry, onSelect }: { entry: Entry; onSelect: () => void }) {
  const col  = typeColor(entry.type);
  const glow = typeGlow(entry.type);
  const when = `${new Date(entry.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} · ${entry.place_name ?? ''}`;

  return (
    <div
      onClick={onSelect}
      style={{
        display: 'grid',
        gridTemplateColumns: '14px 1fr',
        gap: 12,
        padding: '14px 0',
        borderTop: `1px solid ${C.ink300}`,
        cursor: 'pointer',
      }}
    >
      {/* Type dot */}
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: col, boxShadow: `0 0 8px ${glow}`,
        marginTop: 7, flexShrink: 0,
      }} />

      {/* Content */}
      <div>
        <div style={{ fontFamily: F.mono, fontSize: 9, color: C.paper400, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          {when}
        </div>

        <div style={{ fontFamily: F.display, fontSize: 16, color: C.paper900, lineHeight: 1.25, marginTop: 2 }}>
          {entry.title ?? entry.place_name ?? entry.type}
        </div>

        {/* Type-specific extras */}
        {entry.type === 'audio' && entry.waveform && entry.waveform.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 12, marginTop: 6 }}>
            {entry.waveform.slice(0, 32).map((p, i) => (
              <div key={i} style={{ width: 1.5, height: Math.max(2, p * 12), background: col, borderRadius: 0.5 }} />
            ))}
          </div>
        )}

        {entry.type === 'photo' && entry.media_thumb && (
          <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
            <img
              // Server stores `media_thumb` as `media/thumb_xxx.jpg`; the
              // /api/media/:filename route resolves a bare filename, so strip the
              // leading "media/" prefix to avoid double-prefixing (WR-02). Mirrors
              // PhotoGrid.PhotoTile (PhotoGrid.tsx:144-146).
              src={`/api/media/${entry.media_thumb.replace('media/', '')}`}
              alt=""
              style={{ width: 36, height: 36, objectFit: 'cover', border: `1px solid ${C.ink300}` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Day group ──────────────────────────────────────────────────────────────────

function DaySection({ dayLabel, dateStr, entries, onSelectEntry }: {
  dayLabel: string; dateStr: string; entries: Entry[]; onSelectEntry: (e: Entry) => void;
}) {
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        padding: '16px 0 8px',
        borderBottom: `1px solid ${C.ink300}`,
        marginBottom: 2,
      }}>
        <div style={{ fontFamily: F.display, fontStyle: 'italic', fontSize: 19, color: C.paper900 }}>
          <em style={{ color: C.paper700 }}>{dayLabel}</em> · {dateStr}
        </div>
        <div style={{ fontFamily: F.mono, fontSize: 9, color: C.paper400, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          {entries.length}
        </div>
      </div>

      {entries.map(e => (
        <EntryRow key={e.id} entry={e} onSelect={() => onSelectEntry(e)} />
      ))}
    </div>
  );
}

// ── Main BrowseSheet ───────────────────────────────────────────────────────────

export function BrowseSheet({
  mode, entries, placeName, nowPlaying, filter,
  position, online,
  onFilterChange, onOpen, onClose, onRecord, onNote, onSearch, onSelectEntry, onSave,
}: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);

  // Offline-queue auto-flushes on mount + on `window:online`; flushed entries emit via onSave.
  // Mirrors the wiring in RecordingSheet (line 32) and NoteSheet (line 19).
  const { enqueue } = useOfflineQueue(onSave);

  // Two-step photo capture: api.entries.create → /api/media/upload → onSave.
  // On any failure, fall back to the offline queue with an optimistic placeholder
  // entry — same shape as RecordingSheet.stop() (lines 114-120) and NoteSheet.save()
  // (lines 32-38). The contract client (api.entries.create) MUST be used here per
  // T-03-05 — no raw fetch on /api/entries.
  //
  // If `entries.create` succeeds but the subsequent /api/media/upload fails, the
  // server is left with an orphan placeless entry. Roll it back via
  // `api.entries.remove(entry.id)` before enqueueing, so the offline-queue retry
  // (which re-creates the entry) doesn't produce a duplicate (WR-01).
  //
  // Photo input has `accept="image/*"` + `capture="environment"`, but `accept` is
  // advisory — a user manually picking a HEIC or video would either be silently
  // rejected by `sharp` or stored as an opaque blob the desktop client can't render.
  // A 50MB cap is generous for phone photos (well under the server's 500MB cap)
  // and aborts before chewing mobile bandwidth on an accidental video (WR-06).
  const handlePhotoFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = '';                       // Pitfall 7: allow re-selecting the same file
    if (!file) return;

    // WR-06: client-side MIME + size gate.
    if (!file.type.startsWith('image/')) return;
    if (file.size > 50 * 1024 * 1024) return;

    const pos = position
      ? { lat: position.lat, lng: position.lng, accuracy: position.accuracy }
      : {};
    const body = { type: 'photo' as const, ...pos };
    const blobName = file.name || `photo-${Date.now()}.jpg`;

    let createdEntryId: string | null = null;
    try {
      const res = await api.entries.create({ body });
      if (res.status !== 201) throw new Error('create failed');
      const entry = res.body;
      createdEntryId = entry.id;

      const fd = new FormData();
      fd.append('entryId', entry.id);
      fd.append('file', file, blobName);
      const up = await fetch('/api/media/upload', { method: 'POST', body: fd });
      if (!up.ok) throw new Error('upload failed');

      // The WS broadcast (entry:updated) will hydrate media_path / media_thumb shortly.
      onSave(entry);
    } catch {
      // Roll back the orphan entry if create succeeded but upload failed (WR-01).
      // Fire-and-forget: if the rollback DELETE itself fails (offline), we accept
      // the worst case (one orphan + one queued duplicate) — rare and recoverable.
      if (createdEntryId) {
        api.entries.remove({ params: { id: createdEntryId } })
          .catch(() => { /* offline — orphan will be reconciled manually */ });
      }
      enqueue({ body, blob: file, blobName });
      onSave({
        ...body, id: `offline-${Date.now()}`, created_at: Date.now(), imported_at: null, source: 'native',
        lat: pos.lat ?? null, lng: pos.lng ?? null, accuracy: pos.accuracy ?? null, altitude: null,
        place_name: 'Queued offline', title: null, body: null, duration_ms: null, waveform: null,
        transcript: null, media_path: null, media_thumb: null,
        music_title: null, music_artist: null, music_key: null,
        tags: [], weather: null, device_id: null, external_id: null,
      });
    }
  }, [position, onSave, enqueue]);

  const isHome   = mode === 'home';
  const isBrowse = mode === 'browse';
  const isVisible = isHome || isBrowse;

  // Snap on drag release
  const onHandlePointerDown = useCallback((e: React.PointerEvent) => {
    dragStartY.current = e.clientY;
  }, []);

  const onHandlePointerUp = useCallback((e: React.PointerEvent) => {
    const delta = dragStartY.current - e.clientY; // positive = swiped up
    if (Math.abs(delta) < 12) {
      // Tap: toggle
      if (isHome) onOpen(); else onClose();
    } else if (delta > 24) {
      onOpen();
    } else if (delta < -24) {
      onClose();
    }
  }, [isHome, onOpen, onClose]);

  const transform = isHome ? SHEET_HOME : SHEET_BROWSE;

  // Groups for display
  const filtered = filter === 'all' ? entries : entries.filter(e => e.type === filter);
  const groups   = groupByDay(filtered);

  // Today's count
  const todayCount = groups[0]?.dayLabel === 'Today' ? groups[0].entries.length : 0;
  const todayLabel = placeName ? `${todayCount} captured · ${placeName}` : `${todayCount} captured`;

  // Sync dot (offline indicator)
  const syncColor = online ? C.moment : C.ember;

  return (
    <div
      ref={sheetRef}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        transform,
        transition: isVisible ? 'transform 380ms cubic-bezier(0.32,0.72,0,1)' : 'none',
        background: C.ink050,
        borderRadius: '22px 22px 0 0',
        borderTop: `1px solid ${C.ink300}`,
        boxShadow: '0 -16px 40px rgba(0,0,0,0.55)',
        zIndex: 20,
        display: 'flex', flexDirection: 'column',
        // hide when other modes (recording, note, detail, search) are active
        visibility: isVisible ? 'visible' : 'hidden',
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
    >
      {/* Pull handle — drag target */}
      <div
        onPointerDown={onHandlePointerDown}
        onPointerUp={onHandlePointerUp}
        style={{
          flexShrink: 0,
          padding: '14px 20px 10px',
          cursor: 'grab',
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        <div style={{
          width: 38, height: 4,
          background: 'rgba(243,236,224,0.3)',
          borderRadius: 4,
          margin: '0 auto',
        }} />
      </div>

      {/* ── HOME peeked strip ── */}
      {isHome && (
        <div style={{
          flexShrink: 0,
          padding: '0 20px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* Left: today metadata */}
          <div>
            <div style={{ fontFamily: F.mono, fontSize: 9, color: C.paper400, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              today · {new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()}
            </div>
            <div style={{ fontFamily: F.display, fontStyle: 'italic', fontSize: 22, color: C.paper900, marginTop: 2 }}>
              {todayLabel}
            </div>
          </div>

          {/* Right: + note pill, + photo pill, audio FAB */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* + note */}
            <button
              onClick={onNote}
              style={{
                height: 36,
                padding: '0 12px',
                border: `1px solid ${C.ink300}`,
                background: 'rgba(28,25,36,0.6)',
                color: C.note,
                borderRadius: 100,
                fontFamily: F.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >+ note</button>

            {/* + photo */}
            <label style={{
              height: 36,
              padding: '0 12px',
              border: `1px solid ${C.ink300}`,
              background: 'rgba(28,25,36,0.6)',
              color: C.photo,
              borderRadius: 100,
              fontFamily: F.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
              cursor: 'pointer',
              display: 'grid', placeItems: 'center',
            }}>
              + photo
              <input
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={handlePhotoFile}
              />
            </label>

            {/* Record FAB */}
            <div
              onClick={onRecord}
              style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 30%, oklch(80% 0.16 250), oklch(60% 0.16 250))',
                boxShadow: `0 0 0 4px rgba(28,25,36,0.6), 0 0 0 5px ${C.audio}, 0 0 24px 4px ${C.audioGlow}`,
                display: 'grid', placeItems: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                position: 'relative',
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: 4,
                background: C.paper900,
              }} />
            </div>
          </div>
        </div>
      )}

      {/* ── BROWSE expanded ── */}
      {isBrowse && (
        <>
          {/* Search + filter row */}
          <div style={{
            flexShrink: 0,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '4px 20px 10px',
            gap: 8,
          }}>
            <div
              onClick={onSearch}
              style={{
                flex: 1,
                fontFamily: F.mono, fontSize: 10, color: C.paper400,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                background: 'rgba(7,6,10,0.6)',
                border: `1px solid ${C.ink300}`,
                padding: '6px 12px',
                borderRadius: 100,
                cursor: 'pointer',
              }}
            >⌕ search archive</div>

            <div style={{ display: 'flex', gap: 5 }}>
              {(['all', 'audio', 'photo', 'moment', 'note'] as const).filter(f => f !== 'all').map(f => (
                <button
                  key={f}
                  onClick={() => onFilterChange(filter === f ? 'all' : f)}
                  style={{
                    border: `1px solid ${filter === f ? typeColor(f) : C.ink300}`,
                    background: filter === f ? `${typeColor(f)}22` : 'transparent',
                    color: filter === f ? typeColor(f) : C.paper500,
                    borderRadius: 100,
                    padding: '4px 9px',
                    fontFamily: F.mono, fontSize: 9,
                    cursor: 'pointer',
                    letterSpacing: '0.06em',
                  }}
                >{f}</button>
              ))}
            </div>
          </div>

          {/* Scrollable entry list (filter='photo' swaps in PhotoGrid; D-16/D-17) */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0 20px 80px',
            WebkitOverflowScrolling: 'touch',
          }}>
            {filter === 'photo' ? (
              <PhotoGrid entries={entries} onSelectEntry={onSelectEntry} />
            ) : (
              <>
                {groups.length === 0 && (
                  <div style={{ fontFamily: F.display, fontStyle: 'italic', fontSize: 16, color: C.paper500, paddingTop: 32, textAlign: 'center' }}>
                    No entries yet
                  </div>
                )}
                {groups.map(g => (
                  <DaySection
                    key={g.key}
                    dayLabel={g.dayLabel}
                    dateStr={g.dateStr}
                    entries={g.entries}
                    onSelectEntry={onSelectEntry}
                  />
                ))}
              </>
            )}
          </div>

          {/* Capture pill row at bottom */}
          <div style={{
            position: 'absolute', bottom: 28, left: 20, right: 20,
            display: 'flex', gap: 8, alignItems: 'center',
          }}>
            {/* Moment */}
            <button
              onClick={onNote}
              style={{
                flex: 1, height: 40,
                border: `1px solid ${C.ink300}`,
                background: 'rgba(28,25,36,0.6)',
                color: C.note, borderRadius: 100,
                fontFamily: F.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >+ note</button>

            {/* Photo */}
            <label style={{
              flex: 1, height: 40,
              border: `1px solid ${C.ink300}`,
              background: 'rgba(28,25,36,0.6)',
              color: C.photo, borderRadius: 100,
              fontFamily: F.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
              cursor: 'pointer',
              display: 'grid', placeItems: 'center',
            }}>
              + photo
              <input
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={handlePhotoFile}
              />
            </label>

            {/* Record FAB (center) */}
            <div
              onClick={onRecord}
              style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 30%, oklch(80% 0.16 250), oklch(60% 0.16 250))',
                boxShadow: `0 0 0 4px rgba(28,25,36,0.6), 0 0 0 5px ${C.audio}, 0 0 24px 4px ${C.audioGlow}`,
                display: 'grid', placeItems: 'center',
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              <div style={{ width: 18, height: 18, borderRadius: 4, background: C.paper900 }} />
            </div>

            {/* Sync indicator */}
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: syncColor, flexShrink: 0, marginLeft: 4 }} />
          </div>
        </>
      )}

      {/* Home indicator bar */}
      <div style={{
        position: 'absolute', bottom: 7, left: '50%',
        transform: 'translateX(-50%)',
        width: 100, height: 4,
        background: 'rgba(243,236,224,0.35)',
        borderRadius: 4,
        pointerEvents: 'none',
      }} />
    </div>
  );
}
