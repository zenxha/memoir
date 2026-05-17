import React, { useEffect, useRef } from 'react';
import { Entry } from '@memoir/contract';

declare const mapboxgl: typeof import('mapbox-gl');

const TYPE_HEX: Record<string, string> = {
  audio: '#5b8cff', photo: '#ff8c42', moment: '#44dd88', note: '#cc88ff',
};

interface Props {
  center: { lat: number; lng: number };
  entries: Entry[];
  onEntryClick: (entry: Entry) => void;
}

export function StreetMap({ center, entries, onEntryClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<InstanceType<typeof mapboxgl.Map> | null>(null);
  const markersRef   = useRef<Map<string, InstanceType<typeof mapboxgl.Marker>>>(new Map());

  useEffect(() => {
    if (!containerRef.current) return;
    mapboxgl.accessToken = (window as any).__CONFIG__?.mapboxToken ?? '';

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [center.lng, center.lat],
      zoom: 9,
      attributionControl: false,
    });
    map.addControl(new mapboxgl.AttributionControl({ compact: true }));
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');
    mapRef.current = map;
    map.on('load', () => syncMarkers(entries));
    requestAnimationFrame(() => map.resize());

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (mapRef.current?.loaded()) syncMarkers(entries);
  }, [entries]);

  function syncMarkers(data: Entry[]) {
    const map = mapRef.current;
    if (!map) return;
    const ids = new Set(data.map(e => e.id));

    // Remove stale
    for (const [id, marker] of markersRef.current) {
      if (!ids.has(id)) { marker.remove(); markersRef.current.delete(id); }
    }

    // Add new
    for (const entry of data) {
      if (entry.lat == null || entry.lng == null || markersRef.current.has(entry.id)) continue;
      const el = document.createElement('div');
      el.style.cssText = `width:10px;height:10px;border-radius:50%;background:${TYPE_HEX[entry.type] ?? '#888'};cursor:pointer;border:2px solid rgba(255,255,255,0.3);box-shadow:0 0 6px rgba(0,0,0,0.6);transition:transform 0.15s`;
      el.title = entry.title ?? entry.place_name ?? entry.type;
      el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.6)'; });
      el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });
      el.addEventListener('click', () => onEntryClick(entry));
      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([entry.lng, entry.lat])
        .addTo(map);
      markersRef.current.set(entry.id, marker);
    }
  }

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0 }}
    />
  );
}
