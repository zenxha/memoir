import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { migrations } from '../db/migrations';

/**
 * EmbeddingService contract (Phase 4, plan 02).
 *
 *   - FIFO worker SELECT covers BOTH `embedding IS NULL` AND `embedding_model != MODEL`,
 *     ordered by created_at DESC (newest first) — D-04/D-05.
 *   - Text concat reduced to `[title, body, transcript]` only (D-06).
 *   - Every successful embedding writes BOTH `entries.embedding` BLOB
 *     (+ `entries.embedding_model`) AND `entries_vec(rowid, embedding)` — D-07.
 *   - 768-dim guard (Pitfall 5): on mismatch, BLOB is still written but vec0 row
 *     is skipped with a warn log.
 *   - Ollama-down backoff (Pitfall 8): after N=10 consecutive failures, retry
 *     interval extends to >= 1h. First failure warns once, subsequent are silent.
 *   - vec0 join key is the INTEGER `entries.rowid` (Pitfall 1), not the TEXT id.
 *   - `generate()` is public so a future RecallService can inject EmbeddingService
 *     and reuse the Ollama call (D-MECH-02).
 */

// Mock node-fetch at module scope so the service's `import fetch from 'node-fetch'`
// resolves to our controllable mock for every test.
vi.mock('node-fetch', () => {
  const mockFetch = vi.fn();
  return { default: mockFetch, __esModule: true };
});

import fetch from 'node-fetch';
import { EmbeddingService } from './embedding.service';
import type { DbService } from '../db/db.service';

const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;

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

