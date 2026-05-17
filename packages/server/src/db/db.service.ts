import { Injectable, OnModuleInit } from '@nestjs/common';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class DbService extends Database implements OnModuleInit {
  constructor() {
    const dataDir = path.join(__dirname, '../../data');
    fs.mkdirSync(path.join(dataDir, 'media'), { recursive: true });
    super(path.join(dataDir, 'memoir.db'));
  }

  onModuleInit() {
    this.pragma('journal_mode = WAL');
    this.pragma('foreign_keys = ON');
    this.exec(`
      CREATE TABLE IF NOT EXISTS entries (
        id           TEXT PRIMARY KEY,
        created_at   INTEGER NOT NULL,
        imported_at  INTEGER,
        source       TEXT DEFAULT 'native',
        type         TEXT NOT NULL,
        lat          REAL,
        lng          REAL,
        accuracy     REAL,
        altitude     REAL,
        place_name   TEXT,
        title        TEXT,
        body         TEXT,
        duration_ms  INTEGER,
        media_path   TEXT,
        media_thumb  TEXT,
        waveform     TEXT,
        transcript   TEXT,
        music_title  TEXT,
        music_artist TEXT,
        music_key    TEXT,
        tags         TEXT,
        weather      TEXT,
        device_id    TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_entries_created ON entries(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_entries_latlng  ON entries(lat, lng);
      CREATE INDEX IF NOT EXISTS idx_entries_type    ON entries(type);
      CREATE INDEX IF NOT EXISTS idx_entries_source  ON entries(source);
    `);
  }
}
