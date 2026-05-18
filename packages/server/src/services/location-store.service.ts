import { Injectable } from '@nestjs/common';

interface Beat { lat: number; lng: number; ts: number; }

@Injectable()
export class LocationStore {
  private readonly beats = new Map<string, Beat>();

  set(deviceId: string, lat: number, lng: number) {
    this.beats.set(deviceId, { lat, lng, ts: Date.now() });
  }

  // Most recent heartbeat within windowMs of ts — checked before entry history
  nearest(ts: number, windowMs = 10 * 60 * 1000): { lat: number; lng: number } | null {
    let best: Beat | null = null;
    for (const b of this.beats.values()) {
      if (Math.abs(b.ts - ts) < windowMs && (!best || Math.abs(b.ts - ts) < Math.abs(best.ts - ts))) {
        best = b;
      }
    }
    return best ? { lat: best.lat, lng: best.lng } : null;
  }
}
