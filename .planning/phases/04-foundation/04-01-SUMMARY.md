---
phase: 04-foundation
plan: 01
subsystem: server/db
tags:
  - sqlite-vec
  - fts5
  - migrations
  - foundation
  - schema
requires:
  - better-sqlite3 (existing)
  - DbService singleton (existing)
provides:
  - sqlite-vec extension loaded on the DbService connection
  - entries_vec vec0 virtual table (768-dim, rowid-keyed)
  - entries_fts FTS5 external-content index over 7 entry columns
  - entries.embedding_model column (backfilled for pre-existing embeddings)
  - entries.peaks_path column (complementary to existing waveform)
  - test scaffolds: db.service.test.ts, extended migrations.test.ts, fts.test.ts
affects:
  - packages/server/src/db/db.service.ts (extension load on boot)
  - packages/server/src/db/migrations.ts (4 new migrations v5-v8)
  - packages/server/package.json (sqlite-vec exact pin)
  - pnpm-lock.yaml
tech-stack:
  added:
    - sqlite-vec@0.1.9 (exact pin, pre-v1 package)
  patterns:
    - per-connection extension load via sqliteVec.load(db)
    - FTS5 external content (content='entries', content_rowid='rowid')
    - FTS5 sync triggers (AFTER INSERT/DELETE/UPDATE) with full delete-form column list
    - inline backfill inside migration transaction (v6 embedding_model, v8 entries_fts)
key-files:
  created:
    - packages/server/src/db/db.service.test.ts
    - packages/server/src/db/fts.test.ts
  modified:
    - packages/server/package.json
    - packages/server/src/db/db.service.ts
    - packages/server/src/db/migrations.ts
    - packages/server/test/migrations.test.ts
    - pnpm-lock.yaml
decisions:
  - Pin sqlite-vec exactly at 0.1.9 (no caret) — pre-v1 per upstream README; the 0.2.x line could change the JS load surface or vec0 SQL surface, so we accept the upgrade burden over the breakage risk.
  - Hardcode 768-dim in v5 entries_vec — D-08 says future model swap is a deliberate explicit migration. Don't paramaterize.
  - Backfill bare model name 'nomic-embed-text' in v6 (no version suffix) — matches existing EmbeddingService default.
  - peaks_path is complementary to (not a replacement for) the existing waveform column (D-14). waveform is untouched.
  - FTS5 triggers carry the full column list in the delete forms (Pitfall 6) — do NOT use the short `'delete', old.rowid` form.
metrics:
  duration: 5m
  completed: 2026-06-06T00:50Z
  tasks_completed: 3
  files_created: 2
  files_modified: 5
requirements:
  - INFRA-01
  - INFRA-02
  - INFRA-03
  - INFRA-05
---

# Phase 04 Plan 01: Foundation (sqlite-vec + Migrations v5-v8) Summary

**One-liner:** Loaded sqlite-vec@0.1.9 on the DbService connection and appended migrations v5-v8 (entries_vec vec0 virtual table, embedding_model column with inline backfill, peaks_path column, entries_fts FTS5 external content + 3 sync triggers + inline backfill) so downstream Phase 4 plans can target a live schema.

## What shipped

### Task 1 — Exact-pin sqlite-vec@0.1.9
- Added `"sqlite-vec": "0.1.9"` (no caret) to `packages/server/package.json` `dependencies`, alphabetically positioned between `sharp` and `ws`.
- `pnpm install` updated `pnpm-lock.yaml` with platform-specific binaries (darwin-arm64/x64, linux-arm64/x64).
- Confirmed `require('sqlite-vec')` resolves from `packages/server` (`load: function`).
- Typecheck clean.
- **Commit:** `bf764e2` — `chore(04-01): pin sqlite-vec@0.1.9 (exact, pre-v1)`

### Task 2 — Load sqlite-vec in DbService.onModuleInit (TDD)
- RED: `packages/server/src/db/db.service.test.ts` created with 4 tests:
  - `vec_version()` returns version string
  - `vec_distance_cosine` of identical vectors is 0
  - `entries_vec` virtual table exists after migrations
  - Pitfall 4 guard: load AFTER runMigrations throws `/vec0/`
- GREEN: edited `db.service.ts`:
  - Added `import * as sqliteVec from 'sqlite-vec';`
  - Inserted `sqliteVec.load(this);` as the FIRST statement of `onModuleInit()` (before pragma calls, before `runMigrations()`)
  - Appended `vec_version` log line for boot-time visibility
