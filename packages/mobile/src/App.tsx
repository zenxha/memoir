import React, { useState, useEffect } from 'react';
import { Stack, Box } from '@mantine/core';
import { Entry } from '@memoir/contract';
import { api } from './api/client';
import { useGPS } from './hooks/useGPS';
import { useBackend } from './hooks/useBackend';
import { StatusBar } from './components/StatusBar';
import { CaptureBar } from './components/CaptureBar';
import { AudioRecorder } from './components/AudioRecorder';
import { RecentList } from './components/RecentList';

export function App() {
  const position = useGPS();
  const online   = useBackend();
  const [entries, setEntries]   = useState<Entry[]>([]);
  const [recMode, setRecMode]   = useState(false);

  useEffect(() => {
    api.entries.list({ query: { limit: 10 } }).then(res => {
      if (res.status === 200) setEntries(res.body);
    });
  }, []);

  const addEntry = (entry: Entry) => setEntries(prev => [entry, ...prev.slice(0, 9)]);

  return (
    <Box style={{ background: '#0a0a0a', minHeight: '100dvh', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <Stack gap={0}>
        <StatusBar online={online} position={position} />
        {recMode
          ? <AudioRecorder position={position} onSave={addEntry} onCancel={() => setRecMode(false)} />
          : <CaptureBar position={position} onRecord={() => setRecMode(true)} onSave={addEntry} />
        }
        <RecentList entries={entries} />
      </Stack>
    </Box>
  );
}
