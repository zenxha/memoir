import React, { useMemo } from 'react';
import { Entry } from '@memoir/contract';
import { C, F, typeColor, GRAIN_URL } from '../design';
import { Position } from '../hooks/useGPS';

interface Props {
  entries: Entry[];
  position: Position | null;
  opacity: number;
}

interface Bounds {
  minLat: number; maxLat: number;
  minLng: number; maxLng: number;
}

function computeBounds(entries: Entry[], position: Position | null): Bounds {
  const withPos = entries.filter(e => e.lat != null && e.lng != null);
  if (withPos.length >= 2) {
    const lats = withPos.map(e => e.lat!);
    const lngs = withPos.map(e => e.lng!);
    const padLat = Math.max((Math.max(...lats) - Math.min(...lats)) * 0.25, 0.004);
    const padLng = Math.max((Math.max(...lngs) - Math.min(...lngs)) * 0.25, 0.004);
    return {
      minLat: Math.min(...lats) - padLat, maxLat: Math.max(...lats) + padLat,
      minLng: Math.min(...lngs) - padLng, maxLng: Math.max(...lngs) + padLng,
    };
  }
  const center = withPos[0] ?? position;
  if (center) {
    const pad = 0.006;
    const lat = withPos[0]?.lat ?? (center as Position).lat;
    const lng = withPos[0]?.lng ?? (center as Position).lng;
    return { minLat: lat - pad, maxLat: lat + pad, minLng: lng - pad, maxLng: lng + pad };
  }
  // Default: arbitrary city-scale bounds
  return { minLat: 37.76, maxLat: 37.80, minLng: -122.44, maxLng: -122.40 };
}

export function AtlasBackground({ entries, position, opacity }: Props) {
  const W = window.innerWidth;
  const H = window.innerHeight;

  const bounds = useMemo(() => computeBounds(entries, position), [entries, position]);

  const project = (lat: number, lng: number): [number, number] => {
    const ranLat = bounds.maxLat - bounds.minLat || 0.01;
    const ranLng = bounds.maxLng - bounds.minLng || 0.01;
    const x = ((lng - bounds.minLng) / ranLng) * W;
    const y = (1 - (lat - bounds.minLat) / ranLat) * H;
    return [x, y];
  };

  const dots = useMemo(() =>
    entries
      .filter(e => e.lat != null && e.lng != null)
      .slice(0, 120) // cap rendering for performance
      .map(e => ({ id: e.id, type: e.type, pos: project(e.lat!, e.lng!) })),
    [entries, bounds, W, H], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const userPin = position ? project(position.lat, position.lng) : null;

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: C.ink050,
      opacity,
      transition: 'opacity 420ms ease',
    }}>
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern id="atlas-grid" x="0" y="0" width="60" height="60"
            patternUnits="userSpaceOnUse" patternTransform="rotate(-12)">
            <line x1="0" y1="0" x2="60" y2="0" stroke="rgba(243,236,224,0.048)" strokeWidth="0.5"/>
            <line x1="0" y1="0" x2="0" y2="60" stroke="rgba(243,236,224,0.048)" strokeWidth="0.5"/>
          </pattern>
          <radialGradient id="map-center" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(28,24,40,0.6)"/>
            <stop offset="100%" stopColor="transparent"/>
          </radialGradient>
        </defs>

        {/* Background vignette */}
        <rect width={W} height={H} fill="url(#map-center)"/>

        {/* Grid overlay */}
        <rect width={W} height={H} fill="url(#atlas-grid)"/>

        {/* Contour lines — topographic aesthetic */}
        <g stroke="rgba(243,236,224,0.08)" strokeWidth="1.2" fill="none">
          <path d={`M 0 ${H*0.28} Q ${W*0.28} ${H*0.23} ${W*0.62} ${H*0.30} T ${W} ${H*0.26}`}/>
          <path d={`M 0 ${H*0.50} Q ${W*0.32} ${H*0.46} ${W*0.68} ${H*0.52} T ${W} ${H*0.49}`}/>
          <path d={`M 0 ${H*0.72} Q ${W*0.38} ${H*0.68} ${W*0.72} ${H*0.75} T ${W} ${H*0.71}`}/>
          <path d={`M ${W*0.22} 0 Q ${W*0.19} ${H*0.5} ${W*0.26} ${H}`}/>
          <path d={`M ${W*0.67} 0 Q ${W*0.62} ${H*0.5} ${W*0.70} ${H}`}/>
        </g>
        <g stroke="rgba(243,236,224,0.04)" strokeWidth="0.7" fill="none">
          <path d={`M 0 ${H*0.39} Q ${W*0.35} ${H*0.35} ${W*0.70} ${H*0.41} T ${W} ${H*0.37}`}/>
          <path d={`M 0 ${H*0.61} Q ${W*0.30} ${H*0.58} ${W*0.65} ${H*0.63} T ${W} ${H*0.59}`}/>
          <path d={`M ${W*0.44} 0 Q ${W*0.40} ${H*0.5} ${W*0.47} ${H}`}/>
        </g>

        {/* Park / green fill regions */}
        <g fill="rgba(60,80,50,0.12)">
          <path d={`M ${W*0.30} ${H*0.32} Q ${W*0.42} ${H*0.26} ${W*0.50} ${H*0.35} Q ${W*0.48} ${H*0.45} ${W*0.34} ${H*0.42} Q ${W*0.24} ${H*0.38} ${W*0.30} ${H*0.32} Z`}/>
        </g>

        {/* Entry type dots */}
        {dots.map(({ id, type, pos }) => {
          const col = typeColor(type);
          return (
            <g key={id}>
              <circle cx={pos[0]} cy={pos[1]} r={5} fill={col} opacity={0.18}/>
              <circle cx={pos[0]} cy={pos[1]} r={2.5} fill={col} opacity={0.75}/>
            </g>
          );
        })}

        {/* User's current location — pulsing ember pin */}
        {userPin && (
          <g>
            <circle cx={userPin[0]} cy={userPin[1]} r={18} fill={C.ember} opacity={0.08}>
              <animate attributeName="r" values="12;22;12" dur="2.4s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.08;0.04;0.08" dur="2.4s" repeatCount="indefinite"/>
            </circle>
            <circle cx={userPin[0]} cy={userPin[1]} r={5} fill={C.ember} opacity={0.9}/>
          </g>
        )}
      </svg>

      {/* "here · now" label above pin */}
      {userPin && (
        <div style={{
          position: 'absolute',
          left: userPin[0],
          top: userPin[1] - 22,
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

      {/* Film grain */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: GRAIN_URL,
        mixBlendMode: 'overlay',
        opacity: 0.55,
        pointerEvents: 'none',
      }} />
    </div>
  );
}
