import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { migrations } from '../db/migrations';

// Hoisted controllable handle for child_process.execFile inside PeaksService.
// vi.hoisted runs before the vi.mock() factory below (which itself is hoisted
// above module-level imports), so the factory + the test bodies share one ref.
const execFileMock = vi.hoisted(() => vi.fn());

vi.mock('child_process', async () => {
  const actual = await vi.importActual<typeof import('child_process')>('child_process');
  return {
    ...actual,
    execFile: execFileMock,
  };
});

/**
 * PeaksService contract (Phase 4, plan 04 — INFRA-05).
 *
 *   - onApplicationBootstrap probes `audiowaveform --version`. If the binary is
 *     missing, `enabled` stays false and a log line is emitted.
 *   - Backfill SELECT predicate (D-18): only audio entries with media_path NOT NULL
 *     AND peaks_path NULL. Other types and already-peaked entries are skipped.
 *   - generateOne writes JSON to ${DATA_DIR}/media/peaks/${entryId}.json and updates
 *     entries.peaks_path to 'media/peaks/${entryId}.json' (D-17).
 *   - JSON shape: keys version, channels, sample_rate, bits=8, length, data (int8 array).
 *   - Unsafe entryIds (regex /^[0-9a-zA-Z_-]+$/ failure, e.g., '../etc/passwd') are
 *     rejected with a warn log; no file is written outside the peaks dir.
 *
 * Real-binary tests are gated with `it.skipIf(!commandOnPath('audiowaveform'))` so CI
 * without the binary still passes — the binary-probe + backfill-predicate paths run
 * unconditionally via a child_process.execFile mock.
 */

function commandOnPath(cmd: string): boolean {
  try {
    execFileSync('which', [cmd], { stdio: ['ignore', 'ignore', 'ignore'] });
    return true;
  } catch {
    return false;
  }
}

function runMigrations(db: Database.Database) {
  const current = db.pragma('user_version', { simple: true }) as number;
  const pending = migrations
    .slice()
    .sort((a, b) => a.version - b.version)
    .filter(m => m.version > current);
  for (const m of pending) {
    const tx = db.transaction(() => {
      db.exec(m.sql);
      db.pragma(`user_version = ${m.version}`);
    });
    tx();
  }
}

function insertAudio(
  db: Database.Database,
  fields: { id: string; media_path: string | null; peaks_path?: string | null; created_at?: number },
) {
  db.prepare(
    `INSERT INTO entries (id, created_at, type, media_path, peaks_path)
     VALUES (?, ?, 'audio', ?, ?)`,
  ).run(fields.id, fields.created_at ?? Date.now(), fields.media_path, fields.peaks_path ?? null);
}

function insertNote(db: Database.Database, id: string) {
  db.prepare(
    `INSERT INTO entries (id, created_at, type, body) VALUES (?, ?, 'note', 'hi')`,
  ).run(id, Date.now());
}

let tmpDir: string;
let dbPath: string;
let db: Database.Database;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memoir-peaks-'));
  fs.mkdirSync(path.join(tmpDir, 'media'), { recursive: true });
  process.env.MEMOIR_DATA_DIR = tmpDir;
  dbPath = path.join(tmpDir, 'memoir.db');
  db = new Database(dbPath);
  sqliteVec.load(db);
  runMigrations(db);
  // Default: every probe / generation call errors out. Individual tests can
  // override via execFileMock.mockImplementation(...).
  execFileMock.mockReset();
  execFileMock.mockImplementation((..._args: any[]) => {
    const cb = _args[_args.length - 1];
    if (typeof cb === 'function') cb(new Error('ENOENT — audiowaveform not mocked for this test'));
    return {} as any;
  });
});

afterEach(() => {
  try { db.close(); } catch { /* noop */ }
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.MEMOIR_DATA_DIR;
});