- `grep -nE 'sqliteVec\.load\(this\)' packages/server/src/db/db.service.ts` returns line 21
- `awk '/onModuleInit\(\)/,/^  \}/' | grep -n` confirms `sqliteVec.load` is first
- **Commits:**
  - `0fd6f1e` — `test(04-01): add failing tests for sqlite-vec extension load (RED)`
  - `37d004b` — `feat(04-01): load sqlite-vec extension in DbService.onModuleInit (GREEN)`

### Task 3 — Append migrations v5-v8 (TDD)
- RED: extended `packages/server/test/migrations.test.ts` (added embedding_model/peaks_path to required columns; new tests for entries_vec/entries_fts existence, user_version=8, embedding_model backfill); created `packages/server/src/db/fts.test.ts` with INSERT/UPDATE/DELETE roundtrip + JSON-tags tokenize + snippet smoke.
- GREEN: appended 4 migrations to `migrations.ts`:
  - **v5 entries_vec:** `CREATE VIRTUAL TABLE IF NOT EXISTS entries_vec USING vec0(embedding FLOAT[768]);`
  - **v6 embedding_model:** `ALTER TABLE entries ADD COLUMN embedding_model TEXT;` + `UPDATE entries SET embedding_model = 'nomic-embed-text' WHERE embedding IS NOT NULL;` (inline backfill in same transaction)
  - **v7 peaks_path:** `ALTER TABLE entries ADD COLUMN peaks_path TEXT;` (complementary to existing `waveform`)
  - **v8 entries_fts:** FTS5 external-content over `title, body, transcript, tags, place_name, music_title, music_artist`, tokenizer `unicode61 remove_diacritics 2`, plus 3 sync triggers (`entries_ai/ad/au`) with full column lists in the delete forms (Pitfall 6), plus inline `INSERT INTO entries_fts SELECT ... FROM entries` backfill.
- All 17 server tests pass.
- Typecheck clean.
- **Commits:**
  - `bca2ec8` — `test(04-01): add failing tests for migrations v5-v8 (RED)`
  - `5633efa` — `feat(04-01): append migrations v5-v8 (entries_vec, embedding_model, peaks_path, entries_fts) — GREEN`

## Verification

### Server unit tests (vitest)
```
✓ src/db/db.service.test.ts (4 tests) 45ms
✓ src/db/fts.test.ts (5 tests) 57ms
✓ test/migrations.test.ts (8 tests) 70ms
Test Files  3 passed (3)
Tests       17 passed (17)
```

### Typecheck
- `pnpm --filter @memoir/server typecheck` exits 0.

### Full `pnpm verify`
- `pnpm typecheck` — pass (all 4 packages)
- `pnpm test` — pass (17/17 server tests)
- `pnpm e2e` — **6 of 7 pass**, 1 unrelated pre-existing failure (see Deferred Issues)

### Acceptance criteria (Task 3 structural greps)
- `version: [5-8]` count = 4 ✓
- `version: ` count = 9 (8 migration entries + 1 interface `version: number;` line) — plan acceptance literally expected 8; the 9th match is the `Migration` interface field, an inherent property of the file pre-dating this plan. Substance check (`migration versions are monotonic with no gaps` test) actively passes with `versions[7] === 8`. Documenting as a minor plan-imprecision (acceptance line literal, not substance).
- `entries_vec USING vec0(embedding FLOAT[768])` ✓
- `ADD COLUMN embedding_model TEXT` ✓
- `ADD COLUMN peaks_path TEXT` ✓
- `entries_fts USING fts5` ✓
- `CREATE TRIGGER IF NOT EXISTS entries_a[iud]` count = 3 ✓
- `unicode61 remove_diacritics 2` ✓
- `UPDATE entries SET embedding_model = 'nomic-embed-text'` ✓

## Lockfile delta

`pnpm-lock.yaml`:
```
sqlite-vec:
  specifier: 0.1.9
  version: 0.1.9
```
Plus platform-conditional native binaries:
- `sqlite-vec-darwin-arm64@0.1.9`
- `sqlite-vec-darwin-x64@0.1.9`
- `sqlite-vec-linux-arm64@0.1.9`
- `sqlite-vec-linux-x64@0.1.9`

## New migrations

| Version | Name | One-line effect |
|---------|------|----------------|
| 5 | `entries_vec` | Create vec0 virtual table for 768-dim cosine similarity |
| 6 | `embedding_model` | Add embedding_model TEXT column + backfill `'nomic-embed-text'` for rows with non-NULL embedding |
| 7 | `peaks_path` | Add peaks_path TEXT column (complementary to existing waveform) |
| 8 | `entries_fts` | Create FTS5 external-content index + 3 sync triggers + inline backfill of existing rows |

