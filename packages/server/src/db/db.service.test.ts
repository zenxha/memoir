import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { migrations } from './migrations';

/**
 * DbService contract — exercised at the raw better-sqlite3 layer (no NestJS DI).
 *
 *   - sqlite-vec extension is loaded on the connection (vec_version() works)
 *   - vec_distance_cosine of two identical vectors is 0
 *   - The vec0 virtual table `entries_vec` exists after migrations run
 *   - Ordering invariant (Pitfall 4): loading sqlite-vec AFTER runMigrations()
 *     fails the v5 migration with "no such module: vec0"
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
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memoir-db-'));
  dbPath = path.join(tmpDir, 'test.db');
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('db/db.service (sqlite-vec extension)', () => {
  it('exposes vec_version() after sqliteVec.load(db) + migrations', () => {
    const db = new Database(dbPath);
    sqliteVec.load(db);
    runMigrations(db);
    const row = db.prepare('SELECT vec_version() AS v').get() as { v: string };
    expect(row.v).toMatch(/^v?\d+\.\d+/);
    db.close();
  });

  it('vec_distance_cosine of two identical vectors is 0', () => {
    const db = new Database(dbPath);
    sqliteVec.load(db);
    runMigrations(db);
    const blob = Buffer.from(new Float32Array([1, 2, 3]).buffer);
    const row = db
      .prepare('SELECT vec_distance_cosine(?, ?) AS d')
      .get(blob, blob) as { d: number };
    expect(row.d).toBe(0);
    db.close();
  });

  it('creates the entries_vec virtual table after migrations run', () => {
    const db = new Database(dbPath);
    sqliteVec.load(db);
    runMigrations(db);
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='entries_vec'")
      .get() as { name: string } | undefined;
    expect(row?.name).toBe('entries_vec');
    db.close();
  });

  it('reversed ordering — load AFTER runMigrations fails v5 with "no such module: vec0"', () => {
    // Pitfall 4 guard: the v5 migration (USING vec0) must NOT be runnable
    // unless sqlite-vec is loaded first.
    const db = new Database(dbPath);
    expect(() => runMigrations(db)).toThrow(/vec0/);
    db.close();
  });
});
