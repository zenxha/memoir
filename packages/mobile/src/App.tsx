import React, { useState, useEffect, useCallback } from 'react';
import { Entry } from '@memoir/contract';
import { api, createWsClient } from './api/client';
import { useGPS } from './hooks/useGPS';
import { useBackend } from './hooks/useBackend';
import { useLocationHeartbeat } from './hooks/useLocationHeartbeat';
import { C } from './design';

import { MapSurface }       from './components/MapSurface';
import { DynamicIsland }    from './components/DynamicIsland';
import { BrowseSheet, AppMode } from './components/BrowseSheet';
import { RecordingSheet }   from './components/RecordingSheet';
import { NoteSheet }        from './components/NoteSheet';
import { SearchSheet }      from './components/SearchSheet';
import { EntryDetail }      from './components/EntryDetail';

export function App() {
  const position = useGPS();
  const online   = useBackend();
  useLocationHeartbeat(position, online);

  const [mode, setMode]               = useState<AppMode>('home');
  const [entries, setEntries]         = useState<Entry[]>([]);
  const [selectedEntry, setSelected]  = useState<Entry | null>(null);
  const [nowPlaying, setNowPlaying]   = useState<{ title: string; artist: string } | null>(null);
  const [recordElapsed, setElapsed]   = useState(0);
  const [browseFilter, setFilter]     = useState('all');

  // ── Load initial entries ─────────────────────────────────────────────────────
  useEffect(() => {
    api.entries.list({ query: { limit: 300 } }).then(res => {
      if (res.status === 200) setEntries(res.body);
    });
  }, []);

  // ── Now Playing polling ──────────────────────────────────────────────────────
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await api.music.nowPlaying({ query: {} });
        if (res.status === 200) setNowPlaying(res.body);
      } catch { /* offline, ignore */ }
    };
    poll();
    const id = setInterval(poll, 30_000);
    return () => clearInterval(id);
  }, []);

  // ── WebSocket live updates ───────────────────────────────────────────────────
  useEffect(() => {
    const ws = createWsClient(msg => {
      if (msg.type === 'entry:new')    setEntries(p => [msg.payload, ...p]);
      if (msg.type === 'entry:updated') setEntries(p => p.map(e => e.id === msg.payload.id ? msg.payload : e));
      if (msg.type === 'entry:deleted') setEntries(p => p.filter(e => e.id !== msg.payload.id));
      if (msg.type === 'music:nowplaying') setNowPlaying(msg.payload);
    });
    return () => ws.close();
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const addEntry = useCallback((entry: Entry) => setEntries(prev => [entry, ...prev]), []);

  // Place name: use the most recent entry (within last 2h) that has a place_name
  const recentWithPlace = entries.find(e =>
    e.place_name && (Date.now() - e.created_at) < 2 * 3_600_000,
  );
  const placeName = recentWithPlace?.place_name ?? null;

  // Map opacity dims for capture/detail overlays
  const mapOpacity =
    mode === 'detail'    ? 0    :
    mode === 'recording' ? 0.30 :
    mode === 'note'      ? 0.25 :
    mode === 'search'    ? 0.40 : 1;

  // ── Navigate to detail ───────────────────────────────────────────────────────
  const openEntry = useCallback((e: Entry) => {
    setSelected(e);
    setMode('detail');
  }, []);

  const closeDetail = useCallback(() => {
    setMode('browse');
    setSelected(null);
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: C.ink000,
      overflow: 'hidden',
      touchAction: 'pan-y',
    }}>
      {/* Layer 1 — Mapbox surface */}
      <MapSurface
        entries={entries}
        position={position}
        opacity={mapOpacity}
        onEntryClick={openEntry}
      />

      {/* Layer 2 — Dynamic island */}
      <DynamicIsland
        nowPlaying={nowPlaying}
        recording={mode === 'recording'}
        elapsed={recordElapsed}
      />

      {/* Layer 3 — Browse sheet (always mounted, slides up/down) */}
      <BrowseSheet
        mode={mode}
        entries={entries}
        placeName={placeName}
        nowPlaying={nowPlaying}
        filter={browseFilter}
        position={position}
        online={online}
        onFilterChange={setFilter}
        onOpen={()    => setMode('browse')}
        onClose={()   => setMode('home')}
        onRecord={()  => setMode('recording')}
        onNote={()    => setMode('note')}
        onSearch={()  => setMode('search')}
        onSelectEntry={openEntry}
        onSave={addEntry}
      />

      {/* Layer 4 — Recording sheet */}
      {mode === 'recording' && (
        <RecordingSheet
          position={position}
          placeName={placeName}
          onElapsed={setElapsed}
          onSave={e  => { addEntry(e); setMode('home'); setElapsed(0); }}
          onCancel={() => { setMode('home'); setElapsed(0); }}
        />
      )}

      {/* Layer 5 — Note sheet */}
      {mode === 'note' && (
        <NoteSheet
          position={position}
          placeName={placeName}
          nowPlaying={nowPlaying}
          onSave={e  => { addEntry(e); setMode('home'); }}
          onCancel={() => setMode('home')}
        />
      )}

      {/* Layer 6 — Search sheet */}
      {mode === 'search' && (
        <SearchSheet
          entries={entries}
          onSelectEntry={openEntry}
          onClose={() => setMode('browse')}
        />
      )}

      {/* Layer 7 — Entry detail (full-screen) */}
      {mode === 'detail' && selectedEntry && (
        <EntryDetail
          entry={selectedEntry}
          entries={entries}
          nowPlaying={nowPlaying}
          onClose={closeDetail}
          onSelectEntry={e => { setSelected(e); }}
        />
      )}
    </div>
  );
}