## New test files

- `packages/server/src/db/db.service.test.ts` (4 tests, 87 lines) — sqlite-vec extension load contract
- `packages/server/src/db/fts.test.ts` (5 tests, 156 lines) — FTS5 INSERT/UPDATE/DELETE roundtrip + tags JSON tokenize + snippet
- `packages/server/test/migrations.test.ts` extended (+3 tests, +30 lines for required columns, virtual tables, user_version=8, backfill)

## Deviations from Plan

None requiring auto-fix (no Rule 1/2/3 fires).

Plan-imprecision notes (not deviations from product behavior):
- **acceptance criterion literal "grep -c \"version: \" returns exactly 8":** the file's `Migration` interface declaration `version: number;` line is also matched, so the literal grep returns 9. The substance — "exactly 4 new migrations appended for a total of 8 entries" — is exactly correct and is enforced by the test `migration versions are monotonic with no gaps` which actively passes with `versions[7] === 8`.
- **`node -e "require('sqlite-vec')" from repo root:** pnpm workspaces hoist into `packages/server/node_modules` rather than the repo root, so the literal command in the acceptance criterion exits non-zero. Verified instead by `cd packages/server && node -e "require('sqlite-vec'); console.log(typeof require('sqlite-vec').load)"` printing `function` — which is the actual runtime resolution path DbService uses. The lockfile correctly references `sqlite-vec@0.1.9`.

## Deferred Issues

**1. Pre-existing e2e flake: `desktop-screenshots.spec.ts:63 — page does not throw uncaught errors`**
- **Symptom:** `<MapCanvas>` raises a React render error in the test env that's surfaced via console.error but not caught by the test's `mapbox|access token` filter regex.
- **Root cause (likely):** test env doesn't inject `MAPBOX_TOKEN` via `/config.js`, so MapCanvas downstream of the empty token throws a runtime error during Mapbox v3 init. The error message contains the string "The above error occurred in the <MapCanvas> component" — no token-related substring → filter passes it through.
- **Scope:** entirely in `packages/desktop/src/globe/MapCanvas.tsx` (untouched by this plan) + the test filter regex in `tests/e2e/desktop-screenshots.spec.ts` (also untouched). No Phase 4 schema change can affect frontend Mapbox init.
- **Why not auto-fixed:** scope-boundary rule — failure is in a file unrelated to this plan's task scope (server schema/migrations). Fixing requires either expanding the filter to drop React-error-boundary console messages mentioning MapCanvas, or stabilizing MapCanvas itself.
- **Recommendation:** track for a Phase 5 or quick-fix plan that touches desktop/e2e (NOT a Phase 4 follow-up).

## TDD Gate Compliance

This plan executed two TDD cycles (Tasks 2 and 3). Gate sequence verified in git log:

- Task 2: `0fd6f1e test(04-01): ... (RED)` → `37d004b feat(04-01): ... (GREEN)` ✓
- Task 3: `bca2ec8 test(04-01): ... (RED)` → `5633efa feat(04-01): ... (GREEN)` ✓

No REFACTOR phases were needed — the GREEN implementations were minimal and clean.

## Self-Check: PASSED

Files created:
- `[ -f packages/server/src/db/db.service.test.ts ]` → FOUND
- `[ -f packages/server/src/db/fts.test.ts ]` → FOUND

Files modified:
- `packages/server/src/db/db.service.ts` — `sqliteVec.load(this)` present at line 21 → FOUND
- `packages/server/src/db/migrations.ts` — `version: 8` present, total 8 migrations → FOUND
- `packages/server/test/migrations.test.ts` — `embedding_model` in required-columns list → FOUND
- `packages/server/package.json` — `"sqlite-vec": "0.1.9"` → FOUND
- `pnpm-lock.yaml` — `sqlite-vec@0.1.9` resolved → FOUND

Commits in worktree branch (`worktree-agent-a6ae9adfb27cd55db`):
- `bf764e2` chore(04-01): pin sqlite-vec@0.1.9 (exact, pre-v1) → FOUND
- `0fd6f1e` test(04-01): add failing tests for sqlite-vec extension load (RED) → FOUND
- `37d004b` feat(04-01): load sqlite-vec extension in DbService.onModuleInit (GREEN) → FOUND
- `bca2ec8` test(04-01): add failing tests for migrations v5-v8 (RED) → FOUND
- `5633efa` feat(04-01): append migrations v5-v8 ... — GREEN → FOUND
