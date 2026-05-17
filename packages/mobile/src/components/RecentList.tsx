import React from 'react';
import { Stack, Group, Text, Box } from '@mantine/core';
import { Entry } from '@memoir/contract';

const TYPE_COLORS: Record<string, string> = {
  audio: 'var(--mantine-color-blue-5)',
  photo: 'var(--mantine-color-orange-5)',
  moment: 'var(--mantine-color-teal-5)',
  note: 'var(--mantine-color-violet-5)',
};

interface Props { entries: Entry[] }

export function RecentList({ entries }: Props) {
  if (!entries.length) return null;
  return (
    <Stack gap={0} px="md" pt="sm">
      <Text size="xs" c="dimmed" tt="uppercase" fw={500} mb="xs" style={{ letterSpacing: '0.06em' }}>Recent</Text>
      {entries.slice(0, 10).map(entry => (
        <Group key={entry.id} justify="space-between" py="xs" style={{ borderBottom: '1px solid #1a1a1a' }}>
          <Group gap="xs">
            <Box style={{ width: 7, height: 7, borderRadius: '50%', background: TYPE_COLORS[entry.type] ?? '#555' }} />
            <Text size="sm" truncate maw={180}>{entry.title ?? entry.place_name ?? entry.type}</Text>
          </Group>
          <Text size="xs" c="dimmed">{timeAgo(entry.created_at)}</Text>
        </Group>
      ))}
    </Stack>
  );
}

function timeAgo(ms: number) {
  const d = Date.now() - ms;
  if (d < 60000)    return 'just now';
  if (d < 3600000)  return `${Math.floor(d / 60000)}m`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h`;
  return `${Math.floor(d / 86400000)}d`;
}
