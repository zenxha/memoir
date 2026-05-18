export interface Migration {
  version: number;
  name: string;
  sql: string;
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial',
    sql: `
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
    `,
  },
];
