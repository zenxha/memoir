import React, { useRef, useState, useCallback } from 'react';
import { Entry } from '@memoir/contract';
import { C, F, typeColor, typeGlow, formatTime } from '../design';

interface Props {
  entry: Entry;
  entries: Entry[];
  nowPlaying: { title: string; artist: string } | null;
  onClose: () => void;
  onSelectEntry: (e: Entry) => void;
}

// ── Audio detail ───────────────────────────────────────────────────────────────

function AudioDetail({ entry }: { entry: Entry }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else          { a.play().then(() => setPlaying(true)); }
  }

  const wf = entry.waveform ?? [];
  const dur = entry.duration_ms ? formatTime(entry.duration_ms) : '--:--';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 20px' }}>
      {/* Duration */}
      <div style={{ fontFamily: F.mono, fontSize: 11, color: C.paper400, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        {dur}
      </div>

      {/* Title */}
      <div style={{ fontFamily: F.display, fontStyle: 'italic', fontSize: 28, color: C.paper900, marginTop: 10, lineHeight: 1.2, letterSpacing: '-0.01em' }}>
        {entry.title ?? 'Untitled recording'}
      </div>

      {/* Waveform */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 2,
        height: 80, margin: '28px 0', flexShrink: 0,
      }}>
        {wf.slice(0, 80).map((p, i) => (
          <div key={i} style={{
            flex: 1, height: `${Math.max(8, p * 100)}%`,
            background: C.audio, borderRadius: 1, opacity: 0.8,
          }} />
        ))}
      </div>

      {/* Play button */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        <div
          onClick={toggle}
          style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 30%, oklch(80% 0.16 250), oklch(60% 0.16 250))',
            boxShadow: `0 0 0 4px rgba(28,25,36,0.6), 0 0 0 5px ${C.audio}, 0 0 24px 4px ${C.audioGlow}`,
            display: 'grid', placeItems: 'center',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 20, color: C.paper900 }}>{playing ? '⏸' : '▶'}</span>
        </div>
      </div>

      {entry.media_path && (
        <audio ref={audioRef} src={`/api/media/${entry.media_path.split('/').pop()}`} onEnded={() => setPlaying(false)} />
      )}

      {/* Transcript */}
      {entry.transcript && (
        <div style={{
          flex: 1, overflowY: 'auto',
          fontFamily: F.ui, fontSize: 14, color: C.paper700, lineHeight: 1.65,
          borderTop: `1px solid ${C.ink300}`, paddingTop: 16,
        }}>
          {entry.transcript}
        </div>
      )}
    </div>
  );
}

// ── Photo detail ───────────────────────────────────────────────────────────────

