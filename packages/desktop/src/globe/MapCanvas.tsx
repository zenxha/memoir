import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Entry } from '@memoir/contract';

// Hex approximations of the oklch ember colors in theme.css
const TYPE_COLOR: Record<string, string> = {
  audio:  '#7b9cf5',  // oklch(72% 0.13 250) — periwinkle
  photo:  '#d4893a',  // oklch(78% 0.13 55)  — amber
  moment: '#62b07a',  // oklch(74% 0.10 145) — sage
  note:   '#c07868',  // oklch(74% 0.10 15)  — dusty rose
};

// Starfield from the design proposal (.stars) — radial-gradient pin-light dots
const STAR_BG = [
  'radial-gradient(1px 1px at  8% 14%, rgba(255,240,210,0.70), transparent 50%)',
  'radial-gradient(1px 1px at 14% 78%, rgba(255,240,210,0.55), transparent 50%)',
  'radial-gradient(1px 1px at 22% 32%, rgba(255,240,210,0.40), transparent 50%)',
  'radial-gradient(1px 1px at 30% 88%, rgba(255,240,210,0.70), transparent 50%)',
  'radial-gradient(1px 1px at 38% 18%, rgba(255,240,210,0.30), transparent 50%)',
  'radial-gradient(1px 1px at 47% 64%, rgba(255,240,210,0.60), transparent 50%)',
  'radial-gradient(1px 1px at 56% 12%, rgba(255,240,210,0.50), transparent 50%)',
  'radial-gradient(1px 1px at 64% 84%, rgba(255,240,210,0.40), transparent 50%)',
  'radial-gradient(1px 1px at 71% 28%, rgba(255,240,210,0.70), transparent 50%)',
  'radial-gradient(1px 1px at 78% 72%, rgba(255,240,210,0.50), transparent 50%)',
  'radial-gradient(1px 1px at 86% 22%, rgba(255,240,210,0.60), transparent 50%)',
  'radial-gradient(1px 1px at 92% 58%, rgba(255,240,210,0.40), transparent 50%)',
  'radial-gradient(1px 1px at  4% 48%, rgba(255,240,210,0.35), transparent 50%)',
].join(', ');

interface Props {
  entries: Entry[];
  onEntryClick: (entry: Entry) => void;
  onModeChange?: (mode: 'globe' | 'map') => void;
}

