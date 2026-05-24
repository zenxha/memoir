// Cosmographic Atlas design system — matches desktop palette

export const C = {
  ink000: '#07060a',
  ink050: '#0c0a10',
  ink100: '#131119',
  ink200: '#1c1924',
  ink300: '#2a2632',
  ink400: '#3d3848',
  paper900: '#f3ece0',
  paper700: '#c8c0b3',
  paper500: '#8a8377',
  paper400: '#6a6358',
  paper300: '#4d4940',
  audio:  'oklch(72% 0.13 250)',
  photo:  'oklch(78% 0.13 55)',
  moment: 'oklch(74% 0.10 145)',
  note:   'oklch(74% 0.10 15)',
  ember:  'oklch(76% 0.16 35)',
  audioGlow:  'oklch(72% 0.13 250 / 0.45)',
  photoGlow:  'oklch(78% 0.13 55 / 0.45)',
  momentGlow: 'oklch(74% 0.10 145 / 0.45)',
  noteGlow:   'oklch(74% 0.10 15 / 0.45)',
  emberGlow:  'oklch(76% 0.16 35 / 0.45)',
} as const;

export const F = {
  display: '"Instrument Serif", "Times New Roman", serif',
  ui:      '"Geist", -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif',
  mono:    '"JetBrains Mono", "SF Mono", ui-monospace, monospace',
} as const;

export function typeColor(type: string): string {
  switch (type) {
    case 'audio':  return C.audio;
    case 'photo':  return C.photo;
    case 'moment': return C.moment;
    case 'note':   return C.note;
    default:       return C.paper500;
  }
}

export function typeGlow(type: string): string {
  switch (type) {
    case 'audio':  return C.audioGlow;
    case 'photo':  return C.photoGlow;
    case 'moment': return C.momentGlow;
    case 'note':   return C.noteGlow;
    default:       return 'transparent';
  }
}

export function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function timeAgo(ms: number): string {
  const d = Date.now() - ms;
  if (d < 60_000)    return 'just now';
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h`;
  return `${Math.floor(d / 86_400_000)}d`;
}

export interface DayGroup {
  key: string;
  dayLabel: string;
  dateStr: string;
  entries: import('@memoir/contract').Entry[];
}

export function groupByDay(entries: import('@memoir/contract').Entry[]): DayGroup[] {
  const map = new Map<string, import('@memoir/contract').Entry[]>();
  for (const e of entries) {
    const d = new Date(e.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  const today     = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);

  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, ents]) => {
      const d = new Date(ents[0].created_at);
      const isToday = d.toDateString() === today.toDateString();
      const isYest  = d.toDateString() === yesterday.toDateString();
      return {
        key,
        dayLabel: isToday ? 'Today' : isYest ? 'Yesterday' :
          d.toLocaleDateString('en-US', { weekday: 'long' }),
        dateStr: d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
        entries: ents,
      };
    });
}

// Film grain SVG data URI (shared between components)
export const GRAIN_URL = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.06 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;
