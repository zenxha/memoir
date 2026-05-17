import { useState, useEffect } from 'react';

export interface Position {
  lat: number;
  lng: number;
  accuracy: number;
  altitude: number | null;
}

export function useGPS() {
  const [position, setPosition] = useState<Position | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => setPosition({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        altitude: pos.coords.altitude,
      }),
      (err) => console.warn('GPS:', err.message),
      { enableHighAccuracy: true, maximumAge: 10000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  return position;
}
