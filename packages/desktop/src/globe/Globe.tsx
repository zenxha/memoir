import React, { useEffect, useRef, useState } from 'react';
import { Box, Button } from '@mantine/core';
import { Entry } from '@memoir/contract';
import { StreetMap } from './StreetMap';

// NOTE: This file is on death row — Phase B retires Three.js for Mapbox v3 globe projection.
// The @ts-expect-error lines below cover Three.js namespace usage that needs proper typing.
// Don't bother fixing — the file will be deleted.
// eslint-disable-next-line @typescript-eslint/no-namespace
declare const THREE: typeof import('three');

const TYPE_COLORS: Record<string, number> = {
  audio: 0x5b8cff, photo: 0xff8c42, moment: 0x44dd88, note: 0xcc88ff,
};
const GLOBE_MIN_Z = 1.38;

interface Props {
  entries: Entry[];
  onEntryClick: (entry: Entry) => void;
  onModeChange: (mode: 'globe' | 'map') => void;
}

export function Globe({ entries, onEntryClick, onModeChange }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const stateRef   = useRef<GlobeState | null>(null);
  const [mode, setMode] = useState<'globe' | 'map'>('globe');
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);

  // Boot Three.js once
  useEffect(() => {
    if (!canvasRef.current || stateRef.current) return;
    stateRef.current = initGlobe(canvasRef.current, onEntryClick, (center) => {
      setMapCenter(center);
      setMode('map');
      onModeChange('map');
    });
    return () => stateRef.current?.destroy();
  }, []);

  // Sync entries to globe points
  useEffect(() => {
    stateRef.current?.syncEntries(entries);
  }, [entries]);

  const backToGlobe = () => {
    setMode('globe');
    onModeChange('globe');
    setMapCenter(null);
  };

  return (
    <Box style={{ position: 'relative', width: '100%', height: '100%', background: '#080808' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%', transition: 'opacity 0.5s', opacity: mode === 'globe' ? 1 : 0, pointerEvents: mode === 'globe' ? 'auto' : 'none' }}
      />
      {mode === 'map' && mapCenter && (
        <StreetMap center={mapCenter} entries={entries} onEntryClick={onEntryClick} />
      )}
      {mode === 'map' && (
        <Button
          size="xs"
          variant="default"
          style={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}
          onClick={backToGlobe}
        >
          ↑ Globe
        </Button>
      )}
    </Box>
  );
}

// ── Three.js imperative setup ─────────────────────────────────────────────────

interface GlobeState {
  syncEntries: (entries: Entry[]) => void;
  destroy: () => void;
}

function initGlobe(
  canvas: HTMLCanvasElement,
  onEntryClick: (e: Entry) => void,
  onZoomIn: (center: { lat: number; lng: number }) => void,
): GlobeState {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(devicePixelRatio);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  camera.position.z = 2.8;

  const resize = () => {
    const w = canvas.parentElement!.clientWidth;
    const h = canvas.parentElement!.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize);
  resize();

  // Globe
  scene.add(new THREE.Mesh(
    new THREE.SphereGeometry(1, 64, 64),
    new THREE.MeshPhongMaterial({ color: 0x0a1628, emissive: 0x040810, transparent: true, opacity: 0.95 }),
  ));
  scene.add(new THREE.Mesh(
    new THREE.SphereGeometry(1.001, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0x1a3060, wireframe: true, transparent: true, opacity: 0.15 }),
  ));
  scene.add(new THREE.Mesh(
    new THREE.SphereGeometry(1.05, 32, 32),
    new THREE.MeshPhongMaterial({ color: 0x1a4080, transparent: true, opacity: 0.12, side: THREE.BackSide }),
  ));
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(5, 3, 5);
  scene.add(sun);

  // Entry points
  const pointsGroup = new THREE.Group();
  scene.add(pointsGroup);
  // @ts-expect-error THREE namespace from CDN — death-row code, fixed by Phase B retirement
  const meshMap = new Map<string, { mesh: THREE.Mesh; entry: Entry }>();

  function latLngToXYZ(lat: number, lng: number, r = 1.02) {
    const phi   = (90 - lat)  * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    return new THREE.Vector3(
      -r * Math.sin(phi) * Math.cos(theta),
       r * Math.cos(phi),
       r * Math.sin(phi) * Math.sin(theta),
    );
  }

  function syncEntries(entries: Entry[]) {
    const ids = new Set(entries.map(e => e.id));
    // Remove stale
    for (const [id, { mesh }] of meshMap) {
      if (!ids.has(id)) { pointsGroup.remove(mesh); meshMap.delete(id); }
    }
    // Add new
    for (const entry of entries) {
      if (entry.lat == null || entry.lng == null || meshMap.has(entry.id)) continue;
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.008, 8, 8),
        new THREE.MeshBasicMaterial({ color: TYPE_COLORS[entry.type] ?? 0xffffff }),
      );
      mesh.position.copy(latLngToXYZ(entry.lat, entry.lng));
      (mesh as any).__entry = entry;
      pointsGroup.add(mesh);
      meshMap.set(entry.id, { mesh, entry });
    }
  }

  // Controls
  let isDragging = false, lastMouse = { x: 0, y: 0 };
  let rotX = 0, rotY = 0, targetRotX = 0, targetRotY = 0;
  let zoom = 2.8, targetZoom = 2.8;

  const onMouseDown = (e: MouseEvent) => { isDragging = true; lastMouse = { x: e.clientX, y: e.clientY }; };
  const onMouseUp   = () => isDragging = false;
  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    targetRotY += (e.clientX - lastMouse.x) * 0.005;
    targetRotX += (e.clientY - lastMouse.y) * 0.005;
    targetRotX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, targetRotX));
    lastMouse = { x: e.clientX, y: e.clientY };
  };
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const next = targetZoom + e.deltaY * 0.003;
    if (next < GLOBE_MIN_Z) {
      const lat = -rotX * (180 / Math.PI);
      const lng = ((-rotY * (180 / Math.PI)) % 360 + 540) % 360 - 180;
      onZoomIn({ lat: Math.max(-85, Math.min(85, lat)), lng });
    } else {
      targetZoom = Math.min(5, next);
    }
  };

  // Click → raycast
  const raycaster = new THREE.Raycaster();
  const mouse2d   = new THREE.Vector2();
  const onClick = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    mouse2d.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    mouse2d.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse2d, camera);
    const hits = raycaster.intersectObjects([...meshMap.values()].map(v => v.mesh));
    if (hits[0]) onEntryClick((hits[0].object as any).__entry);
  };

  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('click', onClick);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('mousemove', onMouseMove);

  let rafId: number;
  // @ts-expect-error THREE namespace from CDN — death-row code
  const globe = scene.children[0] as THREE.Mesh;

  function animate() {
    rafId = requestAnimationFrame(animate);
    rotX += (targetRotX - rotX) * 0.08;
    rotY += (targetRotY - rotY) * 0.08;
    zoom += (targetZoom - zoom) * 0.08;
    globe.rotation.x = rotX;
    globe.rotation.y = rotY;
    pointsGroup.rotation.x = rotX;
    pointsGroup.rotation.y = rotY;
    camera.position.z = zoom;
    renderer.render(scene, camera);
  }
  animate();

  return {
    syncEntries,
    destroy: () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('wheel', onWheel);
      renderer.dispose();
    },
  };
}
