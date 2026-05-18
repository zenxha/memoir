# DB migrations

The schema is owned by `migrations.ts`. On boot, `DbService.runMigrations()` reads `PRAGMA user_version`, finds any migrations with a higher version, and runs them in order inside a transaction. After each one, `user_version` advances.

## Adding a migration

Append a new entry to the `migrations` array in `migrations.ts`:

```ts
{
  version: 2,
  name: 'add_embedding_column',
  sql: `
    ALTER TABLE entries ADD COLUMN embedding BLOB;
    CREATE INDEX IF NOT EXISTS idx_entries_has_embedding
      ON entries(id) WHERE embedding IS NOT NULL;
  `,
},
```

Rules:
- **Versions are integers, monotonic, no gaps.** The next version is always `last + 1`.
- **Forward-only.** No down-migrations. If you need to reverse, write a new migration that does the reverse.
- **Idempotent where possible.** Use `IF NOT EXISTS` for tables and indexes. Pure `ALTER TABLE ADD COLUMN` is not idempotent — only ship it once, never edit it after release.
- **One logical change per migration.** Don't bundle unrelated schema edits.
- **Never edit a migration after it has run anywhere.** Including your own dev DB. Add a new one instead.

## What if I made a mistake?

If a migration ran in your dev DB and you want to redo it:
- Roll back manually with `sqlite3 memoir.db` then `PRAGMA user_version = N - 1; <reverse SQL>;`
- Or delete the DB (you'll lose data) — fine in dev, never in production data.
