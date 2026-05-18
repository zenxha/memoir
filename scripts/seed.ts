/**
 * Seed the running dev server with realistic entries across types/places/dates.
 *
 *   pnpm seed                 # ~50 entries, all types, last 14 days, SF Bay Area
 *   pnpm seed -- --count 200  # custom
 *   pnpm seed -- --reset      # delete all entries first
 *
 * Assumes the server is running on http://localhost:3000.
 */

const API = process.env.MEMOIR_API ?? 'http://localhost:3000';

const PLACES = [
  { name: 'Mission',         lat: 37.7599, lng: -122.4148 },
  { name: 'Dolores Park',    lat: 37.7596, lng: -122.4269 },
  { name: 'Sunset',          lat: 37.7505, lng: -122.4868 },
  { name: 'Marina',          lat: 37.8030, lng: -122.4378 },
  { name: 'North Beach',     lat: 37.8067, lng: -122.4101 },
  { name: 'Twin Peaks',      lat: 37.7544, lng: -122.4477 },
  { name: 'Berkeley',        lat: 37.8716, lng: -122.2727 },
  { name: 'Oakland',         lat: 37.8044, lng: -122.2712 },
  { name: 'Sausalito',       lat: 37.8590, lng: -122.4853 },
  { name: 'Castro',          lat: 37.7609, lng: -122.4350 },
];

const TYPES = ['audio', 'photo', 'photo', 'photo', 'photo', 'moment', 'note'] as const;
// photos weighted heavier — matches the "ambient stratum" model

const NOTES = [
  'a quiet morning',
  'the wind was loud',
  'something about the light',
  'her face when she laughed',
  'I should remember this',
  'a thought to follow later',
];

const MUSIC = [
  { music_title: 'Avril 14th',          music_artist: 'Aphex Twin' },
  { music_title: 'Strawberry Swing',    music_artist: 'Frank Ocean' },
  { music_title: 'Resonance',           music_artist: 'HOME' },
  { music_title: 'Nothing\'s Gonna Hurt You Baby', music_artist: 'Cigarettes After Sex' },
];

function jitter(value: number, range: number) {
  return value + (Math.random() - 0.5) * range;
}

async function main() {
  const args = process.argv.slice(2);
  const count = Number(args.find((_, i) => args[i - 1] === '--count') ?? 50);
  const reset = args.includes('--reset');

  if (reset) {
    console.log('Resetting — deleting all existing entries…');
    const res = await fetch(`${API}/api/entries?limit=10000`);
    const entries = (await res.json()) as { id: string }[];
    for (const e of entries) {
      await fetch(`${API}/api/entries/${e.id}`, { method: 'DELETE' });
    }
    console.log(`Deleted ${entries.length}.`);
  }

  console.log(`Seeding ${count} entries against ${API}…`);
  const now = Date.now();
  const dayMs = 86_400_000;

  for (let i = 0; i < count; i++) {
    const type = TYPES[Math.floor(Math.random() * TYPES.length)];
    const place = PLACES[Math.floor(Math.random() * PLACES.length)];
    const daysAgo = Math.floor(Math.random() * 14);
    const created_at = now - daysAgo * dayMs - Math.random() * dayMs;

    const body: Record<string, unknown> = {
      type,
      lat: jitter(place.lat, 0.01),
      lng: jitter(place.lng, 0.01),
      accuracy: Math.floor(Math.random() * 20) + 5,
      created_at,
    };

    if (type === 'audio') body.duration_ms = Math.floor(Math.random() * 90_000) + 5_000;
    if (type === 'note')  body.body = NOTES[Math.floor(Math.random() * NOTES.length)];
    if (type === 'moment' && Math.random() < 0.5) {
      const m = MUSIC[Math.floor(Math.random() * MUSIC.length)];
      body.music_title = m.music_title;
      body.music_artist = m.music_artist;
    }

    const res = await fetch(`${API}/api/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error(`Failed entry ${i}: ${res.status} ${await res.text()}`);
      continue;
    }
    process.stdout.write('.');
  }
  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
