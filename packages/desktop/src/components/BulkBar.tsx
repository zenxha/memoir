import React, { useState } from 'react';

interface Props {
  count:     number;
  onDelete:  () => void;
  onTag:     (tags: string[]) => void;
  onClear:   () => void;
}

export function BulkBar({ count, onDelete, onTag, onClear }: Props) {
  const [tagging, setTagging] = useState(false);
  const [tagInput, setTagInput] = useState('');

  if (!count) return null;

  const submitTag = () => {
    const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean);
    if (tags.length) { onTag(tags); setTagInput(''); setTagging(false); }
  };

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 50,
      background: 'var(--ink-200)', border: '1px solid var(--ink-400)',
      borderRadius: 8, padding: '12px 20px',
      display: 'flex', alignItems: 'center', gap: 12,
      fontFamily: 'var(--font-mono)', fontSize: 11,
      backdropFilter: 'blur(12px)',
      boxShadow: '0 4px 32px rgba(0,0,0,0.5)',
      animation: 'detail-in 200ms ease',
    }}>
      <span style={{ color: 'var(--paper-500)', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
        {count} selected
      </span>

      {tagging ? (
        <>
          <input
            autoFocus
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitTag(); if (e.key === 'Escape') setTagging(false); }}
            placeholder="tag1, tag2"
            style={{
              background: 'var(--ink-100)', border: '1px solid var(--ink-400)',
              borderRadius: 4, padding: '4px 10px', color: 'var(--paper-900)',
              fontFamily: 'var(--font-mono)', fontSize: 11, width: 180,
            }}
          />
          <BarBtn onClick={submitTag}>apply</BarBtn>
          <BarBtn onClick={() => setTagging(false)}>cancel</BarBtn>
        </>
      ) : (
        <>
          <BarBtn onClick={() => setTagging(true)}>tag</BarBtn>
          <BarBtn danger onClick={onDelete}>delete</BarBtn>
          <BarBtn onClick={onClear}>✕</BarBtn>
        </>
      )}
    </div>
  );
}

function BarBtn({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} style={{
      background: 'none',
      border: `1px solid ${danger ? 'var(--note)' : 'var(--ink-400)'}`,
      borderRadius: 4, padding: '4px 12px', cursor: 'pointer',
      fontFamily: 'var(--font-mono)', fontSize: 11,
      color: danger ? 'var(--note)' : 'var(--paper-700)',
      letterSpacing: '0.08em',
    }}>
      {children}
    </button>
  );
}
