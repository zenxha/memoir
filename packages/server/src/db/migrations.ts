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
  {
    version: 2,
    name: 'external_id',
    sql: `
      ALTER TABLE entries ADD COLUMN external_id TEXT;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_entries_external_id ON entries(external_id)
        WHERE external_id IS NOT NULL;
    `,
  },
  {
    version: 3,
    name: 'embedding',
    sql: `
      ALTER TABLE entries ADD COLUMN embedding BLOB;
      CREATE INDEX IF NOT EXISTS idx_entries_has_embedding
        ON entries(id) WHERE embedding IS NOT NULL;
    `,
  },
  {
    version: 4,
    name: 'transcript_model',
    sql: `ALTER TABLE entries ADD COLUMN transcript_model TEXT;`,
  },
  {
    version: 5,
    name: 'entries_vec',
    sql: `CREATE VIRTUAL TABLE IF NOT EXISTS entries_vec USING vec0(embedding FLOAT[768]);`,
  },
  {
    version: 6,
    name: 'embedding_model',
    sql: `
      ALTER TABLE entries ADD COLUMN embedding_model TEXT;
      UPDATE entries SET embedding_model = 'nomic-embed-text' WHERE embedding IS NOT NULL;
    `,
  },
  {
    version: 7,
    name: 'peaks_path',
    sql: `ALTER TABLE entries ADD COLUMN peaks_path TEXT;`,
  },
  {
    version: 8,
    name: 'entries_fts',
    sql: `
      CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
        title, body, transcript, tags, place_name, music_title, music_artist,
        content='entries', content_rowid='rowid',
        tokenize="unicode61 remove_diacritics 2"
      );

      CREATE TRIGGER IF NOT EXISTS entries_ai AFTER INSERT ON entries BEGIN
        INSERT INTO entries_fts(rowid, title, body, transcript, tags, place_name, music_title, music_artist)
        VALUES (new.rowid, new.title, new.body, new.transcript, new.tags, new.place_name, new.music_title, new.music_artist);
      END;

      CREATE TRIGGER IF NOT EXISTS entries_ad AFTER DELETE ON entries BEGIN
        INSERT INTO entries_fts(entries_fts, rowid, title, body, transcript, tags, place_name, music_title, music_artist)
        VALUES('delete', old.rowid, old.title, old.body, old.transcript, old.tags, old.place_name, old.music_title, old.music_artist);
      END;

      CREATE TRIGGER IF NOT EXISTS entries_au AFTER UPDATE ON entries BEGIN
        INSERT INTO entries_fts(entries_fts, rowid, title, body, transcript, tags, place_name, music_title, music_artist)
        VALUES('delete', old.rowid, old.title, old.body, old.transcript, old.tags, old.place_name, old.music_title, old.music_artist);
        INSERT INTO entries_fts(rowid, title, body, transcript, tags, place_name, music_title, music_artist)
        VALUES (new.rowid, new.title, new.body, new.transcript, new.tags, new.place_name, new.music_title, new.music_artist);
      END;

      INSERT INTO entries_fts(rowid, title, body, transcript, tags, place_name, music_title, music_artist)
      SELECT rowid, title, body, transcript, tags, place_name, music_title, music_artist FROM entries;
    `,
  },
];
