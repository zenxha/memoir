/**
 * Google Takeout historical import.
 *
 * Imports two data sets from a Google Takeout export directory:
 *
 *   Location History → moment entries
 *     File: Takeout/Location History/Records.json
 *     Creates one `moment` entry per location point (deduplicated by external_id).
 *     Optionally thinned to one point per N minutes to avoid flooding the archive.
 *
 *   Photos → photo entries
 *     Scans any directory for .jpg/.jpeg/.png files, reads EXIF for GPS + timestamp.
 *
 * Usage:
 *   pnpm takeout -- --dir /path/to/Takeout
 *   pnpm takeout -- --dir /path/to/Takeout --location-only
 *   pnpm takeout -- --dir /path/to/Takeout --photos-only
 *   pnpm takeout -- --dir /path/to/Takeout --thin-minutes 10   (default: 5)
 *
 * Requires the server to be running. Uses MEMOIR_API env var (default https://localhost:3000).
 */

import * as fs   from 'fs';
import * as path from 'path';

const API           = process.env.MEMOIR_API ?? 'http://localhost:3000';
const IMAGE_EXTS    = new Set(['.jpg', '.jpeg', '.png', '.heic']);

interface LocationRecord {
  timestamp:    string;  // ISO 8601
  latitudeE7:   number;
  longitudeE7:  number;
  accuracy?:    number;
}

async function post(body: Record<string, unknown>) {
  const res = await fetch(`${API}/api/entries`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json();
}

async function importLocation(dir: string, thinMinutes: number) {
  const candidates = [
    path.join(dir, 'Location History', 'Records.json'),
    path.join(dir, 'Location History (Timeline)', 'Records.json'),
    path.join(dir, 'Semantic Location History'),
  ];

  let recordsFile: string | null = null;
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) { recordsFile = c; break; }
  }

  if (!recordsFile) {
    console.log('Location History records file not found — skipping');
    return;
  }

  console.log(`Parsing ${recordsFile}…`);
  const raw:  { locations: LocationRecord[] } = JSON.parse(fs.readFileSync(recordsFile, 'utf8'));
  const records = raw.locations ?? [];
  console.log(`  ${records.length} location points`);

  const thinMs  = thinMinutes * 60 * 1000;
  let lastTs    = 0;
  let imported  = 0;
  let skipped   = 0;

  for (const rec of records) {
    const ts  = new Date(rec.timestamp).getTime();
    if (isNaN(ts)) { skipped++; continue; }
    if (ts - lastTs < thinMs)  { skipped++; continue; }

    const externalId = `takeout:loc:${ts}`;
    try {
      await post({
        type:        'moment',
        source:      'takeout',
        created_at:  ts,
        lat:         rec.latitudeE7  / 1e7,
        lng:         rec.longitudeE7 / 1e7,
        accuracy:    rec.accuracy ?? null,
        external_id: externalId,
      });
      imported++;
      lastTs = ts;
      if (imported % 100 === 0) process.stdout.write(`  ${imported} imported…\r`);
    } catch (e: any) {
      if (e.message?.includes('UNIQUE')) { skipped++; continue; }
      console.warn(`  skip ${externalId}: ${e.message}`);
      skipped++;
    }
  }
  console.log(`  Location: ${imported} imported, ${skipped} skipped`);
}

async function importPhotos(dir: string) {
  const exifr = await import('exifr');
  const files: string[] = [];

  function scan(d: string) {
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, f.name);
      if (f.isDirectory()) { scan(full); continue; }
      if (IMAGE_EXTS.has(path.extname(f.name).toLowerCase())) files.push(full);
    }
  }
  scan(dir);

  console.log(`  Found ${files.length} image files`);
  let imported = 0; let skipped = 0;

  for (const file of files) {
    const externalId = `takeout:photo:${path.basename(file)}`;
    let lat: number | undefined, lng: number | undefined, ts = fs.statSync(file).mtimeMs;

    try {
      const gps = await exifr.default.gps(file).catch(() => null);
      if (gps?.latitude != null)  lat = gps.latitude;
      if (gps?.longitude != null) lng = gps.longitude;
      const exif = await exifr.default.parse(file, ['DateTimeOriginal']).catch(() => null);
      if (exif?.DateTimeOriginal) ts = new Date(exif.DateTimeOriginal).getTime();
    } catch { /* use file mtime */ }

    try {
      await post({
        type:        'photo',
        source:      'takeout',
        created_at:  ts,
        media_path:  file,
        external_id: externalId,
        ...(lat != null && lng != null ? { lat, lng } : {}),
      });
      imported++;
      if (imported % 50 === 0) process.stdout.write(`  ${imported} photos imported…\r`);
    } catch (e: any) {
      if (e.message?.includes('UNIQUE')) { skipped++; continue; }
      skipped++;
    }
  }
  console.log(`  Photos: ${imported} imported, ${skipped} skipped`);
}

async function main() {
  const args         = process.argv.slice(2);
  const dir          = args.find((_, i) => args[i - 1] === '--dir') ?? '.';
  const locationOnly = args.includes('--location-only');
  const photosOnly   = args.includes('--photos-only');
  const thinMinutes  = Number(args.find((_, i) => args[i - 1] === '--thin-minutes') ?? 5);

  if (!fs.existsSync(dir)) { console.error(`Directory not found: ${dir}`); process.exit(1); }
  console.log(`Importing Takeout from ${path.resolve(dir)} against ${API}`);

  if (!photosOnly)   await importLocation(dir, thinMinutes);
  if (!locationOnly) await importPhotos(dir);

  console.log('Done.');
}

main().catch(e => { console.error(e); process.exit(1); });
