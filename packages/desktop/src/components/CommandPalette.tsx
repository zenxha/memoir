import React, { useMemo } from 'react';
import { Spotlight, spotlight } from '@mantine/spotlight';
import '@mantine/spotlight/styles.css';
import { Entry } from '@memoir/contract';
import { Surface } from './SurfaceSwitcher';

interface Props {
  entries:   Entry[];
  onSurface: (s: Surface) => void;
  onEntry:   (e: Entry) => void;
}

export { spotlight };

export function CommandPalette({ entries, onSurface, onEntry }: Props) {
  const actions = useMemo(() => {
    const fixed = [
      { id: 'sky',   label: 'Sky',   description: 'Globe view', leftSection: '🌍', onClick: () => onSurface('sky') },
      { id: 'atlas', label: 'Atlas', description: 'Map + list', leftSection: '🗺',  onClick: () => onSurface('atlas') },
      { id: 'roll',  label: 'Roll',  description: 'Photo grid', leftSection: '⬛', onClick: () => onSurface('roll') },
    ];
    const entryActions = entries.slice(0, 200).map(e => ({
      id:          e.id,
      label:       e.title ?? e.place_name ?? e.type,
      description: [e.place_name, e.type, new Date(e.created_at).toLocaleDateString()].filter(Boolean).join(' · '),
      leftSection: e.type === 'audio' ? '◉' : e.type === 'photo' ? '⬛' : e.type === 'moment' ? '◎' : '▤',
      onClick:     () => onEntry(e),
    }));
    return [...fixed, ...entryActions];
  }, [entries, onSurface, onEntry]);

  return (
    <Spotlight
      actions={actions}
      searchProps={{ placeholder: 'search moments, jump to surface…' }}
      shortcut={['mod+K']}
      nothingFound="no matches"
      highlightQuery
      styles={{
        root:    { '--mantine-color-body': 'var(--ink-100)' },
        content: {
          background:   'var(--ink-100)',
          border:       '1px solid var(--ink-300)',
          borderRadius: 6,
        },
        search:  {
          background:   'transparent',
          borderBottom: '1px solid var(--ink-300)',
          color:        'var(--paper-900)',
          fontFamily:   'var(--font-mono)',
          fontSize:     13,
        },
        action:  {
          color:       'var(--paper-700)',
          fontFamily:  'var(--font-ui)',
          borderRadius: 4,
        },
        actionLabel:       { color: 'var(--paper-900)' },
        actionDescription: { color: 'var(--paper-500)', fontFamily: 'var(--font-mono)', fontSize: 11 },
        empty:             { color: 'var(--paper-400)', fontFamily: 'var(--font-mono)' },
      }}
    />
  );
}
