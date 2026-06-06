import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { DbService } from '../db/db.service';

const ONE_DAY_MS  = 24 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

@Injectable()
export class BackupService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger(BackupService.name);
  private backupDir!: string;
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly db: DbService) {}

  onApplicationBootstrap() {
    const dataDir = process.env.MEMOIR_DATA_DIR
      ? path.resolve(process.env.MEMOIR_DATA_DIR)
      : path.join(__dirname, '../../data');
    this.backupDir = process.env.BACKUP_DIR
      ? path.resolve(process.env.BACKUP_DIR)
      : path.join(dataDir, 'backups');

    fs.mkdirSync(this.backupDir, { recursive: true });
    // Security V8: backup file contains all transcripts, GPS, music history — owner-only.
    try { fs.chmodSync(this.backupDir, 0o700); } catch { /* best-effort on non-POSIX */ }

    this.log.log(`Backup service active (dir: ${this.backupDir})`);

    // Opportunistic catch-up on boot if last backup is older than 24h (D-22).
    if (this.shouldCatchUp()) {
      setImmediate(() => this.runBackup());
    }

    // Schedule: hourly tick + hour-of-day check (Pattern 8). Fires once per 3am block.
    this.timer = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 3) {
        this.runBackup();
      }
    }, ONE_HOUR_MS);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private shouldCatchUp(): boolean {
    const files = this.listBackups();
    if (!files.length) return true;
    const newest = files[files.length - 1];
    const mtime = fs.statSync(path.join(this.backupDir, newest)).mtimeMs;
    return (Date.now() - mtime) > ONE_DAY_MS;
  }

  private async runBackup() {
    const stamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const dest = path.join(this.backupDir, `memoir-${stamp}.db`);
    try {
      await this.db.backup(dest);
      this.log.log(`Backup written: ${path.basename(dest)}`);
      this.rotate();
    } catch (err) {
      this.log.warn(`Backup failed: ${(err as Error).message}`);
    }
  }

  private listBackups(): string[] {
    if (!fs.existsSync(this.backupDir)) return [];
    return fs.readdirSync(this.backupDir)
      .filter(f => /^memoir-\d{4}-\d{2}-\d{2}\.db$/.test(f))
      .sort(); // ISO date-sorted ascending
  }

  private rotate() {
    // D-23: keep last 7 daily + last 4 Sunday-stamped weekly files.
    const files = this.listBackups();
    const keep = new Set<string>();
    const last7 = files.slice(-7);
    last7.forEach(f => keep.add(f));
    // Weekly: pick up to 4 most-recent Sunday-stamped files (walking newest → oldest).
    const weekly: string[] = [];
    for (let i = files.length - 1; i >= 0 && weekly.length < 4; i--) {
      const m = files[i].match(/^memoir-(\d{4})-(\d{2})-(\d{2})\.db$/);
      if (!m) continue;
      const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`);
      if (d.getUTCDay() === 0) weekly.push(files[i]); // Sunday
    }
    weekly.forEach(f => keep.add(f));
    for (const f of files) {
      if (!keep.has(f)) {
        try { fs.unlinkSync(path.join(this.backupDir, f)); } catch { /* skip */ }
      }
    }
  }
}
