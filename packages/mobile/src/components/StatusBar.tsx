import React from 'react';
import { Group, Text, Indicator, Box } from '@mantine/core';
import { Position } from '../hooks/useGPS';

interface Props {
  online: boolean;
  position: Position | null;
}

export function StatusBar({ online, position }: Props) {
  return (
    <Group px="md" py="xs" justify="space-between" style={{ borderBottom: '1px solid #1e1e1e' }}>
      <Group gap="xs">
        <Indicator color={online ? 'teal' : 'red'} size={8} processing={online}>
          <Box w={8} h={8} />
        </Indicator>
        <Text size="xs" c="dimmed">memoir · {online ? 'online' : 'offline'}</Text>
      </Group>
      {position && (
        <Text size="xs" c="dimmed">{position.lat.toFixed(4)}, {position.lng.toFixed(4)}</Text>
      )}
    </Group>
  );
}
