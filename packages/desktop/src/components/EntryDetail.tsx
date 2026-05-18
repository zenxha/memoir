import React, { useEffect, useRef, useState } from 'react';
import { ScrollArea } from '@mantine/core';
import { Entry } from '@memoir/contract';

interface Props { entry: Entry; onClose: () => void; }

export function EntryDetail({ entry, onClose }: Props) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const color = `var(--${entry.type})`;
  const glow  = `var(--${entry.type}-glow)`;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'var(--ink-000)',
      animation: 'detail-in 300ms ease',
    }}>
      <style>{`@keyframes detail-in { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:none } }`}</style>

      {/* Top chrome */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 56, display: 'flex', alignItems: 'center',
        padding: '0 32px', justifyContent: 'space-between',
        borderBottom: '1px solid var(--ink-300)',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 10px ${glow}`, display: 'block', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--paper-400)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
            {entry.type}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--paper-300)', letterSpacing: '0.08em' }}>
            {new Date(entry.created_at).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </span>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: '1px solid var(--ink-400)',
          borderRadius: 4, color: 'var(--paper-500)',
          fontFamily: 'var(--font-mono)', fontSize: 11,
          padding: '4px 10px', cursor: 'pointer', letterSpacing: '0.08em',
        }}>
          ESC
        </button>
      </div>

      {/* Type-specific body */}
      <div style={{ position: 'absolute', inset: '56px 0 0 0', overflow: 'hidden' }}>
        {entry.type === 'note'   && <NoteView   entry={entry} />}
        {entry.type === 'audio'  && <AudioView  entry={entry} />}
        {entry.type === 'moment' && <MomentView entry={entry} />}
        {entry.type === 'photo'  && <PhotoView  entry={entry} />}
      </div>
    </div>
  );
}

// ── Note ──────────────────────────────────────────────────────────────────────

function NoteView({ entry }: { entry: Entry }) {
  return (
    <div style={{ height: '100%', display: 'grid', gridTemplateRows: '1fr auto', padding: '48px 80px 40px' }}>
      <ScrollArea style={{ flex: 1 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 56, lineHeight: 1.1, color: 'var(--paper-900)', letterSpacing: '-0.01em', margin: '0 0 32px', fontWeight: 400 }}>
          {entry.title ?? 'Untitled note'}
        </h1>
        {entry.body && (
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 26, lineHeight: 1.65, color: 'var(--paper-700)', margin: 0, maxWidth: 760, letterSpacing: '-0.005em' }}>
            {entry.body}
          </p>
        )}
      </ScrollArea>
      <MetaFooter entry={entry} />
    </div>
  );
}

// ── Audio ─────────────────────────────────────────────────────────────────────

function AudioView({ entry }: { entry: Entry }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const src = entry.media_path ? `/api/media/${entry.media_path.replace('media/', '')}` : null;

  const toggle = () => {
    if (!audioRef.current) return;
    playing ? audioRef.current.pause() : audioRef.current.play();
  };

  return (
    <div style={{ height: '100%', display: 'grid', gridTemplateColumns: '1fr 380px', gap: 0 }}>
      {/* Left: title + waveform + transcript */}
      <div style={{ padding: '44px 56px 40px', display: 'grid', gridTemplateRows: 'auto auto 1fr auto', gap: 28, overflow: 'hidden' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 52, lineHeight: 1, color: 'var(--paper-900)', margin: '0 0 8px', fontWeight: 400, letterSpacing: '-0.01em' }}>
            {entry.title ?? entry.place_name ?? 'Recording'}
          </h1>
          {entry.duration_ms && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--paper-400)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
              {formatDuration(entry.duration_ms)}
            </div>
          )}
        </div>

        {/* Waveform */}
        {entry.waveform && (
          <div
            onClick={(e) => {
              if (!audioRef.current || !entry.duration_ms) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const t = ((e.clientX - rect.left) / rect.width) * (audioRef.current.duration || 0);
              audioRef.current.currentTime = t;
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 3, height: 80, cursor: 'pointer', position: 'relative' }}
          >
            {entry.waveform.slice(0, 120).map((p, i) => {
              const played = i / entry.waveform!.length < progress;
              return (
                <div key={i} style={{
                  width: 4, borderRadius: 1, flexShrink: 0,
                  height: Math.max(3, Math.round(p * 80)),
                  background: 'var(--audio)',
                  opacity: played ? 0.9 : 0.3,
                  boxShadow: played ? '0 0 6px var(--audio-glow)' : 'none',
                  transition: 'opacity 80ms',
                }} />
              );
            })}
            {/* playhead */}
            <div style={{
              position: 'absolute', top: -6, bottom: -6,
              left: `${progress * 100}%`,
              width: 1, background: 'var(--ember)',
              boxShadow: '0 0 8px var(--ember)',
              pointerEvents: 'none',
            }} />
          </div>
        )}

        {/* Transcript */}
        {entry.transcript ? (
          <ScrollArea>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, lineHeight: 1.6, color: 'var(--paper-500)', margin: 0, letterSpacing: '-0.005em' }}>
              {entry.transcript}
            </p>
          </ScrollArea>
        ) : (
          <div style={{ color: 'var(--paper-300)', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em' }}>
            NO TRANSCRIPT
          </div>
        )}

        {/* Play button */}
        {src && (
          <div>
            <button onClick={toggle} style={{
              background: 'none', border: '1px solid var(--ink-400)',
              borderRadius: 100, padding: '10px 28px',
              fontFamily: 'var(--font-mono)', fontSize: 12,
              color: 'var(--paper-700)', cursor: 'pointer',
              letterSpacing: '0.12em', textTransform: 'uppercase',
            }}>
              {playing ? '⏸ pause' : '▶ play'}
            </button>
            <audio
              ref={audioRef} src={src}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => { setPlaying(false); setProgress(0); }}
              onTimeUpdate={() => {
                if (!audioRef.current?.duration) return;
                setProgress(audioRef.current.currentTime / audioRef.current.duration);
              }}
            />
          </div>
        )}
      </div>

      {/* Right: meta panels */}
      <div style={{ borderLeft: '1px solid var(--ink-300)', padding: '44px 32px', display: 'grid', gap: 16, alignContent: 'start' }}>
        {entry.place_name && <MetaPanel label="location" value={entry.place_name} />}
        {entry.weather && <MetaPanel label="weather" value={`${entry.weather.temp != null ? `${Math.round(entry.weather.temp)}°` : ''} ${entry.weather.condition ?? ''}`.trim()} />}
        {entry.music_title && <MetaPanel label="playing" value={entry.music_title} sub={entry.music_artist ?? undefined} />}
        {entry.tags.length > 0 && <TagsPanel tags={entry.tags} />}
      </div>
    </div>
  );
}

// ── Moment ────────────────────────────────────────────────────────────────────

function MomentView({ entry }: { entry: Entry }) {
  return (
    <div style={{ height: '100%', display: 'grid', gridTemplateColumns: '1fr 380px' }}>
      {/* Left: map placeholder + title */}
      <div style={{ padding: '44px 56px', display: 'grid', gridTemplateRows: 'auto 1fr', gap: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 52, lineHeight: 1.05, color: 'var(--paper-900)', margin: '0 0 8px', fontWeight: 400 }}>
            {entry.title ?? entry.place_name ?? 'Moment'}
          </h1>
          {entry.place_name && (
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--paper-500)' }}>{entry.place_name}</div>
          )}
        </div>
        {/* Cartographic placeholder — Mapbox mini-map would go here in a later pass */}
        {entry.lat != null && entry.lng != null ? (
          <div style={{
            background: 'var(--ink-100)', border: '1px solid var(--ink-300)',
            borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 8,
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--moment)', letterSpacing: '0.12em' }}>
              {entry.lat.toFixed(4)}, {entry.lng.toFixed(4)}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--paper-400)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
              map view · phase f
            </span>
          </div>
        ) : (
          <div style={{ background: 'var(--ink-100)', border: '1px solid var(--ink-300)', borderRadius: 4 }} />
        )}
        {entry.body && (
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, lineHeight: 1.6, color: 'var(--paper-700)', margin: 0 }}>
            {entry.body}
          </p>
        )}
      </div>

      {/* Right panels */}
      <div style={{ borderLeft: '1px solid var(--ink-300)', padding: '44px 32px', display: 'grid', gap: 16, alignContent: 'start' }}>
        {entry.weather && <MetaPanel label="weather" value={`${entry.weather.temp != null ? `${Math.round(entry.weather.temp)}°` : ''} ${entry.weather.condition ?? ''}`.trim()} />}
        {entry.music_title && <MusicCard title={entry.music_title} artist={entry.music_artist} />}
        {entry.tags.length > 0 && <TagsPanel tags={entry.tags} />}
      </div>
    </div>
  );
}

// ── Photo ─────────────────────────────────────────────────────────────────────

function PhotoView({ entry }: { entry: Entry }) {
  const src = entry.media_path ? `/api/media/${entry.media_path.replace('media/', '')}` : null;
  const thumb = entry.media_thumb ? `/api/media/${entry.media_thumb.replace('media/', '')}` : null;

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      {(src || thumb) ? (
        <img
          src={src ?? thumb ?? ''}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />
      ) : (
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ink-100)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--paper-400)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>no image</span>
        </div>
      )}
      {/* Corner metadata */}
      <div style={{
        position: 'absolute', bottom: 24, right: 24,
        fontFamily: 'var(--font-mono)', fontSize: 11,
        color: 'var(--paper-500)', letterSpacing: '0.08em',
        display: 'grid', gap: 4, textAlign: 'right',
        background: 'rgba(7,6,10,0.7)', padding: '10px 14px',
        backdropFilter: 'blur(8px)', borderRadius: 3,
        border: '1px solid var(--ink-300)',
      }}>
        {entry.place_name && <div>{entry.place_name}</div>}
        {entry.weather && <div>{entry.weather.temp != null ? `${Math.round(entry.weather.temp)}°` : ''} {entry.weather.condition}</div>}
        {entry.music_title && <div>♪ {entry.music_title}</div>}
      </div>
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function MetaFooter({ entry }: { entry: Entry }) {
  return (
    <div style={{ borderTop: '1px solid var(--ink-300)', paddingTop: 16, display: 'flex', gap: 28, flexWrap: 'wrap' }}>
      {entry.place_name && <Chip label="location" value={entry.place_name} />}
      {entry.weather && <Chip label="weather" value={`${entry.weather.temp != null ? `${Math.round(entry.weather.temp)}°` : ''} ${entry.weather.condition ?? ''}`.trim()} />}
      {entry.music_title && <Chip label="playing" value={entry.music_title} />}
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'grid', gap: 2 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--paper-400)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--paper-700)' }}>{value}</div>
    </div>
  );
}

function MetaPanel({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ border: '1px solid var(--ink-300)', background: 'rgba(28,25,36,0.4)', padding: '16px 18px', borderRadius: 2, display: 'grid', gap: 6 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--paper-400)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 22, color: 'var(--paper-900)', lineHeight: 1.15 }}>{value}</div>
      {sub && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--paper-500)' }}>{sub}</div>}
    </div>
  );
}

function MusicCard({ title, artist }: { title: string; artist: string | null }) {
  return (
    <div style={{ border: '1px solid var(--ink-300)', background: 'rgba(28,25,36,0.4)', padding: '16px 18px', borderRadius: 2, display: 'grid', gap: 6 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--paper-400)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>playing</div>
      <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 22, color: 'var(--paper-900)', lineHeight: 1.15 }}>{title}</div>
      {artist && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--paper-500)' }}>{artist}</div>}
    </div>
  );
}

function TagsPanel({ tags }: { tags: string[] }) {
  return (
    <div style={{ border: '1px solid var(--ink-300)', background: 'rgba(28,25,36,0.4)', padding: '14px 18px', borderRadius: 2, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {tags.map(t => (
        <span key={t} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--paper-500)', border: '1px solid var(--ink-400)', padding: '2px 8px', borderRadius: 100, letterSpacing: '0.08em' }}>
          {t}
        </span>
      ))}
    </div>
  );
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}
