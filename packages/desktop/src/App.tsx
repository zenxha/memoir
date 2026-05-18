import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, AppShell } from '@mantine/core';
import { Entry, PhotoSession } from '@memoir/contract';
import { api, createWsClient, WsMessage } from './api/client';
import { Sidebar } from './components/Sidebar';
import { DetailPanel } from './components/DetailPanel';
import { ChromeFader } from './components/ChromeFader';
import { MapCanvas } from './globe/MapCanvas';

export function App() {
  const [entries, setEntries]       = useState<Entry[]>([]);
  const [sessions, setSessions]     = useState<PhotoSession[]>([]);
  const [selected, setSelected]     = useState<Entry | null>(null);
  const [wsOnline, setWsOnline]     = useState(false);
  const [filter, setFilter]         = useState<string>('all');
  const [mode, setMode]             = useState<'globe' | 'map'>('globe');

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
      if (msg.type === 'entry:new')     setEntries(p => [msg.payload, ...p]);
      if (msg.type === 'entry:updated') setEntries(p => p.map(e => e.id === msg.payload.id ? msg.payload : e));
      if (msg.type === 'entry:deleted') setEntries(p => p.filter(e => e.id !== msg.payload.id));
    };
    const open  = () => setWsOnline(true);
    const close = () => setWsOnline(false);
    document.addEventListener('ws:open',  open);
    document.addEventListener('ws:close', close);
    createWsClient(handleWs);
    return () => { document.removeEventListener('ws:open', open); document.removeEventListener('ws:close', close); };
  }, []);

  const handleFilter = (type: string) => {
    setFilter(type);
    loadEntries(type);
  };

  return (
    <AppShell layout="default" style={{ height: '100vh', background: '#080808' }}>
      <Box style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Box style={{ flex: 1, position: 'relative' }}>
          <MapCanvas
            entries={entries}
            onEntryClick={setSelected}
            onModeChange={setMode}
          />
        </Box>
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
      </Box>
      {selected && (
        <ChromeFader>
          <DetailPanel entry={selected} onClose={() => setSelected(null)} />
        </ChromeFader>
      )}
    </AppShell>
  );
}
