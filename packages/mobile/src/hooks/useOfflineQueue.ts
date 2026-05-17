import { useCallback, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { Entry } from '@memoir/contract';
import { CreateEntrySchema } from '@memoir/contract';
import { z } from 'zod';

type QueueItem = { body: z.infer<typeof CreateEntrySchema>; blob?: Blob; blobName?: string };

const QUEUE_KEY = 'memoir-offline-queue';

function loadQueue(): QueueItem[] {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]'); } catch { return []; }
}
function saveQueue(q: QueueItem[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q.map(({ blob, blobName, ...rest }) => rest)));
}

export function useOfflineQueue(onFlushed: (entry: Entry) => void) {
  const queueRef = useRef<QueueItem[]>(loadQueue());

  const enqueue = useCallback((item: QueueItem) => {
    queueRef.current.push(item);
    saveQueue(queueRef.current);
  }, []);

  const flush = useCallback(async () => {
    if (!queueRef.current.length) return;
    const pending = [...queueRef.current];
    queueRef.current = [];
    saveQueue([]);

    for (const item of pending) {
      try {
        const res = await api.entries.create({ body: item.body });
        if (res.status !== 201) { queueRef.current.push(item); continue; }
        const entry = res.body;
        if (item.blob && item.blobName) {
          const fd = new FormData();
          fd.append('entryId', entry.id);
          fd.append('file', item.blob, item.blobName);
          await fetch('/api/media/upload', { method: 'POST', body: fd });
        }
        onFlushed(entry);
      } catch {
        queueRef.current.push(item);
      }
    }
    saveQueue(queueRef.current);
  }, [onFlushed]);

  useEffect(() => {
    flush();
    window.addEventListener('online', flush);
    return () => window.removeEventListener('online', flush);
  }, [flush]);

  return { enqueue, flush };
}