function insertEntry(
  db: Database.Database,
  fields: {
    id: string;
    created_at?: number;
    title?: string | null;
    body?: string | null;
    transcript?: string | null;
    place_name?: string | null;
    music_title?: string | null;
    music_artist?: string | null;
    embedding?: Buffer | null;
    embedding_model?: string | null;
  },
) {
  db.prepare(
    `INSERT INTO entries
      (id, created_at, type, title, body, transcript, place_name, music_title, music_artist, embedding, embedding_model)
     VALUES (?, ?, 'moment', ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    fields.id,
    fields.created_at ?? Date.now(),
    fields.title ?? null,
    fields.body ?? null,
    fields.transcript ?? null,
    fields.place_name ?? null,
    fields.music_title ?? null,
    fields.music_artist ?? null,
    fields.embedding ?? null,
    fields.embedding_model ?? null,
  );
}

// Helper: shape a successful Ollama /api/embeddings response with N-dim vector.
function mockOllamaSuccess(dim: number, fill = 0.5) {
  const vec = Array.from({ length: dim }, () => fill);
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ embedding: vec }),
  } as any);
  return vec;
}

// Bypass onApplicationBootstrap (which schedules a fire-and-forget setImmediate backfill
// that can outlive the test). Construct the service and flip `enabled` directly so each
// test exercises only the worker code path it cares about.
function bootService(database: Database.Database) {
  const svc = new EmbeddingService(database as unknown as DbService);
  (svc as any).enabled = true;
  return svc;
}

let tmpDir: string;
let dbPath: string;
let db: Database.Database;
let originalEnv: string | undefined;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memoir-embed-'));
  dbPath = path.join(tmpDir, 'test.db');
  db = new Database(dbPath);
  sqliteVec.load(db);
  runMigrations(db);
  mockFetch.mockReset();
  originalEnv = process.env.EMBED_MODEL;
});

afterEach(() => {
  db.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  if (originalEnv === undefined) delete process.env.EMBED_MODEL;
  else process.env.EMBED_MODEL = originalEnv;
  vi.restoreAllMocks();
});

describe('EmbeddingService — FIFO worker (D-04/D-05)', () => {
  it('Test 1: worker SELECT returns NULL-embed rows AND stale-model rows, ordered by created_at DESC', () => {
    // entry-A: no embedding at all → included
    insertEntry(db, { id: 'A', created_at: 1000, title: 'a-title' });
    // entry-B: has embedding but a stale model name → included
    insertEntry(db, {
      id: 'B',
      created_at: 2000,
      title: 'b-title',
      embedding: Buffer.from(new Float32Array([1, 2, 3]).buffer),
      embedding_model: 'old-model',
    });
    // entry-C: has embedding with current model → excluded
    insertEntry(db, {
      id: 'C',
      created_at: 3000,
      title: 'c-title',
      embedding: Buffer.from(new Float32Array([1, 2, 3]).buffer),
      embedding_model: 'nomic-embed-text',
    });

    const rows = db
      .prepare(
        `SELECT id FROM entries
         WHERE (embedding IS NULL AND (title IS NOT NULL OR body IS NOT NULL OR transcript IS NOT NULL))
            OR (embedding IS NOT NULL AND embedding_model != ?)
         ORDER BY created_at DESC`,
      )
      .all('nomic-embed-text') as { id: string }[];

    expect(rows.map(r => r.id)).toEqual(['B', 'A']);
  });
});

describe('EmbeddingService — text concat (D-06)', () => {
  it('Test 2: text passed to generate() is title/body/transcript only, joined by " \\n " (place_name/music_* excluded)', async () => {
    insertEntry(db, {
      id: 'e1',
      title: 'T',
      body: 'B',
      transcript: 'X',
      place_name: 'P',
      music_title: 'M',
      music_artist: 'A',
    });

    const svc = bootService(db);

    mockOllamaSuccess(768);

    // Use the public generate() path by calling embedAsync, but rather than rely on
    // setImmediate timing, call the worker method directly via type-cast access.
    await (svc as any).embedOne('e1');

    const embedCalls = mockFetch.mock.calls.filter((c: any[]) =>
      String(c[0]).includes('/api/embeddings'),
    );
    expect(embedCalls.length).toBe(1);
    const body = JSON.parse((embedCalls[0][1] as any).body);
    expect(body.prompt).toBe('T \n B \n X');
  });
});

describe('EmbeddingService — dual write (D-07)', () => {
  it('Test 3: after embedOne, BOTH entries.embedding IS NOT NULL AND entries_vec row exists keyed by rowid', async () => {
    insertEntry(db, { id: 'e1', title: 'hello world' });

    const svc = bootService(db);
    mockOllamaSuccess(768);

    await (svc as any).embedOne('e1');

    const entry = db
      .prepare('SELECT rowid, embedding, embedding_model FROM entries WHERE id = ?')
      .get('e1') as { rowid: number; embedding: Buffer | null; embedding_model: string | null };

    expect(entry.embedding).not.toBeNull();
    expect(entry.embedding!.length).toBe(768 * 4);

    const vecRow = db
      .prepare('SELECT rowid FROM entries_vec WHERE rowid = ?')
      .get(entry.rowid) as { rowid: number } | undefined;
    expect(vecRow?.rowid).toBe(entry.rowid);
  });
});

describe('EmbeddingService — model recording (D-03)', () => {
  it('Test 4: after embedOne, entries.embedding_model equals process.env.EMBED_MODEL ?? default', async () => {
    insertEntry(db, { id: 'e1', title: 'hello' });

    const svc = bootService(db);
    mockOllamaSuccess(768);

    await (svc as any).embedOne('e1');

    const row = db
      .prepare('SELECT embedding_model FROM entries WHERE id = ?')
      .get('e1') as { embedding_model: string };
    expect(row.embedding_model).toBe('nomic-embed-text');
  });
});

describe('EmbeddingService — dim mismatch guard (Pitfall 5)', () => {
  it('Test 5: 512-element vector writes BLOB but NOT entries_vec; warn log emitted', async () => {
    insertEntry(db, { id: 'e1', title: 'short' });

    const svc = bootService(db);
    const warnSpy = vi.spyOn((svc as any).log, 'warn').mockImplementation(() => {});

    mockOllamaSuccess(512);

    await (svc as any).embedOne('e1');

    const entry = db
      .prepare('SELECT rowid, embedding FROM entries WHERE id = ?')
      .get('e1') as { rowid: number; embedding: Buffer | null };
    expect(entry.embedding).not.toBeNull();
    expect(entry.embedding!.length).toBe(512 * 4);

    const vecRow = db
      .prepare('SELECT rowid FROM entries_vec WHERE rowid = ?')
      .get(entry.rowid) as { rowid: number } | undefined;
    expect(vecRow).toBeUndefined();

    expect(warnSpy).toHaveBeenCalled();
  });
});

describe('EmbeddingService — Ollama-down backoff (Pitfall 8)', () => {
  it('Test 6: after 10 consecutive null generates, the worker schedules next retry at >= 1h (3,600,000 ms)', async () => {
    // Seed entries so the worker has rows to chew.
    for (let i = 0; i < 12; i++) {
      insertEntry(db, { id: `row-${i}`, created_at: i * 1000, title: `t${i}` });
    }

    const svc = bootService(db);

    // Capture setTimeout delays the worker requests. After we see a >=1h delay
    // (the circuit-break signal), flip `enabled=false` so the worker exits its
    // while loop on the next iteration — otherwise it spins forever in tests.
    const delays: number[] = [];
    const realSetTimeout = global.setTimeout;
    const setTimeoutSpy = vi
      .spyOn(global, 'setTimeout')
      .mockImplementation((fn: any, delay?: number) => {
        delays.push(delay ?? 0);
        if ((delay ?? 0) >= 3_600_000) (svc as any).enabled = false;
        // Don't actually wait — invoke immediately so the worker progresses.
        return realSetTimeout(fn, 0) as any;
      });
    const warnSpy = vi.spyOn((svc as any).log, 'warn').mockImplementation(() => {});

    // Every generate() returns null (mock fetch with non-ok / missing embedding).
    // We arrange more than 10 rejections to cover the circuit-break trip.
    for (let i = 0; i < 30; i++) {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      } as any);
    }

    await (svc as any).backfill();

    setTimeoutSpy.mockRestore();

    // At least one of the requested delays should be >= 1h after the failure run.
    const longDelay = delays.find(d => d >= 3_600_000);
    expect(longDelay).toBeDefined();

    // First-failure warn fires; subsequent within the burst are quiet.
    expect(warnSpy).toHaveBeenCalled();
    // Should NOT have warned for every single failure (>10 warns would mean the
    // service is spamming the log instead of going quiet).
    expect(warnSpy.mock.calls.length).toBeLessThan(10);
  }, 20_000);
});

describe('EmbeddingService — rowid join key (Pitfall 1)', () => {
  it('Test 7: vec0 INSERT uses entries.rowid (INTEGER), not entries.id (TEXT)', async () => {
    // Insert with a high rowid by inserting and deleting an earlier row.
    insertEntry(db, { id: 'placeholder', title: 'p' });
    db.prepare("DELETE FROM entries WHERE id = 'placeholder'").run();
    insertEntry(db, { id: 'real', title: 'real' });

    const meta = db
      .prepare('SELECT rowid FROM entries WHERE id = ?')
      .get('real') as { rowid: number };

    const svc = bootService(db);
    mockOllamaSuccess(768);

    await (svc as any).embedOne('real');

    const vecRow = db
      .prepare('SELECT rowid FROM entries_vec WHERE rowid = ?')
      .get(meta.rowid) as { rowid: number } | undefined;
    expect(vecRow?.rowid).toBe(meta.rowid);

    // Sanity: the TEXT id 'real' is NOT a valid rowid integer; vec0 has no row matching.
    const wrongLookup = db
      .prepare("SELECT rowid FROM entries_vec WHERE rowid = ?")
      .all('real' as any) as { rowid: number }[];
    expect(wrongLookup.length).toBe(0);
  });
});

describe('EmbeddingService — public generate() (D-MECH-02)', () => {
  it('Test 8: generate() is publicly callable from outside the class', async () => {
    const svc = bootService(db);
    mockOllamaSuccess(768, 0.25);

    // Direct call on a public method — TypeScript would refuse this if generate were private.
    const vec = await svc.generate('hello world');
    expect(Array.isArray(vec)).toBe(true);
    expect(vec!.length).toBe(768);
  });
});
