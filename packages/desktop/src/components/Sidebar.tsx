import React from 'react';
import { Stack, Group, Text, Badge, ScrollArea, UnstyledButton, Box, Indicator } from '@mantine/core';
import { Entry } from '@memoir/contract';

const TYPE_COLORS: Record<string, string> = {
  audio: 'blue', photo: 'orange', moment: 'teal', note: 'violet',
};

const FILTERS = ['all', 'audio', 'photo', 'moment', 'note'] as const;

interface Props {
  entries: Entry[];
  wsOnline: boolean;
  filter: string;
  onFilter: (type: string) => void;
  onEntryClick: (entry: Entry) => void;
}

export function Sidebar({ entries, wsOnline, filter, onFilter, onEntryClick }: Props) {
  return (
    <Stack
      gap={0}
      style={{ width: 300, minWidth: 300, borderLeft: '1px solid #1e1e1e', background: '#111', height: '100vh' }}
    >
      {/* Header */}
      <Group px="md" py="sm" justify="space-between" style={{ borderBottom: '1px solid #1e1e1e' }}>
        <Text fw={600} size="sm" style={{ letterSpacing: '0.04em' }}>memoir</Text>
        <Indicator color={wsOnline ? 'teal' : 'red'} size={8} processing={wsOnline}>
          <Box w={8} h={8} />
        </Indicator>
      </Group>

      {/* Filters */}
      <Group gap={4} px="sm" py="xs" style={{ borderBottom: '1px solid #1e1e1e', flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <Badge
            key={f}
            variant={filter === f ? 'filled' : 'outline'}
            color={filter === f && f !== 'all' ? TYPE_COLORS[f] : filter === f ? 'blue' : 'gray'}
            size="sm"
            style={{ cursor: 'pointer', textTransform: 'capitalize' }}
            onClick={() => onFilter(f)}
          >
            {f}
          </Badge>
        ))}
      </Group>

      {/* Entry list */}
      <ScrollArea flex={1}>
        {entries.map(entry => (
          <EntryRow key={entry.id} entry={entry} onClick={() => onEntryClick(entry)} />
        ))}
      </ScrollArea>
    </Stack>
  );
}

function EntryRow({ entry, onClick }: { entry: Entry; onClick: () => void }) {
  const label = entry.title ?? entry.place_name ?? entry.type;
  const sub = [
    entry.place_name,
    entry.music_title ? `♪ ${entry.music_title}` : null,
    timeAgo(entry.created_at),
  ].filter(Boolean).join(' · ');

  return (
    <UnstyledButton
      onClick={onClick}
      w="100%"
      px="md"
      py="xs"
      style={{ borderBottom: '1px solid #1a1a1a', '&:hover': { background: '#181818' } }}
    >
      <Group gap="xs" align="flex-start" wrap="nowrap">
        <Box
          mt={4}
          style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: `var(--mantine-color-${TYPE_COLORS[entry.type] ?? 'gray'}-5)` }}
        />
        <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
          <Text size="sm" truncate>{label}</Text>
          <Text size="xs" c="dimmed" truncate>{sub}</Text>
          {entry.waveform && entry.type === 'audio' && <WaveformBar peaks={entry.waveform} />}
        </Stack>
      </Group>
    </UnstyledButton>
  );
}

function WaveformBar({ peaks }: { peaks: number[] }) {
  return (
    <Group gap={1} h={16} align="center" wrap="nowrap">
      {peaks.map((p, i) => (
        <Box
          key={i}
          style={{ width: 2, minHeight: 2, height: Math.max(2, Math.round(p * 16)), background: 'var(--mantine-color-blue-5)', borderRadius: 1 }}
        />
      ))}
    </Group>
  );
}

function timeAgo(ms: number) {
  const d = Date.now() - ms;
  if (d < 60000)    return 'just now';
  if (d < 3600000)  return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
}
