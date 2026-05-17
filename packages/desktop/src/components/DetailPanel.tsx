import React from 'react';
import { Paper, Stack, Group, Text, ActionIcon, Badge, ScrollArea } from '@mantine/core';
import { Entry } from '@memoir/contract';

interface Props {
  entry: Entry;
  onClose: () => void;
}

export function DetailPanel({ entry, onClose }: Props) {
  const label = entry.title ?? entry.place_name ?? entry.type;
  const meta = [
    new Date(entry.created_at).toLocaleString(),
    entry.place_name,
    entry.music_title ? `♪ ${entry.music_title}${entry.music_artist ? ` — ${entry.music_artist}` : ''}` : null,
    entry.weather ? `${entry.weather.temp}°C · ${entry.weather.condition}` : null,
  ].filter(Boolean);

  return (
    <Paper
      radius="md"
      shadow="xl"
      p="lg"
      style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        width: 'min(560px, calc(100vw - 340px))',
        background: '#111', border: '1px solid #1e1e1e', zIndex: 100,
      }}
    >
      <Group justify="space-between" mb="xs">
        <Text fw={600} size="md">{label}</Text>
        <ActionIcon variant="subtle" color="gray" onClick={onClose}>✕</ActionIcon>
      </Group>

      <Text size="xs" c="dimmed" mb="sm">{meta.join('  ·  ')}</Text>

      {entry.body && <Text size="sm" mb="sm" style={{ lineHeight: 1.6 }}>{entry.body}</Text>}

      {entry.type === 'audio' && entry.media_path && (
        <audio controls style={{ width: '100%', marginBottom: 8 }}
          src={`/api/media/${entry.media_path.replace('media/', '')}`} />
      )}

      {entry.type === 'photo' && entry.media_thumb && (
        <img
          src={`/api/media/${entry.media_thumb.replace('media/', '')}`}
          style={{ width: '100%', borderRadius: 8, objectFit: 'cover' }}
          loading="lazy"
        />
      )}

      {entry.transcript && (
        <ScrollArea h={100} mt="sm">
          <Text size="xs" c="dimmed" style={{ lineHeight: 1.6 }}>{entry.transcript}</Text>
        </ScrollArea>
      )}

      {entry.tags.length > 0 && (
        <Group gap={4} mt="sm">
          {entry.tags.map(t => <Badge key={t} size="xs" variant="outline">{t}</Badge>)}
        </Group>
      )}
    </Paper>
  );
}
