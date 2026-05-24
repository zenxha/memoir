import React, { useState, useMemo } from 'react';
import { Entry } from '@memoir/contract';
import { C, F, typeColor, typeGlow, timeAgo } from '../design';

interface Props {
  entries: Entry[];
  onSelectEntry: (e: Entry) => void;
  onClose: () => void;
}

function matchEntry(entry: Entry, q: string): boolean {
  const lq = q.toLowerCase();
  return (
    (entry.title?.toLowerCase().includes(lq) ?? false) ||
    (entry.body?.toLowerCase().includes(lq) ?? false) ||
    (entry.transcript?.toLowerCase().includes(lq) ?? false) ||
    (entry.place_name?.toLowerCase().includes(lq) ?? false) ||
    (entry.music_title?.toLowerCase().includes(lq) ?? false) ||
    (entry.tags?.some(t => t.toLowerCase().includes(lq)) ?? false)
  );
}

export function SearchSheet({ entries, onSelectEntry, onClose }: Props) {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return entries.filter(e => matchEntry(e, query.trim())).slice(0, 30);
  }, [entries, query]);

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: C.ink050,
      zIndex: 50,
      display: 'flex', flexDirection: 'column',
      animation: 'searchUp 320ms cubic-bezier(0.32,0.72,0,1) forwards',
    }}>
      <style>{`
        @keyframes searchUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>

      {/* Search input area */}
      <div style={{
        flexShrink: 0,
        padding: '54px 20px 12px', // top: below island
        borderBottom: `1px solid ${C.ink300}`,
        display: 'flex', gap: 12, alignItems: 'center',
      }}>
        <div style={{
          flex: 1,
          display: 'flex', gap: 10, alignItems: 'center',
          border: `1px solid ${C.ink300}`,
          borderRadius: 100,
          background: C.ink100,
          padding: '10px 16px',
        }}>
          <span style={{ fontFamily: F.mono, fontSize: 13, color: C.paper400 }}>⌕</span>
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="search moments, places, tracks…"
            style={{
              flex: 1, border: 0, background: 'transparent',
              fontFamily: F.ui, fontSize: 15, color: C.paper900,
              outline: 'none',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{
                border: 0, background: 'transparent',
                fontFamily: F.mono, fontSize: 12, color: C.paper400,
                cursor: 'pointer', padding: 0,
              }}
            >×</button>
          )}
        </div>

        <button
          onClick={onClose}
          style={{
            border: 0, background: 'transparent',
            fontFamily: F.mono, fontSize: 10, color: C.paper500,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >done</button>
      </div>

      {/* Results */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 40px' }}>
        {query.trim() === '' && (
          <div style={{
            fontFamily: F.display, fontStyle: 'italic', fontSize: 18,
            color: C.paper400, textAlign: 'center', paddingTop: 48,
          }}>
            type to search the archive
          </div>
        )}

        {query.trim() !== '' && results.length === 0 && (
          <div style={{
            fontFamily: F.display, fontStyle: 'italic', fontSize: 18,
            color: C.paper400, textAlign: 'center', paddingTop: 48,
          }}>
            no results for "{query}"
          </div>
        )}

        {results.map(entry => {
          const col  = typeColor(entry.type);
          const glow = typeGlow(entry.type);
          return (
            <div
              key={entry.id}
              onClick={() => onSelectEntry(entry)}
              style={{
                display: 'grid', gridTemplateColumns: '14px 1fr auto',
                gap: 12, padding: '14px 0',
                borderBottom: `1px solid ${C.ink300}`,
                cursor: 'pointer',
              }}
            >
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: col, boxShadow: `0 0 6px ${glow}`,
                marginTop: 6,
              }} />
              <div>
                <div style={{ fontFamily: F.display, fontSize: 16, color: C.paper900 }}>
                  {entry.title ?? entry.place_name ?? entry.type}
                </div>
                {entry.place_name && (
                  <div style={{ fontFamily: F.mono, fontSize: 9, color: C.paper400, marginTop: 2, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {entry.place_name}
                  </div>
                )}
              </div>
              <div style={{ fontFamily: F.mono, fontSize: 9, color: C.paper400, alignSelf: 'center' }}>
                {timeAgo(entry.created_at)}
              </div>
            </div>
          );
        })}
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