describe('PeaksService', () => {
  it('onApplicationBootstrap: binary missing → enabled stays false; log emitted', async () => {
    // execFileMock default impl in beforeEach already errors with ENOENT.
    const logSpy = vi.fn();

    const { PeaksService } = await import('./peaks.service');
    const svc = new PeaksService(db as any);
    (svc as any).log = { log: logSpy, warn: vi.fn() };
    svc.onApplicationBootstrap();

    // The probe runs synchronously via the mock callback above.
    expect((svc as any).enabled).toBe(false);
    expect(logSpy).toHaveBeenCalled();
    const msgs = logSpy.mock.calls.map(c => String(c[0]));
    expect(msgs.some(m => /audiowaveform/i.test(m))).toBe(true);
  });

  it('backfill SELECT predicate: returns ONLY audio entries with media_path AND peaks_path IS NULL', async () => {
    // Seed three rows.
    insertAudio(db, { id: 'a-needs', media_path: 'media/a.wav', peaks_path: null });
    insertAudio(db, { id: 'b-done', media_path: 'media/b.wav', peaks_path: 'media/peaks/b.json' });
    insertNote(db, 'c-note');

    // Construct the service and intercept generateOne.
    const { PeaksService } = await import('./peaks.service');
    const svc = new PeaksService(db as any);
    (svc as any).enabled = true;
    const generated: Array<[string, string]> = [];
    (svc as any).generateOne = (id: string, mediaPath: string) => {
      generated.push([id, mediaPath]);
    };

    // Force-call backfill (private).
    (svc as any).backfill();

    // setTimeout drives the tick loop — flush microtasks + a few timer ticks.
    await new Promise(r => setTimeout(r, 250));

    expect(generated.length).toBe(1);
    expect(generated[0][0]).toBe('a-needs');
    expect(generated[0][1]).toBe('media/a.wav');
  });

  it('rejects unsafe entryId — no file written, warn log emitted', async () => {
    const { PeaksService } = await import('./peaks.service');
    const svc = new PeaksService(db as any);
    (svc as any).enabled = true;
    const warn = vi.fn();
    (svc as any).log = { log: vi.fn(), warn };

    (svc as any).generateOne('../../etc/passwd', 'media/test.wav');

    // No file under peaks/ should exist.
    const peaksDir = path.join(tmpDir, 'media', 'peaks');
    if (fs.existsSync(peaksDir)) {
      const listing = fs.readdirSync(peaksDir);
      expect(listing.length).toBe(0);
    }
    // Nothing must exist anywhere else under tmpDir/etc.
    expect(fs.existsSync(path.join(tmpDir, 'etc'))).toBe(false);
    expect(warn).toHaveBeenCalled();
    expect(warn.mock.calls.some(c => /unsafe/i.test(String(c[0])))).toBe(true);
  });

  it.skipIf(!commandOnPath('audiowaveform'))(
    'real audiowaveform: generateOne writes peaks JSON with expected shape AND updates entries.peaks_path',
    async () => {
      // Build a 1s mono 16kHz silent WAV under tmpDir/media/test.wav.
      const wavPath = path.join(tmpDir, 'media', 'test.wav');
      writeSilentWav(wavPath, { sampleRate: 16000, durationSec: 1 });

      // Seed a matching audio entry.
      insertAudio(db, { id: 'real1', media_path: 'media/test.wav', peaks_path: null });

      const { PeaksService } = await import('./peaks.service');
      const svc = new PeaksService(db as any);
      (svc as any).enabled = true;

      (svc as any).generateOne('real1', 'media/test.wav');

      // Wait for execFile callback to land. 5s budget for cold binary.
      const peaksAbs = path.join(tmpDir, 'media', 'peaks', 'real1.json');
      await waitForFile(peaksAbs, 5000);

      expect(fs.existsSync(peaksAbs)).toBe(true);
      const parsed = JSON.parse(fs.readFileSync(peaksAbs, 'utf8'));
      expect(parsed).toMatchObject({ bits: 8 });
      expect(parsed).toHaveProperty('version');
      expect(parsed).toHaveProperty('channels');
      expect(parsed).toHaveProperty('sample_rate');
      expect(parsed).toHaveProperty('length');
      expect(Array.isArray(parsed.data)).toBe(true);

      // DB updated via the same execFile callback. Poll briefly.
      let row: { peaks_path: string | null } | undefined;
      for (let i = 0; i < 20; i++) {
        row = db.prepare('SELECT peaks_path FROM entries WHERE id = ?').get('real1') as any;
        if (row?.peaks_path) break;
        await new Promise(r => setTimeout(r, 100));
      }
      expect(row?.peaks_path).toBe('media/peaks/real1.json');
    },
  );
});

// ── helpers ───────────────────────────────────────────────────────────────────

function writeSilentWav(file: string, opts: { sampleRate: number; durationSec: number }) {
  const { sampleRate, durationSec } = opts;
  const numSamples = sampleRate * durationSec;
  const byteRate = sampleRate * 2; // mono, 16-bit
  const blockAlign = 2;
  const dataBytes = numSamples * 2;
  const buf = Buffer.alloc(44 + dataBytes);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataBytes, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(blockAlign, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataBytes, 40);
  // samples are already zero-filled by Buffer.alloc
  fs.writeFileSync(file, buf);
}

async function waitForFile(file: string, timeoutMs: number) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (fs.existsSync(file)) return;
    await new Promise(r => setTimeout(r, 100));
  }
}
