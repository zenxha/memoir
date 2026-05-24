import React, { useEffect, useRef, useState } from 'react';
import { Entry } from '@memoir/contract';
import { api } from '../api/client';
import { Position } from '../hooks/useGPS';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { C, F, formatTime } from '../design';

interface Props {
  position: Position | null;
  placeName: string | null;
  onSave: (entry: Entry) => void;
  onCancel: () => void;
  onElapsed?: (ms: number) => void; // for DynamicIsland timer
}

function downsample(arr: number[], n: number): number[] {
  if (arr.length <= n) return arr;
  const step = arr.length / n;
  return Array.from({ length: n }, (_, i) => arr[Math.round(i * step)] ?? 0);
}

export function RecordingSheet({ position, placeName, onSave, onCancel, onElapsed }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [peaks, setPeaks]     = useState<number[]>([]);
  const mediaRef    = useRef<MediaRecorder | null>(null);
  const chunksRef   = useRef<Blob[]>([]);
  const peaksRef    = useRef<number[]>([]);
  const startRef    = useRef(Date.now());
  const accRef      = useRef(0);
  const pausedAtRef = useRef<number | null>(null);
  const timerRef    = useRef<ReturnType<typeof setInterval>>();
  const { enqueue } = useOfflineQueue(onSave);

  useEffect(() => {
    let audioCtx: AudioContext;
    let animId: number;

    navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1, sampleRate: 44100 },
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
        if (pausedAtRef.current !== null) return;
        const ms = accRef.current + (Date.now() - startRef.current);
        setElapsed(ms);
        onElapsed?.(ms);
      }, 100);

      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        animId = requestAnimationFrame(tick);
        if (pausedAtRef.current !== null) return;
        analyser.getByteFrequencyData(buf);
        const peak = Math.max(...Array.from(buf)) / 255;
        peaksRef.current.push(peak);
        setPeaks(p => [...p.slice(-54), peak]);
      };
      tick();
    });

    return () => {
      cancelAnimationFrame(animId);
      clearInterval(timerRef.current);
      audioCtx?.close();
    };
  }, []);

  async function stop() {
    clearInterval(timerRef.current);
    if (mediaRef.current?.state === 'paused') mediaRef.current.resume();
    const mr = mediaRef.current;
    if (!mr) { onCancel(); return; }

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

    const waveform = downsample(peaksRef.current, 100);
    const pos = position ? { lat: position.lat, lng: position.lng, accuracy: position.accuracy } : {};
    const body = { type: 'audio' as const, duration_ms, waveform, ...pos };
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
      onSave({
        ...body, id: `offline-${Date.now()}`, created_at: Date.now(), imported_at: null, source: 'native',
        lat: pos.lat ?? null, lng: pos.lng ?? null, accuracy: pos.accuracy ?? null, altitude: null,
        place_name: 'Queued offline', title: null, body: null, media_path: null, media_thumb: null,
        transcript: null, music_title: null, music_artist: null, music_key: null,
        tags: [], weather: null, device_id: null, external_id: null,
      });
    }
  }

  const secs = formatTime(elapsed);
  const frac = ((elapsed / 1000) % 1).toFixed(2).slice(1);

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: C.ink050,
      borderTop: `1px solid ${C.ink300}`,
      borderRadius: '22px 22px 0 0',
      zIndex: 40,
      display: 'flex', flexDirection: 'column',
      // slide in from bottom
      animation: 'slideUp 360ms cubic-bezier(0.32,0.72,0,1) forwards',
    }}>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(36%); }
          to   { transform: translateY(0); }
        }
      `}</style>

      {/* Handle */}
      <div style={{ padding: '14px 0 4px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: 38, height: 4, background: 'rgba(243,236,224,0.3)', borderRadius: 4 }} />
      </div>

      {/* Place label */}
      <div style={{ textAlign: 'center', padding: '8px 24px 0' }}>
        <div style={{ fontFamily: F.mono, fontSize: 9, color: C.paper400, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          // recording · audio
        </div>
        <div style={{ fontFamily: F.display, fontStyle: 'italic', fontSize: 19, color: C.paper900, marginTop: 6 }}>
          {placeName ?? 'finding location…'}
        </div>
      </div>

      {/* Big timer */}
      <div style={{
        textAlign: 'center',
        fontFamily: F.mono, fontSize: 48, color: C.ember,
        letterSpacing: '0.04em', lineHeight: 1,
        padding: '20px 24px',
      }}>
        {secs}
        <span style={{ color: C.paper500, fontSize: 20 }}>{frac}</span>
      </div>

      {/* Live waveform */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 2,
        height: 56, margin: '0 22px', flexShrink: 0,
      }}>
        {Array.from({ length: 54 }, (_, i) => {
          const peak = peaks[i] ?? 0;
          const isLive = i >= peaks.length - 4;
          return (
            <div key={i} style={{
              flex: 1, height: `${Math.max(10, peak * 100)}%`,
              background: isLive ? C.ember : C.audio,
              borderRadius: 1, opacity: isLive ? 1 : 0.75,
              boxShadow: isLive ? `0 0 8px ${C.ember}` : 'none',
            }} />
          );
        })}
      </div>

      {/* Controls */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 32, padding: '16px 24px 32px',
      }}>
        <button
          onClick={onCancel}
          style={{
            border: 0, background: 'transparent',
            fontFamily: F.mono, fontSize: 10, color: C.paper500,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >cancel</button>

        {/* Stop/record button */}
        <div
          onClick={stop}
          style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 30%, oklch(82% 0.16 35), oklch(60% 0.16 35))',
            boxShadow: `0 0 0 4px rgba(28,25,36,0.6), 0 0 0 5px ${C.ember}, 0 0 38px 8px ${C.emberGlow}`,
            display: 'grid', placeItems: 'center',
            cursor: 'pointer',
          }}
        >
          <div style={{ width: 18, height: 18, borderRadius: 3, background: C.paper900 }} />
        </div>

        <button
          onClick={stop}
          style={{
            border: 0, background: 'transparent',
            fontFamily: F.mono, fontSize: 10, color: C.paper900,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >save</button>
      </div>

      {/* Home indicator */}
      <div style={{
        position: 'absolute', bottom: 7, left: '50%', transform: 'translateX(-50%)',
        width: 100, height: 4, background: 'rgba(243,236,224,0.35)', borderRadius: 4,
        pointerEvents: 'none',
      }} />
    </div>
  );
}
