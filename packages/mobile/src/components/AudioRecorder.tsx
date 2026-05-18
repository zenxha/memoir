import React, { useEffect, useRef, useState } from 'react';
import { Group, Button, Text, Stack, Box } from '@mantine/core';
import { Entry } from '@memoir/contract';
import { api } from '../api/client';
import { Position } from '../hooks/useGPS';
import { useOfflineQueue } from '../hooks/useOfflineQueue';

interface Props {
  position: Position | null;
  onSave: (entry: Entry) => void;
  onCancel: () => void;
}

export function AudioRecorder({ position, onSave, onCancel }: Props) {
  const [elapsed, setElapsed]   = useState(0);
  const [paused, setPaused]     = useState(false);
  const [peaks, setPeaks]       = useState<number[]>([]);
  const mediaRef    = useRef<MediaRecorder | null>(null);
  const chunksRef   = useRef<Blob[]>([]);
  const peaksRef    = useRef<number[]>([]);
  const startRef    = useRef(Date.now());
  const accRef      = useRef(0); // accumulated ms before current segment
  const pausedAtRef = useRef<number | null>(null);
  const timerRef    = useRef<ReturnType<typeof setInterval>>();
  const { enqueue } = useOfflineQueue(onSave);

  useEffect(() => {
    let audioCtx: AudioContext;
    let animId: number;

    navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation:   false,
        noiseSuppression:   false,
        autoGainControl:    false,
        channelCount:       1,
        sampleRate:         44100,
      },
    }).then(stream => {
      audioCtx = new AudioContext();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      audioCtx.createMediaStreamSource(stream).connect(analyser);

      const mime = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/webm';
      const mr = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.start(100);
      mediaRef.current = mr;
      startRef.current = Date.now();

      timerRef.current = setInterval(() => {
        if (pausedAtRef.current !== null) return; // frozen while paused
        setElapsed(accRef.current + (Date.now() - startRef.current));
      }, 100);

      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        animId = requestAnimationFrame(tick);
        if (pausedAtRef.current !== null) return; // freeze waveform while paused
        analyser.getByteFrequencyData(buf);
        const peak = Math.max(...Array.from(buf)) / 255;
        peaksRef.current.push(peak);
        setPeaks(p => [...p.slice(-59), peak]);
      };
      tick();
    });

    return () => {
      cancelAnimationFrame(animId);
      clearInterval(timerRef.current);
      audioCtx?.close();
    };
  }, []);

  function togglePause() {
    const mr = mediaRef.current;
    if (!mr) return;
    if (mr.state === 'recording') {
      mr.pause();
      pausedAtRef.current = Date.now();
      accRef.current += Date.now() - startRef.current;
      setPaused(true);
    } else if (mr.state === 'paused') {
      mr.resume();
      startRef.current = Date.now();
      pausedAtRef.current = null;
      setPaused(false);
    }
  }

  async function stop() {
    clearInterval(timerRef.current);
    // if paused when stopped, resume briefly so MediaRecorder can flush
    if (mediaRef.current?.state === 'paused') mediaRef.current.resume();
    const mr = mediaRef.current;
    if (!mr) return;

    const { blob, mimeType, duration_ms } = await new Promise<{ blob: Blob; mimeType: string; duration_ms: number }>((resolve) => {
      mr.onstop = () => {
        const mime = mr.mimeType;
        const duration_ms = pausedAtRef.current !== null
          ? accRef.current
          : accRef.current + (Date.now() - startRef.current);
        resolve({ blob: new Blob(chunksRef.current, { type: mime }), mimeType: mime, duration_ms });
      };
      mr.stop();
      mr.stream.getTracks().forEach(t => t.stop());
    });

    const sampled = downsample(peaksRef.current, 100);
    const pos = position ? { lat: position.lat, lng: position.lng, accuracy: position.accuracy } : {};
    const body = { type: 'audio' as const, duration_ms, waveform: sampled, ...pos };
    const ext  = mimeType === 'audio/mp4' ? '.m4a' : '.webm';

    try {
      const res = await api.entries.create({ body });
      if (res.status !== 201) throw new Error();
      const entry = res.body;
      const fd = new FormData();
      fd.append('entryId', entry.id);
      fd.append('file', blob, `audio${ext}`);
      await fetch('/api/media/upload', { method: 'POST', body: fd });
      onSave(entry);
    } catch {
      enqueue({ body, blob, blobName: `audio${ext}` });
      onSave({ ...body, id: `offline-${Date.now()}`, created_at: Date.now(), imported_at: null, source: 'native', lat: pos.lat ?? null, lng: pos.lng ?? null, accuracy: pos.accuracy ?? null, altitude: null, place_name: 'Queued offline', title: null, body: null, media_path: null, media_thumb: null, transcript: null, music_title: null, music_artist: null, music_key: null, tags: [], weather: null, device_id: null });
    }
    onCancel();
  }

  return (
    <Stack gap="xs" p="md" style={{ borderBottom: '1px solid #1e1e1e' }}>
      <Group justify="space-between">
        <Group gap="xs">
          <Box style={{
            width: 10, height: 10, borderRadius: '50%',
            background: 'var(--mantine-color-red-5)',
            animation: paused ? 'none' : 'pulse 1s infinite',
            opacity: paused ? 0.4 : 1,
          }} />
          <Text size="sm" ff="monospace">{formatMs(elapsed)}</Text>
          {paused && <Text size="xs" c="dimmed">paused</Text>}
        </Group>
        <Group gap="xs">
          <Button size="xs" variant="subtle" color="gray" onClick={togglePause}>
            {paused ? '▶ Resume' : '⏸ Pause'}
          </Button>
          <Button size="xs" color="red" onClick={stop}>■ Stop</Button>
          <Button size="xs" variant="subtle" color="gray" onClick={onCancel}>Cancel</Button>
        </Group>
      </Group>
      <Group gap={1} h={28} align="center" wrap="nowrap">
        {peaks.map((p, i) => (
          <Box key={i} style={{ width: 3, minHeight: 2, height: Math.max(2, Math.round(p * 28)), background: 'var(--mantine-color-blue-5)', borderRadius: 1, flexShrink: 0 }} />
        ))}
      </Group>
    </Stack>
  );
}

function formatMs(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function downsample(arr: number[], n: number) {
  if (arr.length <= n) return arr;
  const step = arr.length / n;
  return Array.from({ length: n }, (_, i) => arr[Math.round(i * step)] ?? 0);
}