function PhotoDetail({ entry, siblings }: { entry: Entry; siblings: Entry[] }) {
  const photos = siblings.filter(s => s.type === 'photo' && s.media_path);
  const idx    = photos.findIndex(p => p.id === entry.id);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {/* Full-bleed photo */}
      {entry.media_path ? (
        <img
          src={`/api/media/${entry.media_path.split('/').pop()}`}
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(160deg, #382c1c, #1a1410, #0a0808)` }} />
      )}

      {/* Top gradient for legibility */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(7,6,10,0.55) 0%, transparent 22%, transparent 60%, rgba(7,6,10,0.92) 100%)', pointerEvents: 'none' }} />

      {/* Frame counter */}
      {photos.length > 1 && (
        <div style={{
          position: 'absolute', top: 48, right: 16, zIndex: 6,
          fontFamily: F.mono, fontSize: 10, color: C.paper700,
          background: 'rgba(7,6,10,0.6)', padding: '4px 9px', borderRadius: 100, border: `1px solid ${C.ink300}`,
          letterSpacing: '0.06em',
        }}>
          {idx + 1} of {photos.length}
        </div>
      )}

      {/* Metadata bottom */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '20px 18px 44px', zIndex: 6 }}>
        {entry.place_name && (
          <div style={{ fontFamily: F.mono, fontSize: 9, color: C.paper400, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            // {entry.place_name}
          </div>
        )}
        {entry.title && (
          <div style={{ fontFamily: F.display, fontStyle: 'italic', fontSize: 24, color: C.paper900, marginTop: 6, letterSpacing: '-0.005em' }}>
            "{entry.title}"
          </div>
        )}
        <div style={{ fontFamily: F.mono, fontSize: 10, color: C.paper500, letterSpacing: '0.06em', marginTop: 6 }}>
          {new Date(entry.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })}
          {entry.weather?.temp != null ? ` · ${Math.round(entry.weather.temp)}°C` : ''}
          {entry.weather?.condition ? ` ${entry.weather.condition}` : ''}
        </div>

        {/* Filmstrip of session siblings */}
        {photos.length > 1 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(photos.length, 12)}, 1fr)`,
            gap: 3, marginTop: 14, height: 38,
          }}>
            {photos.slice(0, 12).map((p, i) => (
              <div key={p.id} style={{
                background: `linear-gradient(135deg, #382c1c, #1a1410)`,
                border: `1px solid ${i === idx ? C.paper400 : C.ink300}`,
                opacity: i === idx ? 1 : 0.55,
                overflow: 'hidden',
                position: 'relative',
              }}>
                {p.media_thumb && (
                  <img src={`/api/media/${p.media_thumb}`} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Moment detail ──────────────────────────────────────────────────────────────

function MomentDetail({ entry, nowPlaying }: { entry: Entry; nowPlaying: { title: string; artist: string } | null }) {
  const hasMusic = entry.music_title || nowPlaying;
  const track    = entry.music_title ?? nowPlaying?.title;
  const artist   = entry.music_artist ?? nowPlaying?.artist;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 20px', gap: 20 }}>
      {/* Place */}
      <div>
        {entry.place_name && (
          <div style={{ fontFamily: F.mono, fontSize: 9, color: C.paper400, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            // {entry.place_name}
          </div>
        )}
        <div style={{ fontFamily: F.display, fontStyle: 'italic', fontSize: 28, color: C.paper900, marginTop: 6, lineHeight: 1.2 }}>
          {entry.title ?? 'A moment'}
        </div>
        <div style={{ fontFamily: F.mono, fontSize: 10, color: C.paper500, marginTop: 8, letterSpacing: '0.06em' }}>
          {new Date(entry.created_at).toLocaleString('en-US', { weekday: 'short', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
        </div>
      </div>

      {/* Weather */}
      {entry.weather && (
        <div style={{
          background: C.ink100, border: `1px solid ${C.ink300}`, borderRadius: 12,
          padding: '12px 16px',
          fontFamily: F.mono, fontSize: 11, color: C.paper500,
        }}>
          {entry.weather.condition ?? ''} {entry.weather.temp != null ? `${Math.round(entry.weather.temp)}°C` : ''}
        </div>
      )}

      {/* Music card */}
      {hasMusic && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: C.ink100, border: `1px solid ${C.ink300}`, borderRadius: 12,
          padding: '12px 16px',
        }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.ember, boxShadow: `0 0 8px ${C.ember}`, flexShrink: 0 }} />
          <div>
            <div style={{ fontFamily: F.ui, fontSize: 13, color: C.paper900 }}>{track}</div>
            {artist && <div style={{ fontFamily: F.mono, fontSize: 10, color: C.paper500, marginTop: 2 }}>{artist}</div>}
          </div>
        </div>
      )}

      {/* Body text */}
      {entry.body && (
        <div style={{ fontFamily: F.ui, fontSize: 15, color: C.paper700, lineHeight: 1.6 }}>
          {entry.body}
        </div>
      )}
    </div>
  );
}

// ── Note detail ────────────────────────────────────────────────────────────────

function NoteDetail({ entry }: { entry: Entry }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 20px' }}>
      {/* Large body in Instrument Serif */}
      <div style={{
        flex: 1,
        fontFamily: F.display, fontStyle: 'italic',
        fontSize: 28, color: C.paper900, lineHeight: 1.4,
        letterSpacing: '-0.01em',
      }}>
        {entry.body ?? entry.title ?? ''}
      </div>

      {/* Footer metadata */}
      <div style={{
        borderTop: `1px solid ${C.ink300}`, paddingTop: 16, marginTop: 16,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          {entry.place_name && (
            <div style={{ fontFamily: F.mono, fontSize: 9, color: C.paper400, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              {entry.place_name}
            </div>
          )}
          <div style={{ fontFamily: F.mono, fontSize: 10, color: C.paper500, marginTop: 4 }}>
            {new Date(entry.created_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            {entry.weather?.temp != null ? ` · ${Math.round(entry.weather.temp)}°C` : ''}
          </div>
        </div>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.note, boxShadow: `0 0 8px ${C.noteGlow}` }} />
      </div>
    </div>
  );
}

// ── Main EntryDetail ───────────────────────────────────────────────────────────

export function EntryDetail({ entry, entries, nowPlaying, onClose, onSelectEntry }: Props) {
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  // Find adjacent entries (same type or all)
  const siblings  = entries; // full list, navigate within it
  const currIdx   = siblings.findIndex(e => e.id === entry.id);
  const prevEntry = currIdx > 0 ? siblings[currIdx - 1] : null;
  const nextEntry = currIdx < siblings.length - 1 ? siblings[currIdx + 1] : null;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(dx) < Math.abs(dy)) return; // vertical scroll, ignore
    if (Math.abs(dx) < 50) return; // not a swipe

    if (dx > 0 && nextEntry) { onSelectEntry(nextEntry); } // swipe left → next
    if (dx < 0 && prevEntry) { onSelectEntry(prevEntry); } // swipe right → prev
  }, [prevEntry, nextEntry, onSelectEntry]);

  const typeCol  = typeColor(entry.type);
  const isPhoto  = entry.type === 'photo';

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: C.ink000,
        zIndex: 45,
        display: 'flex', flexDirection: 'column',
        animation: 'detailIn 320ms cubic-bezier(0.32,0.72,0,1) forwards',
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <style>{`
        @keyframes detailIn {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>

      {/* Status bar area */}
      <div style={{ height: 44, flexShrink: 0 }} />

      {/* Header: close + type indicator */}
      <div style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '4px 16px 12px',
        position: isPhoto ? 'absolute' : 'relative',
        top: isPhoto ? 44 : undefined,
        left: isPhoto ? 0 : undefined, right: isPhoto ? 0 : undefined,
        zIndex: 6,
      }}>
        {/* Close */}
        <div
          onClick={onClose}
          style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(7,6,10,0.6)', border: `1px solid ${C.ink300}`,
            display: 'grid', placeItems: 'center',
            fontFamily: F.mono, fontSize: 13, color: C.paper700,
            cursor: 'pointer',
          }}
        >×</div>

        {/* Type chip */}
        <div style={{
          fontFamily: F.mono, fontSize: 9, color: typeCol,
          border: `1px solid ${typeCol}44`,
          background: `${typeCol}18`,
          borderRadius: 100, padding: '4px 10px',
          letterSpacing: '0.14em', textTransform: 'uppercase',
        }}>{entry.type}</div>
      </div>

      {/* Type-specific content */}
      {entry.type === 'audio'  && <AudioDetail entry={entry} />}
      {entry.type === 'photo'  && <PhotoDetail entry={entry} siblings={entries.filter(e => e.type === 'photo')} />}
      {entry.type === 'moment' && <MomentDetail entry={entry} nowPlaying={nowPlaying} />}
      {entry.type === 'note'   && <NoteDetail entry={entry} />}

      {/* Swipe navigation hint */}
      <div style={{
        flexShrink: 0,
        display: 'flex', justifyContent: 'space-between',
        padding: '8px 20px 32px',
        position: isPhoto ? 'absolute' : 'relative',
        bottom: isPhoto ? 0 : undefined,
        left: isPhoto ? 0 : undefined, right: isPhoto ? 0 : undefined,
      }}>
        {prevEntry ? (
          <div
            onClick={() => onSelectEntry(prevEntry)}
            style={{ fontFamily: F.mono, fontSize: 9, color: C.paper400, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}
          >← newer</div>
        ) : <div />}

        {nextEntry ? (
          <div
            onClick={() => onSelectEntry(nextEntry)}
            style={{ fontFamily: F.mono, fontSize: 9, color: C.paper400, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}
          >older →</div>
        ) : <div />}
      </div>

      {/* Home indicator */}
      <div style={{
        position: 'absolute', bottom: 7, left: '50%', transform: 'translateX(-50%)',
        width: 100, height: 4, background: 'rgba(243,236,224,0.35)', borderRadius: 4,
        pointerEvents: 'none',
      }} />
    </div>
  );
}
