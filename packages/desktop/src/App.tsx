import React, { useEffect, useState, useCallback } from 'react';
import { Box, AppShell } from '@mantine/core';
import { Entry, PhotoSession } from '@memoir/contract';
import { api, createWsClient, WsMessage } from './api/client';
import { Sidebar } from './components/Sidebar';
import { EntryDetail } from './components/EntryDetail';
import { ChromeFader } from './components/ChromeFader';
import { RollSurface } from './components/RollSurface';
import { SurfaceSwitcher, Surface } from './components/SurfaceSwitcher';
import { CommandPalette, spotlight } from './components/CommandPalette';
import { MapCanvas } from './globe/MapCanvas';

export function App() {
  const [entries, setEntries]   = useState<Entry[]>([]);
  const [sessions, setSessions] = useState<PhotoSession[]>([]);
  const [selected, setSelected] = useState<Entry | null>(null);
  const [wsOnline, setWsOnline] = useState(false);
  const [filter, setFilter]     = useState<string>('all');
  const [surface, setSurface]   = useState<Surface>('atlas');
  const [newEntry, setNewEntry] = useState<Entry | null>(null);

  const loadEntries = useCallback(async (type = filter) => {
    const res = await api.entries.list({ query: { limit: 1000, ...(type !== 'all' ? { type } : {}) } });
    if (res.status === 200) setEntries(res.body);
  }, [filter]);

  const loadSessions = useCallback(async () => {
    const res = await api.sessions.list({ query: {} });
    if (res.status === 200) setSessions(res.body);
  }, []);

  useEffect(() => { loadEntries(); loadSessions(); }, [loadEntries, loadSessions]);

  useEffect(() => {
    const handleWs = (msg: WsMessage) => {
      if (msg.type === 'entry:new')     { setEntries(p => [msg.payload, ...p]); loadSessions(); setNewEntry(msg.payload); }
      if (msg.type === 'entry:updated') setEntries(p => p.map(e => e.id === msg.payload.id ? msg.payload : e));
      if (msg.type === 'entry:deleted') setEntries(p => p.filter(e => e.id !== msg.payload.id));
    };
    const open  = () => setWsOnline(true);
    const close = () => setWsOnline(false);
    document.addEventListener('ws:open',  open);
    document.addEventListener('ws:close', close);
    createWsClient(handleWs);
    return () => {
      document.removeEventListener('ws:open', open);
      document.removeEventListener('ws:close', close);
    };
  }, []);

  // Open ⌘K on slash key too
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        spotlight.open();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleFilter = (type: string) => { setFilter(type); loadEntries(type); };

  return (
    <AppShell layout="default" style={{ height: '100vh', background: 'var(--ink-000)' }}>
      <CommandPalette entries={entries} onSurface={setSurface} onEntry={setSelected} />

      <style>{`
        .surface-fade { animation: sfade 300ms ease both; }
        @keyframes sfade { from { opacity: 0 } to { opacity: 1 } }
      `}</style>

      {surface === 'roll' ? (
        <div key="roll" className="surface-fade" style={{ position: 'absolute', inset: 0 }}>
          <RollSurface
            entries={entries}
            sessions={sessions}
            surface={surface}
            onSurface={setSurface}
            onEntryClick={setSelected}
          />
        </div>
      ) : (
        <Box key="globe" className="surface-fade" style={{ display: 'flex', height: '100vh', overflow: 'hidden', position: 'relative' }}>
          <Box style={{ flex: 1, position: 'relative' }}>
            <MapCanvas
              entries={entries}
              onEntryClick={setSelected}
              onModeChange={() => {}}
              newEntry={newEntry}
            />
          </Box>

          {/* Surface switcher — floats top-center over the globe */}
          <div style={{
            position: 'absolute', top: 20, left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
          }}>
            <SurfaceSwitcher current={surface} onChange={setSurface} />
          </div>

          {surface === 'atlas' && (
            <ChromeFader>
              <Sidebar
                entries={entries}
                sessions={sessions}
                wsOnline={wsOnline}
                filter={filter}
                onFilter={handleFilter}
                onEntryClick={setSelected}
              />
            </ChromeFader>
          )}
        </Box>
      )}

      {selected && <EntryDetail entry={selected} onClose={() => setSelected(null)} />}
    </AppShell>
  );
}
