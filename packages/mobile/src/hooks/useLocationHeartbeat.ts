import { useEffect } from 'react';
import { Position } from './useGPS';

const INTERVAL_MS = 60_000; // 60s

export function useLocationHeartbeat(position: Position | null, online: boolean) {
  useEffect(() => {
    if (!online || !position) return;

    const post = () => {
      fetch('/api/location/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat:       position.lat,
          lng:       position.lng,
          accuracy:  position.accuracy,
          device_id: 'mobile-pwa',
        }),
      }).catch(() => { /* silent — non-critical */ });
    };

    post(); // immediate on mount / when position changes
    const id = setInterval(post, INTERVAL_MS);
    return () => clearInterval(id);
  }, [online, position?.lat, position?.lng]);
}
