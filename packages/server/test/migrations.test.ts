import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
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
 */

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
    const applied = runMigrations(db);
    expect(applied).toBe(migrations.length);
    const version = db.pragma('user_version', { simple: true }) as number;
    expect(version).toBe(Math.max(...migrations.map(m => m.version)));
    db.close();
  });

  it('is idempotent — second run applies nothing', () => {
    const db = new Database(dbPath);
    runMigrations(db);
    const applied = runMigrations(db);
    expect(applied).toBe(0);
    db.close();
  });

  it('creates the entries table with all required columns', () => {
    const db = new Database(dbPath);
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
    ]) {
      expect(colNames).toContain(required);
    }
    db.close();
  });

  it('creates expected indexes', () => {
    const db = new Database(dbPath);
    runMigrations(db);
    const indexes = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='entries'")
      .all() as { name: string }[];
    const names = indexes.map(i => i.name);
    expect(names).toContain('idx_entries_created');
    expect(names).toContain('idx_entries_latlng');
    expect(names).toContain('idx_entries_type');
    expect(names).toContain('idx_entries_source');
    db.close();
  });

  it('migration versions are monotonic with no gaps', () => {
    const versions = migrations.map(m => m.version).sort((a, b) => a - b);
    for (let i = 0; i < versions.length; i++) {
      expect(versions[i]).toBe(i + 1);
    }
  });
});