export function MapCanvas({ entries, onEntryClick, onModeChange }: Props) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<mapboxgl.Map | null>(null);
  const entriesRef    = useRef<Entry[]>(entries);
  const interacting   = useRef(false);
  const rafRef        = useRef<number | null>(null);
  const bearingRef    = useRef(0);
  const [zoom, setZoom] = useState(1.5);

  entriesRef.current = entries;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = (window as any).__CONFIG__?.mapboxToken ?? '';

    const map = new mapboxgl.Map({
      container:  containerRef.current,
      style:      'mapbox://styles/mapbox/dark-v11',
      projection: 'globe' as any,
      zoom:       1.5,
      center:     [10, 20],
      attributionControl: false,
      pitchWithRotate: false,
    } as any);

    mapRef.current = map;

    map.on('load', () => {
      // Atmosphere — stronger rim so globe reads as a distinct sphere against space
      (map as any).setFog({
        color:            'rgb(40, 28, 12)',    // warm amber glow near horizon
        'high-color':     'rgb(18, 12, 6)',     // fades to dark above
        'horizon-blend':  0.12,                 // wider blend = visible halo
        'space-color':    'rgb(4, 3, 7)',
        'star-intensity': 0.0,
      });

      // City-lights style sweep:
      //   land  = dark warm brown  (not cold black — faint warmth of earth at night)
      //   water = cool near-black  (oceans absorb light)
      //   roads = amber traces     (streetlights; only visible zoomed in, but add warmth to urban fills)
      //   admin = barely visible borders
      //   labels = country/ocean names only, very dim
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
            // urban/landuse — brighter warm glow, visible city clusters
            if (id.includes('urban') || id.includes('landuse') || id.includes('land-use')) {
              set(id, 'fill-color', '#1e1608'); break;
            }
            // base land: dark warm brown — lifted enough to read against space
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
              // amber road traces — city lights effect, pushed brighter
              set(id, 'line-color', '#d4921e');
              set(id, 'line-opacity', 0.35);
            } else {
              set(id, 'line-opacity', 0);
            }
            break;
          case 'symbol':
            set(id, 'text-color', '#3d3020');
            set(id, 'text-opacity', id.includes('country') || id.includes('ocean') || id.includes('marine') ? 0.3 : 0);
            set(id, 'icon-opacity', 0);
            break;
        }
      }

      // Entry dots source + two layers: glow halo + sharp dot
      map.addSource('entries', { type: 'geojson', data: toGeoJSON([]) });

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
          'circle-radius':       ['interpolate', ['linear'], ['zoom'], 1, 3, 10, 5],
          'circle-color':        ['get', 'color'],
          'circle-opacity':      0.9,
          'circle-stroke-width': 0.5,
          'circle-stroke-color': 'rgba(255,255,255,0.25)',
        },
      });

      // Sync initial entries
      (map.getSource('entries') as mapboxgl.GeoJSONSource).setData(toGeoJSON(entriesRef.current));

      map.on('click', 'entries-dot', (e) => {
        if (!e.features?.[0]) return;
        const id = e.features[0].properties?.id as string;
        const entry = entriesRef.current.find(en => en.id === id);
        if (entry) onEntryClick(entry);
      });
      map.on('mouseenter', 'entries-dot', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'entries-dot', () => { map.getCanvas().style.cursor = ''; });
    });

    map.on('zoom', () => {
      const z = map.getZoom();
      setZoom(z);
      onModeChange?.(z > 5 ? 'map' : 'globe');
    });

    // Track interaction to pause auto-rotate
    const startInteract = () => { interacting.current = true; };
    const endInteract   = () => { setTimeout(() => { interacting.current = false; }, 800); };
    map.on('mousedown',  startInteract);
    map.on('touchstart', startInteract);
    map.on('mouseup',    endInteract);
    map.on('touchend',   endInteract);

    // Auto-rotate when at sky zoom
    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      if (interacting.current || !mapRef.current) return;
      if (mapRef.current.getZoom() > 3.5) return;
      bearingRef.current = (bearingRef.current + 0.025) % 360;
      mapRef.current.setBearing(bearingRef.current);
    };
    rafRef.current = requestAnimationFrame(tick);

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-left');

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Keep entry dots in sync
  useEffect(() => {
    const src = mapRef.current?.getSource('entries') as mapboxgl.GeoJSONSource | undefined;
    src?.setData(toGeoJSON(entries));
  }, [entries]);

  // Stars fade from fully visible at zoom ≤ 2 to gone by zoom 5
  const starOpacity = Math.max(0, Math.min(0.65, (5 - zoom) / 3 * 0.65));

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#050307' }}>
      {/* deep-sky background */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: 'radial-gradient(ellipse 80% 60% at 50% 50%, #16131e 0%, #0a0810 55%, #050307 100%)',
      }} />
      {/* starfield */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, zIndex: 1,
        backgroundImage: STAR_BG,
        opacity: starOpacity,
        transition: 'opacity 800ms ease',
        pointerEvents: 'none',
      }} />
      {/* Mapbox canvas — transparent bg so space gradient shows through outside the globe */}
      <div ref={containerRef} style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'transparent' }} />
      {/* atmosphere rim — warm glow around the globe edge, fades with zoom */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, zIndex: 3,
        background: 'radial-gradient(circle at 50% 50%, transparent 26%, rgba(255,200,120,0.08) 30%, rgba(200,160,80,0.05) 36%, transparent 42%)',
        filter: 'blur(8px)',
        opacity: Math.min(1, starOpacity * 2),
        pointerEvents: 'none',
      }} />
    </div>
  );
}

function toGeoJSON(entries: Entry[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: entries
      .filter(e => e.lat != null && e.lng != null)
      .map(e => ({
        type:     'Feature',
        geometry: { type: 'Point', coordinates: [e.lng!, e.lat!] },
        properties: { id: e.id, type: e.type, color: TYPE_COLOR[e.type] ?? '#888888' },
      })),
  };
}
