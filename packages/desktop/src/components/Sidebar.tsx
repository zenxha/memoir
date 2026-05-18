import React, { useMemo } from 'react';
import { ScrollArea, UnstyledButton } from '@mantine/core';
import { Entry } from '@memoir/contract';

const TYPE_VAR: Record<string, string> = {
  audio:  'var(--audio)',
  photo:  'var(--photo)',
  moment: 'var(--moment)',
  note:   'var(--note)',
};
const TYPE_GLOW: Record<string, string> = {
  audio:  'var(--audio-glow)',
  photo:  'var(--photo-glow)',
  moment: 'var(--moment-glow)',
  note:   'var(--note-glow)',
};
const FILTERS = ['all', 'audio', 'photo', 'moment', 'note'] as const;

interface Props {
  entries:      Entry[];
  wsOnline:     boolean;
  filter:       string;
  onFilter:     (type: string) => void;
  onEntryClick: (entry: Entry) => void;
}

export function Sidebar({ entries, wsOnline, filter, onFilter, onEntryClick }: Props) {
  const grouped = useMemo(() => groupByDay(entries), [entries]);

  return (
    <div style={{
      width: 300, minWidth: 300, height: '100vh',
      background: 'var(--ink-050)',
      borderLeft: '1px solid var(--ink-300)',
      display: 'grid',
      gridTemplateRows: 'auto auto auto 1fr',
      overflow: 'hidden',
    }}>
      {/* Brand header */}
      <div style={{
        padding: '20px 28px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--ink-300)',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 22,
          color: 'var(--paper-900)',
          letterSpacing: '-0.005em',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{
            display: 'block', width: 6, height: 6, borderRadius: '50%',
            background: 'var(--ember)',
            boxShadow: '0 0 10px var(--ember)',
            flexShrink: 0,
          }} />
          memoir
        </div>
        {/* WS status dot */}
        <span style={{
          display: 'block', width: 7, height: 7, borderRadius: '50%',
          background: wsOnline ? 'var(--moment)' : 'var(--note)',
          boxShadow: wsOnline ? '0 0 8px var(--moment-glow)' : 'none',
          flexShrink: 0,
        }} />
      </div>

      {/* Search / ⌘K trigger */}
      <div style={{ padding: '14px 28px', borderBottom: '1px solid var(--ink-300)' }}>
        <div style={{
          border: '1px solid var(--ink-300)',
          borderRadius: 6,
          padding: '9px 12px',
          display: 'flex', alignItems: 'center', gap: 10,
          color: 'var(--paper-500)',
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          cursor: 'pointer',
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.2" />
            <line x1="7.8" y1="7.8" x2="11" y2="11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <span style={{ flex: 1 }}>search moments</span>
          <span style={{
            color: 'var(--paper-400)',
            border: '1px solid var(--ink-400)',
            padding: '1px 5px',
            borderRadius: 3,
            fontSize: 10,
          }}>⌘K</span>
        </div>
      </div>

      {/* Type filter chips */}
      <div style={{
        padding: '10px 28px',
        display: 'flex', gap: 6, flexWrap: 'wrap',
        borderBottom: '1px solid var(--ink-300)',
      }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => onFilter(f)} style={{
            background: filter === f ? 'rgba(255,255,255,0.04)' : 'transparent',
            border: `1px solid ${filter === f ? 'var(--paper-400)' : 'var(--ink-400)'}`,
            borderRadius: 100,
            padding: '4px 10px',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: filter === f ? 'var(--paper-900)' : 'var(--paper-500)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {f !== 'all' && (
              <span style={{
                display: 'inline-block', width: 5, height: 5, borderRadius: '50%',
                background: TYPE_VAR[f],
                boxShadow: filter === f ? `0 0 6px ${TYPE_GLOW[f]}` : 'none',
                flexShrink: 0,
              }} />
            )}
            {f}
          </button>
        ))}
      </div>

      {/* Scrollable day-grouped list */}
      <ScrollArea style={{ flex: 1 }}>
        <div style={{ padding: '20px 28px', display: 'grid', gap: 28 }}>
          {grouped.length === 0 && (
            <div style={{
              fontFamily: 'var(--font-display)', fontStyle: 'italic',
              color: 'var(--paper-400)', fontSize: 16, textAlign: 'center',
              paddingTop: 40,
            }}>
              no moments yet
            </div>
          )}
          {grouped.map(([day, dayEntries]) => (
            <DayGroup
              key={day}
              day={day}
              entries={dayEntries}
              onEntryClick={onEntryClick}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function DayGroup({ day, entries, onEntryClick }: {
  day: string; entries: Entry[]; onEntryClick: (e: Entry) => void;
}) {
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* Day header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        paddingBottom: 6,
        borderBottom: '1px solid var(--ink-300)',
      }}>
        <span style={{
          fontFamily: 'var(--font-display)', fontStyle: 'italic',
          fontSize: 20, color: 'var(--paper-900)',
        }}>{day}</span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          color: 'var(--paper-400)',
          letterSpacing: '0.16em', textTransform: 'uppercase',
        }}>
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>
      {/* Tiles */}
      {entries.map(entry => (
        <EntryTile key={entry.id} entry={entry} onClick={() => onEntryClick(entry)} />
      ))}
    </div>
  );
}

function EntryTile({ entry, onClick }: { entry: Entry; onClick: () => void }) {
  const title = entry.title ?? entry.place_name ?? entry.type;
  const color = TYPE_VAR[entry.type] ?? 'var(--paper-500)';
  const glow  = TYPE_GLOW[entry.type] ?? 'transparent';

  return (
    <UnstyledButton onClick={onClick} w="100%" style={{ textAlign: 'left' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr', gap: 14, alignItems: 'start', padding: '2px 0' }}>
        {/* Stamp column */}
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: 'var(--paper-500)', letterSpacing: '0.06em',
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          <span style={{
            display: 'block', width: 6, height: 6, borderRadius: '50%',
            background: color, boxShadow: `0 0 8px ${glow}`,
            flexShrink: 0,
          }} />
          {formatTime(entry.created_at)}
        </div>

        {/* Content column */}
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 16, lineHeight: 1.25,
            color: 'var(--paper-900)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {title}
          </div>
          {entry.place_name && (
            <div style={{
              fontFamily: 'var(--font-ui)', fontSize: 12,
              color: 'var(--paper-500)', marginTop: 2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {entry.place_name}
            </div>
          )}
          {entry.music_title && (
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 10,
              color: 'var(--paper-400)', marginTop: 3,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              ♪ {entry.music_title}
            </div>
          )}
          {entry.type === 'audio' && entry.waveform && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 14, marginTop: 6 }}>
              {entry.waveform.slice(0, 40).map((p, i) => (
                <div key={i} style={{
                  width: 2, borderRadius: 1, flexShrink: 0,
                  height: Math.max(2, Math.round(p * 14)),
                  background: color,
                }} />
              ))}
            </div>
          )}
        </div>
      </div>
    </UnstyledButton>
  );
}

function groupByDay(entries: Entry[]): [string, Entry[]][] {
  const map = new Map<string, Entry[]>();
  for (const e of entries) {
    const key = new Date(e.created_at).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return [...map.entries()];
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).toLowerCase();
}
