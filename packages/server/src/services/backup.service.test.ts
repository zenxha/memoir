import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { migrations } from '../db/migrations';
import * as sqliteVec from 'sqlite-vec';
import type { DbService } from '../db/db.service';
import { BackupService } from './backup.service';

/**
 * BackupService contract (Phase 4, plan 05 — INFRA-07).
 *
 *   - Nightly SQLite snapshot via better-sqlite3's Database.prototype.backup().
 *   - BACKUP_DIR resolves to ${MEMOIR_DATA_DIR}/backups by default; env override wins.
 *   - Backup dir is created mode 0700 (Security V8 — backups contain transcripts, GPS, music history).
 *   - Retention rotation (D-23): keep last 7 daily + last 4 Sunday-stamped weekly files.
 *   - Opportunistic catch-up (D-22): when newest backup is older than 24h, kick a backup at boot.
 *   - Hour-of-day check fires the backup only when local time hits 3am.
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
}

function seedDb(dbPath: string): Database.Database {
  const db = new Database(dbPath);
  sqliteVec.load(db);
  runMigrations(db);
  db.prepare(
    `INSERT INTO entries (id, created_at, type, title, body)
     VALUES (?, ?, 'moment', ?, ?)`,
  ).run('e1', Date.now(), 'hello', 'world');
  db.prepare(
    `INSERT INTO entries (id, created_at, type, title)
     VALUES (?, ?, 'note', ?)`,
  ).run('e2', Date.now(), 'second');
  return db;
}

let tmpDir: string;
let dbPath: string;
let backupDirOverride: string | undefined;
const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memoir-backup-'));
  dbPath = path.join(tmpDir, 'memoir.db');
  process.env.MEMOIR_DATA_DIR = tmpDir;
  delete process.env.BACKUP_DIR;
  backupDirOverride = undefined;
});

afterEach(() => {
  // Restore env
  for (const k of Object.keys(process.env)) {
    if (!(k in ORIGINAL_ENV)) delete process.env[k];
  }
  for (const k of Object.keys(ORIGINAL_ENV)) {
    process.env[k] = ORIGINAL_ENV[k];
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
  vi.useRealTimers();
});

describe('BackupService — INFRA-07', () => {
  it('Test 1: runBackup writes a dated .db file readable as SQLite with the same entries', async () => {
    const db = seedDb(dbPath);
    const svc = new BackupService(db as unknown as DbService);
    svc.onApplicationBootstrap();

    // Bootstrap may schedule an opportunistic catch-up via setImmediate; flush it.
    await new Promise(r => setImmediate(r));
    // Also explicitly invoke runBackup so the test is deterministic regardless of catch-up logic.
    await (svc as any).runBackup();
    svc.onModuleDestroy();

    const backupDir = path.join(tmpDir, 'backups');
    const files = fs.readdirSync(backupDir).filter(f => /^memoir-\d{4}-\d{2}-\d{2}\.db$/.test(f));
    expect(files.length).toBeGreaterThanOrEqual(1);

    const backupPath = path.join(backupDir, files[files.length - 1]);
    const restored = new Database(backupPath, { readonly: true });
    const rows = restored.prepare('SELECT id, title FROM entries ORDER BY id').all() as { id: string; title: string }[];
    expect(rows).toEqual([
      { id: 'e1', title: 'hello' },
      { id: 'e2', title: 'second' },
    ]);
    restored.close();
    db.close();
  });

  it('Test 2: BACKUP_DIR defaults to ${MEMOIR_DATA_DIR}/backups when env is unset', async () => {
    const db = seedDb(dbPath);
    const svc = new BackupService(db as unknown as DbService);
    svc.onApplicationBootstrap();
    await new Promise(r => setImmediate(r));
    svc.onModuleDestroy();

    const expected = path.join(tmpDir, 'backups');
    expect((svc as any).backupDir).toBe(expected);
    expect(fs.existsSync(expected)).toBe(true);
    db.close();
  });

  it('Test 3: BACKUP_DIR env override is respected', async () => {
    backupDirOverride = path.join(tmpDir, 'external-disk', 'memoir');
    process.env.BACKUP_DIR = backupDirOverride;
    const db = seedDb(dbPath);
    const svc = new BackupService(db as unknown as DbService);
    svc.onApplicationBootstrap();
    await new Promise(r => setImmediate(r));
    svc.onModuleDestroy();

    expect((svc as any).backupDir).toBe(path.resolve(backupDirOverride));
    expect(fs.existsSync(backupDirOverride)).toBe(true);
    db.close();
  });

  it('Test 4: backup directory is created mode 0700 (Security V8)', async () => {
    const db = seedDb(dbPath);
    const svc = new BackupService(db as unknown as DbService);
    svc.onApplicationBootstrap();
    await new Promise(r => setImmediate(r));
    svc.onModuleDestroy();

    const backupDir = path.join(tmpDir, 'backups');
    const mode = fs.statSync(backupDir).mode & 0o777;
    // POSIX: must be exactly 0o700. Skip the assertion on win32 (chmod is a no-op there).
    if (process.platform !== 'win32') {
      expect(mode).toBe(0o700);
    }
    db.close();
  });

  it('Test 5: retention rotation keeps last 7 daily + last 4 Sunday weekly (D-23)', async () => {
    const db = seedDb(dbPath);
    const svc = new BackupService(db as unknown as DbService);
    svc.onApplicationBootstrap();
    await new Promise(r => setImmediate(r));
    // Wipe any opportunistic-catch-up file before seeding synthetic state
    const backupDir = path.join(tmpDir, 'backups');
    for (const f of fs.readdirSync(backupDir)) fs.unlinkSync(path.join(backupDir, f));

    // Synthesize 181 dated files: 2026-01-01 .. 2026-06-30 (inclusive).
    const start = new Date(Date.UTC(2026, 0, 1));
    const synthesized: string[] = [];
    for (let day = 0; day < 181; day++) {
      const d = new Date(start.getTime() + day * 86400000);
      const stamp = d.toISOString().slice(0, 10);
      const name = `memoir-${stamp}.db`;
      fs.writeFileSync(path.join(backupDir, name), '');
      synthesized.push(name);
    }
    expect(fs.readdirSync(backupDir).length).toBe(181);

    (svc as any).rotate();

    const remaining = fs.readdirSync(backupDir).filter(f => /^memoir-\d{4}-\d{2}-\d{2}\.db$/.test(f)).sort();

    // Last 7 daily files (most recent dates).
    const last7 = synthesized.slice(-7);
    for (const f of last7) expect(remaining).toContain(f);

    // Last 4 most-recent Sunday-stamped files.
    const sundays = synthesized.filter(f => {
      const m = f.match(/^memoir-(\d{4})-(\d{2})-(\d{2})\.db$/)!;
      return new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`).getUTCDay() === 0;
    });
    const last4Sundays = sundays.slice(-4);
    for (const f of last4Sundays) expect(remaining).toContain(f);

    // Set semantics: total = (last7 ∪ last4Sundays).
    const expectedKeep = new Set<string>([...last7, ...last4Sundays]);
    expect(remaining.length).toBe(expectedKeep.size);
    expect(remaining.length).toBeLessThanOrEqual(11);

    // Older files are gone.
    expect(remaining).not.toContain('memoir-2026-01-01.db');
    expect(remaining).not.toContain('memoir-2026-02-15.db');
    svc.onModuleDestroy();
    db.close();
  });

  it('Test 6: shouldCatchUp respects 24h freshness window (D-22)', async () => {
    const db = seedDb(dbPath);
    const svc = new BackupService(db as unknown as DbService);
    svc.onApplicationBootstrap();
    await new Promise(r => setImmediate(r));
    const backupDir = path.join(tmpDir, 'backups');
    for (const f of fs.readdirSync(backupDir)) fs.unlinkSync(path.join(backupDir, f));

    // Empty dir → catch up.
    expect((svc as any).shouldCatchUp()).toBe(true);

    // Newest file mtime = now → no catch up.
    const fresh = path.join(backupDir, 'memoir-2025-12-31.db');
    fs.writeFileSync(fresh, '');
    const nowMs = Date.now();
    fs.utimesSync(fresh, nowMs / 1000, nowMs / 1000);
    expect((svc as any).shouldCatchUp()).toBe(false);

    // Newest file mtime = 25h ago → catch up.
    const old = (nowMs - 25 * 60 * 60 * 1000) / 1000;
    fs.utimesSync(fresh, old, old);
    expect((svc as any).shouldCatchUp()).toBe(true);
    svc.onModuleDestroy();
    db.close();
  });

  it('Test 7: scheduled tick fires backup at hour=3 and skips at hour=4', async () => {
    const db = seedDb(dbPath);
    const svc = new BackupService(db as unknown as DbService);

    // Capture the registered tick by stubbing setInterval before bootstrap.
    let tick: (() => void) | null = null;
    const intervalSpy = vi.spyOn(globalThis, 'setInterval').mockImplementation(((fn: any) => {
      tick = fn;
      return 0 as unknown as NodeJS.Timeout;
    }) as any);

    svc.onApplicationBootstrap();
    await new Promise(r => setImmediate(r));
    expect(typeof tick).toBe('function');

    const runBackupSpy = vi.spyOn(svc as any, 'runBackup').mockImplementation(async () => {});

    // Time = 4:00 → should NOT call runBackup.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 5, 4, 0, 0));
    (tick as unknown as () => void)();
    expect(runBackupSpy).not.toHaveBeenCalled();

    // Time = 3:00 → should call runBackup.
    vi.setSystemTime(new Date(2026, 5, 5, 3, 0, 0));
    (tick as unknown as () => void)();
    expect(runBackupSpy).toHaveBeenCalledTimes(1);

    intervalSpy.mockRestore();
    runBackupSpy.mockRestore();
    svc.onModuleDestroy();
    db.close();
  });
});
