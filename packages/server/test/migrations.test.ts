import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { migrations } from '../src/db/migrations';

/**
 * Migration runner contract:
 *   - On fresh DB (user_version = 0), all migrations apply in order.
 *   - On already-migrated DB (user_version = N), no migrations apply.
 *   - Migrations are idempotent: applying twice has no effect on the second run.
 *   - Schema after migration matches expected tables/indexes.
 *
 * We test against a temp file DB, not the real one.
 *
 * Phase 4: sqlite-vec is loaded BEFORE runMigrations() because migration v5
 * creates a vec0 virtual table inside the migration transaction.
 */

function runMigrations(db: Database.Database, subset = migrations) {
  const current = db.pragma('user_version', { simple: true }) as number;
  const pending = subset
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
  return pending.length;
}

let tmpDir: string;
let dbPath: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memoir-mig-'));
  dbPath = path.join(tmpDir, 'test.db');
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('db/migrations', () => {
  it('applies all migrations on a fresh DB', () => {
    const db = new Database(dbPath);
    sqliteVec.load(db);
    const applied = runMigrations(db);
    expect(applied).toBe(migrations.length);
    const version = db.pragma('user_version', { simple: true }) as number;
    expect(version).toBe(Math.max(...migrations.map(m => m.version)));
    db.close();
  });

  it('is idempotent — second run applies nothing', () => {
    const db = new Database(dbPath);
    sqliteVec.load(db);
    runMigrations(db);
    const applied = runMigrations(db);
    expect(applied).toBe(0);
    db.close();
  });

  it('creates the entries table with all required columns', () => {
    const db = new Database(dbPath);
    sqliteVec.load(db);
    runMigrations(db);
    const cols = db
      .prepare("PRAGMA table_info(entries)")
      .all() as { name: string }[];
    const colNames = cols.map(c => c.name);
    for (const required of [
      'id', 'created_at', 'imported_at', 'source', 'type',
      'lat', 'lng', 'accuracy', 'altitude', 'place_name',
      'title', 'body', 'duration_ms', 'media_path', 'media_thumb',
      'waveform', 'transcript', 'music_title', 'music_artist',
      'music_key', 'tags', 'weather', 'device_id',
      'external_id', 'embedding', 'transcript_model',
      'embedding_model', 'peaks_path',
    ]) {
      expect(colNames).toContain(required);
    }
    db.close();
  });

  it('creates expected indexes', () => {
    const db = new Database(dbPath);
    sqliteVec.load(db);
    runMigrations(db);
    const indexes = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='entries'")
      .all() as { name: string }[];
    const names = indexes.map(i => i.name);
    expect(names).toContain('idx_entries_created');
    expect(names).toContain('idx_entries_latlng');
    expect(names).toContain('idx_entries_type');
    expect(names).toContain('idx_entries_source');
    expect(names).toContain('idx_entries_external_id');
    expect(names).toContain('idx_entries_has_embedding');
    db.close();
  });

  it('migration versions are monotonic with no gaps', () => {
    const versions = migrations.map(m => m.version).sort((a, b) => a - b);
    for (let i = 0; i < versions.length; i++) {
      expect(versions[i]).toBe(i + 1);
    }
  });

  it('creates entries_vec and entries_fts virtual tables', () => {
    const db = new Database(dbPath);
    sqliteVec.load(db);
    runMigrations(db);
    const rows = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('entries_vec', 'entries_fts') ORDER BY name",
      )
      .all() as { name: string }[];
    const names = rows.map(r => r.name);
    expect(names).toContain('entries_vec');
    expect(names).toContain('entries_fts');
    db.close();
  });

  it('arrives at user_version 8 after all migrations', () => {
    const db = new Database(dbPath);
    sqliteVec.load(db);
    runMigrations(db);
    const v = db.pragma('user_version', { simple: true }) as number;
    expect(v).toBe(8);
    db.close();
  });

  it('backfills embedding_model = nomic-embed-text for existing rows with non-NULL embedding', () => {
    const db = new Database(dbPath);
    sqliteVec.load(db);
    // First, apply only migrations 1-4 (pre-Phase-4 state).
    const earlyMigrations = migrations.filter(m => m.version <= 4);
    runMigrations(db, earlyMigrations);
    // Insert a row with a non-NULL embedding BLOB — simulating an entry that
    // existed before migration v6 introduced the embedding_model column.
    db.prepare(
      "INSERT INTO entries (id, created_at, type, embedding) VALUES (?, ?, ?, ?)",
    ).run('test-entry-1', Date.now(), 'moment', Buffer.from([0x00, 0x11, 0x22, 0x33]));
    // Now apply the remaining migrations (v5-v8).
    runMigrations(db);
    const row = db
      .prepare('SELECT embedding_model FROM entries WHERE id = ?')
      .get('test-entry-1') as { embedding_model: string | null };
    expect(row.embedding_model).toBe('nomic-embed-text');
    db.close();
  });
});
