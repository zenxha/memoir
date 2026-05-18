import { useEffect } from 'react';
import { Position } from './useGPS';

const INTERVAL_MS = 60_000; // 60s while open

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
      }).catch(() => {});
    };

    post(); // fire immediately when app opens or position first arrives
    const id = setInterval(post, INTERVAL_MS);

    // Also fire on visibility restore — covers switching back to the app
    const onVisible = () => { if (!document.hidden) post(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [online, position?.lat, position?.lng]);
}
