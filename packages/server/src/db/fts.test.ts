import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { migrations } from './migrations';

/**
 * FTS5 contract — migration v8 wires entries_fts as an external-content FTS5
 * index over entries, kept in sync by three triggers (AFTER INSERT/DELETE/UPDATE).
 *
 *   - INSERT entry → MATCH the title term returns the row
 *   - UPDATE entry → MATCH the new term finds it; MATCH old term returns 0 rows
 *   - DELETE entry → MATCH the previously indexed term returns 0 rows
 *   - tags stored as JSON.stringify(array) tokenize correctly (RESEARCH Open Q 2)
 *   - snippet() returns highlighted markup for a MATCH query
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

function insertEntry(
  db: Database.Database,
  fields: {
    id: string;
    title?: string | null;
    body?: string | null;
    transcript?: string | null;
    tags?: string | null;
    place_name?: string | null;
    music_title?: string | null;
    music_artist?: string | null;
  },
) {
  db.prepare(
    `INSERT INTO entries
      (id, created_at, type, title, body, transcript, tags, place_name, music_title, music_artist)
     VALUES (?, ?, 'moment', ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    fields.id,
    Date.now(),
    fields.title ?? null,
    fields.body ?? null,
    fields.transcript ?? null,
    fields.tags ?? null,
    fields.place_name ?? null,
    fields.music_title ?? null,
    fields.music_artist ?? null,
  );
}

let tmpDir: string;
let dbPath: string;
let db: Database.Database;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memoir-fts-'));
  dbPath = path.join(tmpDir, 'test.db');
  db = new Database(dbPath);
  sqliteVec.load(db);
  runMigrations(db);
});

afterEach(() => {
  db.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('db/entries_fts', () => {
  it('INSERT into entries — MATCH on title term finds the new row', () => {
    insertEntry(db, { id: 'e1', title: 'Sunset over the bay' });
    const row = db
      .prepare("SELECT rowid FROM entries_fts WHERE entries_fts MATCH ?")
      .get('sunset') as { rowid: number } | undefined;
    expect(row).toBeDefined();
    const entry = db
      .prepare("SELECT id FROM entries WHERE rowid = ?")
      .get(row!.rowid) as { id: string };
    expect(entry.id).toBe('e1');
  });

  it('UPDATE title — MATCH new term finds row; MATCH old term returns 0', () => {
    insertEntry(db, { id: 'e2', title: 'Morning coffee' });
    db.prepare("UPDATE entries SET title = ? WHERE id = ?").run('Evening tea', 'e2');
    const newMatch = db
      .prepare("SELECT rowid FROM entries_fts WHERE entries_fts MATCH ?")
      .all('tea') as { rowid: number }[];
    expect(newMatch.length).toBe(1);
    const oldMatch = db
      .prepare("SELECT rowid FROM entries_fts WHERE entries_fts MATCH ?")
      .all('coffee') as { rowid: number }[];
    expect(oldMatch.length).toBe(0);
  });

  it('DELETE entry — MATCH previously indexed term returns 0 rows', () => {
    insertEntry(db, { id: 'e3', title: 'Forest walk' });
    const before = db
      .prepare("SELECT rowid FROM entries_fts WHERE entries_fts MATCH ?")
      .all('forest') as { rowid: number }[];
    expect(before.length).toBe(1);
    db.prepare("DELETE FROM entries WHERE id = ?").run('e3');
    const after = db
      .prepare("SELECT rowid FROM entries_fts WHERE entries_fts MATCH ?")
      .all('forest') as { rowid: number }[];
    expect(after.length).toBe(0);
  });

  it('tags stored as JSON array tokenize — MATCH on tag word works', () => {
    // RESEARCH Open Question 2 — unicode61 strips JSON brackets/quotes as punctuation,
    // leaving the inner words as searchable tokens.
    insertEntry(db, {
      id: 'e4',
      title: 'Listening',
      tags: JSON.stringify(['music', 'jazz']),
    });
    const row = db
      .prepare("SELECT rowid FROM entries_fts WHERE entries_fts MATCH ?")
      .get('jazz') as { rowid: number } | undefined;
    expect(row).toBeDefined();
  });

  it('snippet() returns <mark>-wrapped highlighted text for a MATCH query', () => {
    insertEntry(db, {
      id: 'e5',
      title: 'A long quiet morning by the river',
      body: 'I sat for a while watching the heron.',
    });
    const row = db
      .prepare(
        "SELECT snippet(entries_fts, -1, '<mark>', '</mark>', '...', 16) AS snip " +
          'FROM entries_fts WHERE entries_fts MATCH ?',
      )
      .get('heron') as { snip: string };
    expect(row.snip).toMatch(/<mark>/);
    expect(row.snip).toMatch(/<\/mark>/);
  });
});
