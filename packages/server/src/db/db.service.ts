import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { migrations } from './migrations';

@Injectable()
export class DbService extends Database implements OnModuleInit {
  private readonly log = new Logger('Db');

  constructor() {
    const dataDir = process.env.MEMOIR_DATA_DIR
      ? path.resolve(process.env.MEMOIR_DATA_DIR)
      : path.join(__dirname, '../../data');
    fs.mkdirSync(path.join(dataDir, 'media'), { recursive: true });
    super(path.join(dataDir, 'memoir.db'));
  }

  onModuleInit() {
    this.pragma('journal_mode = WAL');
    this.pragma('foreign_keys = ON');
    this.runMigrations();
  }

  private runMigrations() {
    const current = this.pragma('user_version', { simple: true }) as number;
    const pending = migrations
      .slice()
      .sort((a, b) => a.version - b.version)
      .filter(m => m.version > current);

    if (!pending.length) {
      this.log.log(`schema up-to-date (version ${current})`);
      return;
    }

    for (const m of pending) {
      const run = this.transaction(() => {
        this.exec(m.sql);
        this.pragma(`user_version = ${m.version}`);
      });
      run();
      this.log.log(`migrated to version ${m.version} (${m.name})`);
    }
  }
}
