import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Entry } from '@memoir/contract';
import { C, F } from '../design';
import { Position } from '../hooks/useGPS';

// Hex approximations of the oklch ember colors in design.ts — Mapbox circle-color
// paint properties cannot resolve oklch() so the desktop precedent (MapCanvas.tsx:6-12)
// uses the same hex lookup. Keep both tables in sync if either is changed.
const TYPE_COLOR: Record<string, string> = {
  audio:  '#7b9cf5',  // oklch(72% 0.13 250) — periwinkle
  photo:  '#d4893a',  // oklch(78% 0.13 55)  — amber
  moment: '#62b07a',  // oklch(74% 0.10 145) — sage
  note:   '#c07868',  // oklch(74% 0.10 15)  — dusty rose
};

// Ember hex — approximates oklch(76% 0.16 35) from design.ts
const EMBER_HEX = '#e69655';

interface Props {
  entries:      Entry[];
  position:     Position | null;
  opacity:      number;
  onEntryClick: (entry: Entry) => void;
  newEntry?:    Entry | null;
}

function emptyFC(): GeoJSON.FeatureCollection {
  return { type: 'FeatureCollection', features: [] };
}

function toGeoJSON(entries: Entry[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: entries
      .filter(e => e.lat != null && e.lng != null)
      .slice(0, 300) // D-09 cap — newest 300 (server-sorted DESC by created_at)
      .map(e => ({
        type:     'Feature',
        geometry: { type: 'Point', coordinates: [e.lng!, e.lat!] },
        properties: { id: e.id, type: e.type, color: TYPE_COLOR[e.type] ?? '#888888' },
      })),
  };
}

function autoFit(map: mapboxgl.Map, entries: Entry[], position: Position | null): void {
  const cutoff = Date.now() - 7 * 24 * 3_600_000; // last 7 days per D-07
  const recent = entries.filter(e =>
    e.created_at >= cutoff && e.lat != null && e.lng != null,
  );
  const points: [number, number][] = recent.map(e => [e.lng!, e.lat!]);
  if (position) points.push([position.lng, position.lat]);

  if (points.length === 0) return;

  if (points.length === 1) {
    map.easeTo({ center: points[0], zoom: 14, duration: 600 });
    return;
  }

  const lons = points.map(p => p[0]);
  const lats = points.map(p => p[1]);
  const bounds = new mapboxgl.LngLatBounds(
    [Math.min(...lons), Math.min(...lats)],
    [Math.max(...lons), Math.max(...lats)],
  );

  map.fitBounds(bounds, {
    // Top: DynamicIsland ~36px. Bottom: home-peek ~128px tall. Side: comfortable inset.
    padding: { top: 48, bottom: 160, left: 24, right: 24 },
    maxZoom: 15,
    duration: 800,
    essential: true,
  });
}

