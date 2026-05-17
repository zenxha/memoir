import React, { useRef } from 'react';
import { Group, Button, TextInput, Stack, Text } from '@mantine/core';
import { Entry } from '@memoir/contract';
import { api } from '../api/client';
import { Position } from '../hooks/useGPS';
import { useOfflineQueue } from '../hooks/useOfflineQueue';

interface Props {
  position: Position | null;
  onRecord: () => void;
  onSave: (entry: Entry) => void;
}

export function CaptureBar({ position, onRecord, onSave }: Props) {
  const photoRef  = useRef<HTMLInputElement>(null);
  const musicRef  = useRef<HTMLInputElement>(null);
  const { enqueue } = useOfflineQueue(onSave);

  const pos = position ? { lat: position.lat, lng: position.lng, accuracy: position.accuracy, altitude: position.altitude ?? undefined } : {};

  async function capture(type: 'moment' | 'photo', extra: Record<string, unknown> = {}, blob?: Blob, blobName?: string) {
    const body = { type, ...pos, ...extra } as Parameters<typeof api.entries.create>[0]['body'];
    try {
      const res = await api.entries.create({ body });
      if (res.status !== 201) throw new Error('server error');
      const entry = res.body;
      if (blob && blobName) {
        const fd = new FormData();
        fd.append('entryId', entry.id);
        fd.append('file', blob, blobName);
        await fetch('/api/media/upload', { method: 'POST', body: fd });
      }
      onSave(entry);
    } catch {
      enqueue({ body, blob, blobName });
    }
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    capture('photo', {}, file, file.name);
    e.target.value = '';
  }

  function handleMusicTag() {
    const val = musicRef.current?.value.trim();
    if (!val) return;
    const [artist, ...rest] = val.split(' - ');
    const title = rest.join(' - ') || artist;
    const music_artist = rest.length ? artist : undefined;
    capture('moment', { music_title: title, music_artist });
    if (musicRef.current) musicRef.current.value = '';
  }

  return (
    <Stack gap="xs" p="md" style={{ borderBottom: '1px solid #1e1e1e' }}>
      <Group gap="xs">
        <Button flex={1} variant="default" size="sm" onClick={() => capture('moment')}>Moment</Button>
        <Button flex={1} variant="default" size="sm" onClick={onRecord}>Audio</Button>
        <Button flex={1} variant="default" size="sm" onClick={() => photoRef.current?.click()}>Photo</Button>
        <input ref={photoRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhoto} />
      </Group>

      {position && (
        <Text size="xs" c="dimmed">{position.lat.toFixed(5)}, {position.lng.toFixed(5)}</Text>
      )}

      <Group gap="xs">
        <TextInput ref={musicRef} flex={1} size="xs" placeholder="♪ Artist - Track" />
        <Button size="xs" variant="light" onClick={handleMusicTag}>Tag</Button>
      </Group>
    </Stack>
  );
}