export function MapSurface({ entries, position, opacity, onEntryClick, newEntry }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<mapboxgl.Map | null>(null);
  const entriesRef   = useRef<Entry[]>(entries);
  const positionRef  = useRef<Position | null>(position);
  const fitOnceRef   = useRef(false);
  const onEntryClickRef = useRef(onEntryClick);
  const pulseRafRef  = useRef<number | null>(null);

  // Track props through refs so map event handlers always see the latest values
  // without re-binding (pattern from MapCanvas.tsx:41-47).
  entriesRef.current     = entries;
  positionRef.current    = position;
  onEntryClickRef.current = onEntryClick;

  // Trigger DOM-label repositioning whenever the map moves.
  const [labelXY, setLabelXY] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = (window as any).__CONFIG__?.mapboxToken ?? '';

    // Constructor: match desktop MapCanvas.tsx:54-62 (style, projection, attribution off,
    // pitchWithRotate off). Do NOT set cooperativeGestures — Mapbox defaults provide the
    // expected one-finger pan / pinch-zoom / two-finger rotate-pitch on mobile.
    const map = new mapboxgl.Map({
      container:  containerRef.current,
      style:      'mapbox://styles/mapbox/dark-v11',
      projection: 'globe' as any,
      zoom:       12,
      center:     position ? [position.lng, position.lat] : [0, 20],
      attributionControl: false,
      pitchWithRotate: false,
    } as any);

    mapRef.current = map;

    map.on('load', () => {
      // ── Atmosphere (verbatim from MapCanvas.tsx:67-74) ────────────────────
      (map as any).setFog({
        color:            'rgb(40, 28, 12)',
        'high-color':     'rgb(18, 12, 6)',
        'horizon-blend':  0.12,
        'space-color':    'rgb(4, 3, 7)',
        'star-intensity': 0.0,
      });

      // ── Style sweep (verbatim from MapCanvas.tsx:82-144) ─────────────────
      // Produces the dark-city look from the Cosmographic Atlas palette.
      const set = (id: string, p: string, v: unknown) => {
        try { (map as any).setPaintProperty(id, p, v); } catch (_) {}
      };
      for (const layer of map.getStyle().layers) {
        const id = layer.id;
        if (id.startsWith('entries-')) continue;
        switch (layer.type) {
          case 'background':
            set(id, 'background-color', '#08060a');
            break;
          case 'fill':
            if (id.includes('hillshade')) { set(id, 'fill-opacity', 0); break; }
            if (id.includes('water'))     { set(id, 'fill-color', '#07060f'); set(id, 'fill-opacity', 1); break; }
            if (id.includes('urban') || id.includes('landuse') || id.includes('land-use')) {
              set(id, 'fill-color', '#1e1608'); break;
            }
            set(id, 'fill-color', '#141008');
            set(id, 'fill-opacity', 0.95);
            break;
          case 'line':
            if (id.includes('admin') || id.includes('boundary') || id.includes('border')) {
              set(id, 'line-color', '#1a1510');
              set(id, 'line-opacity', id.includes('-0-') ? 0.4 : 0.15);
            } else if (
              id.includes('road') || id.includes('street') ||
              id.includes('motorway') || id.includes('trunk') || id.includes('rail')
            ) {
              set(id, 'line-color', '#d4921e');
              set(id, 'line-opacity', 0.35);
            } else {
              set(id, 'line-opacity', 0);
            }
            break;
          case 'symbol': {
            const isCountry = id.includes('country');
            const isOcean   = id.includes('ocean') || id.includes('marine');
            const isCity    = id.includes('settlement') || id.includes('place');
            if (isCountry) {
              set(id, 'text-color', '#c8b89a');
              set(id, 'text-opacity', 0.7);
              set(id, 'text-halo-color', 'rgba(0,0,0,0.6)');
              set(id, 'text-halo-width', 1.5);
            } else if (isOcean) {
              set(id, 'text-color', '#8a9ab0');
              set(id, 'text-opacity', 0.5);
              set(id, 'text-halo-color', 'rgba(0,0,0,0.5)');
              set(id, 'text-halo-width', 1);
            } else if (isCity) {
              set(id, 'text-color', '#b0a088');
              set(id, 'text-opacity', 0.55);
              set(id, 'text-halo-color', 'rgba(0,0,0,0.7)');
              set(id, 'text-halo-width', 1);
            } else {
              set(id, 'text-opacity', 0);
            }
            set(id, 'icon-opacity', 0);
            break;
          }
        }
      }

      // ── Entry dots source + layers (verbatim from MapCanvas.tsx:150, 165-188) ─
      map.addSource('entries', { type: 'geojson', data: toGeoJSON([]) });

      // Pulse source for live-arrival animation (verbatim from MapCanvas.tsx:153-163)
      map.addSource('pulse', { type: 'geojson', data: emptyFC() });
      map.addLayer({
        id: 'pulse-ring', type: 'circle', source: 'pulse',
        paint: {
          'circle-radius':  0,
          'circle-color':   ['get', 'color'],
          'circle-opacity': 0.6,
          'circle-stroke-width': 2,
          'circle-stroke-color': ['get', 'color'],
        },
      });

      // ── User-pin layers (NEW for mobile — replaces AtlasBackground.tsx:124-133 SVG)
      map.addSource('user-pin', { type: 'geojson', data: emptyFC() });
      map.addLayer({
        id: 'user-pin-glow', type: 'circle', source: 'user-pin',
        paint: {
          'circle-radius':  18,
          'circle-color':   EMBER_HEX,
          'circle-opacity': 0.18,
          'circle-blur':    1.0,
        },
      });
      map.addLayer({
        id: 'user-pin-dot', type: 'circle', source: 'user-pin',
        paint: {
          'circle-radius':       5,
          'circle-color':        EMBER_HEX,
          'circle-opacity':      0.95,
          'circle-stroke-width': 1,
          'circle-stroke-color': 'rgba(255,255,255,0.4)',
        },
      });

      // ── Entry glow + sharp dot (verbatim from MapCanvas.tsx:165-188, with D-09 4-6px sizing)
      map.addLayer({
        id:     'entries-glow',
        type:   'circle',
        source: 'entries',
        paint: {
          'circle-radius':  10,
          'circle-color':   ['get', 'color'],
          'circle-opacity': 0.22,
          'circle-blur':    1.2,
        },
      });
      map.addLayer({
        id:     'entries-dot',
        type:   'circle',
        source: 'entries',
        paint: {
          // Slightly larger than desktop per D-09 — 4-6px at city zoom on mobile
          'circle-radius':       ['interpolate', ['linear'], ['zoom'], 1, 3, 14, 6],
          'circle-color':        ['get', 'color'],
          'circle-opacity':      0.92,
          'circle-stroke-width': 0.5,
          'circle-stroke-color': 'rgba(255,255,255,0.25)',
        },
      });

      // Sync initial entries + user-pin position
      (map.getSource('entries') as mapboxgl.GeoJSONSource)
        .setData(toGeoJSON(entriesRef.current));

      const curPos = positionRef.current;
      if (curPos) {
        (map.getSource('user-pin') as mapboxgl.GeoJSONSource).setData({
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [curPos.lng, curPos.lat] },
            properties: {},
          }],
        });
      }

      // ── Tap handler (delegates to React; adapted from MapCanvas.tsx:193-200; drop cursor lines) ─
      map.on('click', 'entries-dot', (e) => {
        if (!e.features?.[0]) return;
        const id = e.features[0].properties?.id as string;
        const entry = entriesRef.current.find(en => en.id === id);
        if (entry) onEntryClickRef.current(entry);
      });

      // Initial auto-fit (D-07). The second pass on first non-null GPS is gated by fitOnceRef.
      autoFit(map, entriesRef.current, positionRef.current);
      if (positionRef.current) fitOnceRef.current = true;

      // Update DOM-label position whenever the map moves (RAF-coalesced inside move handler).
      let labelRaf = 0;
      const updateLabel = () => {
        labelRaf = 0;
        const pos = positionRef.current;
        if (!pos) {
          setLabelXY(null);
          return;
        }
        const { x, y } = map.project([pos.lng, pos.lat]);
        setLabelXY({ x, y });
      };
      const onMove = () => {
        if (labelRaf) return;
        labelRaf = requestAnimationFrame(updateLabel);
      };
      map.on('move', onMove);
      updateLabel();
    });

    // Cleanup — verbatim shape from MapCanvas.tsx:229-233
    return () => {
      if (pulseRafRef.current) cancelAnimationFrame(pulseRafRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Keep entry dots in sync (verbatim from MapCanvas.tsx:237-240)
  useEffect(() => {
    const src = mapRef.current?.getSource('entries') as mapboxgl.GeoJSONSource | undefined;
    src?.setData(toGeoJSON(entries));
    // Second-pass autoFit: if the initial pass couldn't include a GPS pin yet,
    // try again whenever entries or position next change.
    if (!fitOnceRef.current && mapRef.current?.loaded()) {
      autoFit(mapRef.current, entries, positionRef.current);
      if (positionRef.current) fitOnceRef.current = true;
    }
  }, [entries]);

  // Keep user-pin source in sync with GPS
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource('user-pin') as mapboxgl.GeoJSONSource | undefined;
    if (!src) return;
    src.setData(position
      ? {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [position.lng, position.lat] },
            properties: {},
          }],
        }
      : emptyFC());

    // First non-null GPS — fit again so we centre on the user's actual city.
    if (!fitOnceRef.current && position && map.loaded()) {
      autoFit(map, entriesRef.current, position);
      fitOnceRef.current = true;
    }

    // Reproject the DOM label.
    if (position && map.loaded()) {
      const { x, y } = map.project([position.lng, position.lat]);
      setLabelXY({ x, y });
    } else if (!position) {
      setLabelXY(null);
    }
  }, [position]);

  // Pulse the user-pin glow on a 2.4s triangle wave — replaces AtlasBackground.tsx:127-129
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const start = performance.now();
    const loop = (t: number) => {
      const phase = ((t - start) / 2400) % 1;                 // 0..1 across 2.4s
      const tri   = 1 - Math.abs(phase * 2 - 1);              // triangle 0..1..0
      const r     = 12 + 10 * tri;                            // 12..22
      const o     = 0.18 - 0.04 * tri;                        // 0.18..0.14
      try {
        (map as any).setPaintProperty('user-pin-glow', 'circle-radius',  r);
        (map as any).setPaintProperty('user-pin-glow', 'circle-opacity', o);
      } catch { /* style not loaded yet */ }
      pulseRafRef.current = requestAnimationFrame(loop);
    };
    pulseRafRef.current = requestAnimationFrame(loop);
    return () => {
      if (pulseRafRef.current) cancelAnimationFrame(pulseRafRef.current);
      pulseRafRef.current = null;
    };
  }, []);

  // Live-arrival pulse (verbatim from MapCanvas.tsx:242-271). newEntry is optional
  // — short-circuits when null/undefined.
  useEffect(() => {
    if (!newEntry || newEntry.lat == null || newEntry.lng == null) return;
    const map = mapRef.current;
    if (!map) return;

    const color = TYPE_COLOR[newEntry.type] ?? '#ffffff';
    const feature: GeoJSON.Feature = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [newEntry.lng, newEntry.lat] },
      properties: { color },
    };
    const src = map.getSource('pulse') as mapboxgl.GeoJSONSource;
    src?.setData({ type: 'FeatureCollection', features: [feature] });

    const start = performance.now();
    const DURATION = 2600;
    const animatePulse = (now: number) => {
      const t = Math.min((now - start) / DURATION, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      try {
        (map as any).setPaintProperty('pulse-ring', 'circle-radius', ease * 40);
        (map as any).setPaintProperty('pulse-ring', 'circle-opacity', (1 - t) * 0.6);
        (map as any).setPaintProperty('pulse-ring', 'circle-stroke-color', color);
      } catch (_) { /* style not loaded yet */ }
      if (t < 1) requestAnimationFrame(animatePulse);
      else src?.setData(emptyFC());
    };
    requestAnimationFrame(animatePulse);
  }, [newEntry]);

  return (
    <div style={{
      position: 'absolute', inset: 0,
      opacity,                                  // mapOpacity from App.tsx
      transition: 'opacity 420ms ease',
      touchAction: 'none',                      // Mapbox owns gestures inside the map area
    }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      {/* "here · now" label — DOM, not a Mapbox marker; matches AtlasBackground typography */}
      {labelXY && (
        <div style={{
          position: 'absolute',
          left: labelXY.x,
          top: labelXY.y - 22,
          transform: 'translateX(-50%)',
          fontFamily: F.mono,
          fontSize: 9,
          color: C.paper900,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}>here · now</div>
      )}
    </div>
  );
}
