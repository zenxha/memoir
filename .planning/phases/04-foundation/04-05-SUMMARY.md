---
phase: 04-foundation
plan: 05
subsystem: server
tags: [backup, sqlite, scheduled, infra]
requires:
  - 04-02   # sequenced via .env.example shared file
provides:
  - INFRA-07
affects:
  - packages/server/src/app.module.ts
  - .env.example
tech_stack:
  added: []
  patterns:
    - "OnApplicationBootstrap + setInterval ambient service (mirrors LastfmService)"
    - "Hourly-tick + hour-of-day check (no @nestjs/schedule dependency)"
    - "better-sqlite3 Database.prototype.backup() — same-connection writes auto-reflected"
    - "Opportunistic catch-up on boot when newest backup >24h old (setImmediate)"
    - "Retention rotation: keep last 7 daily + last 4 Sunday-stamped weekly"
key_files:
  created:
    - packages/server/src/services/backup.service.ts
    - packages/server/src/services/backup.service.test.ts
  modified:
    - packages/server/src/app.module.ts
    - .env.example
decisions:
  - "D-22: nightly @ 3am via setInterval + opportunistic catch-up on boot (no @nestjs/schedule)"
  - "D-23: 7 daily + 4 Sunday weekly retention (≤11 files steady-state)"
  - "D-24: plain .db files (no gzip) — restore is `cp memoir-YYYY-MM-DD.db memoir.db`"
  - "D-25: BACKUP_DIR defaults to ${MEMOIR_DATA_DIR}/backups; env override supports external disk"
  - "D-26: scope is only the SQLite .db file (media files handled by Time Machine / rsync)"
  - "Security V8: BACKUP_DIR mode 0700 — backups contain transcripts, GPS, music history"
metrics:
  tasks_completed: 2
  files_modified: 4
  lines_added: ~360
  duration_minutes: ~10
  completed: 2026-06-06
---

# Phase 04 Plan 05: Nightly SQLite Backup Service (INFRA-07) Summary

INFRA-07 lands as a Nest-injectable `BackupService` that fires `better-sqlite3`'s native `.backup()` once per night at 3am, opportunistically catches up on boot when the newest snapshot is stale, and rotates retention to ≤7 daily + ≤4 Sunday-stamped weekly files in a mode-0700 directory — closing the Phase 4 INFRA chain.

## What was built

### 1. `BackupService` (97 lines) — `packages/server/src/services/backup.service.ts`

```text
class BackupService implements OnApplicationBootstrap, OnModuleDestroy
  constructor(db: DbService)               // DbService extends Database; .backup() inherited
  onApplicationBootstrap()                 // resolve BACKUP_DIR, mkdir 0700, schedule
    ├─ shouldCatchUp() → setImmediate(runBackup)   // D-22 boot catch-up
    └─ setInterval(hourly tick, 1h)                // hour-of-day === 3 → runBackup
  onModuleDestroy()                        // clearInterval cleanup
  runBackup()  (private async)             // await db.backup(dest) → rotate()
  rotate()     (private)                   // keep last 7 daily + last 4 Sunday weekly
  listBackups() (private)                  // memoir-YYYY-MM-DD.db regex + ISO sort
  shouldCatchUp() (private boolean)        // 24h freshness check
```

**Retention algorithm** (D-23):

```text
files = listBackups()                     // ISO date-sorted ascending
keep  = new Set()
keep.add(...files.slice(-7))               // last 7 daily

weekly = []
for i = files.length-1 → 0  (walk newest first)
  if weekly.length >= 4: break
  if Date(files[i]).getUTCDay() === 0: weekly.push(files[i])
keep.add(...weekly)                        // up to last 4 Sunday weekly

for f in files: if !keep.has(f): unlink(f)
```

Steady-state: ≤11 files. Overlap is fine (a recent Sunday in `last7` also lands in `weekly`; the `Set` dedupes).

### 2. `BackupService` spec (268 lines) — `packages/server/src/services/backup.service.test.ts`

7 tests, all green:

| # | Test | What it pins |
|---|------|--------------|
| 1 | `runBackup` writes a dated `.db` file readable as SQLite with the same entries | end-to-end backup roundtrip |
| 2 | `BACKUP_DIR` defaults to `${MEMOIR_DATA_DIR}/backups` when env is unset | D-25 default resolution |
| 3 | `BACKUP_DIR` env override is respected | D-25 env override |
| 4 | backup directory is created mode 0700 (Security V8) | T-04-05-V8 mitigation |
| 5 | retention rotation keeps last 7 daily + last 4 Sunday weekly (181-day synthesized seed) | D-23 algorithm correctness |
| 6 | `shouldCatchUp` respects 24h freshness window (empty + 23h + 25h cases) | D-22 boot catch-up trigger |
| 7 | scheduled tick fires backup at hour=3 and skips at hour=4 (vi.setSystemTime) | hour-of-day check |

`stubBootstrapTimers()` helper neutralizes the bootstrap's `setInterval`/`setImmediate` so they don't leak across tests or race the explicit `runBackup()` invocations.

### 3. AppModule wiring — `packages/server/src/app.module.ts`

```diff
+ import { BackupService } from './services/backup.service';
- providers:   [LastfmService, SyncthingService],
+ providers:   [LastfmService, SyncthingService, BackupService],
```

DbService is `@Global()` (via DbModule already imported), so BackupService's constructor injection works without further imports.

### 4. `.env.example` — `BACKUP_DIR` documentation

```text
# Backup directory (default: ${MEMOIR_DATA_DIR}/backups)
# Nightly SQLite .backup() snapshots land here. Plain .db files; restore is `cp` (no decompression).
# Retention: last 7 daily + last 4 Sunday-stamped weekly. Set to an external disk path for off-machine snapshots.
BACKUP_DIR=
```

Appended after the existing `MEMOIR_DATA_DIR=` block — does not touch the `EMBED_MODEL=` line that 04-02 added (depends_on sequencing intent preserved).

## Verification

| Gate | Command | Result |
|------|---------|--------|
| Acceptance criteria — Task 1 | `grep` battery on `backup.service.ts` | ✓ all 6 pattern matches succeed |
| Acceptance criteria — Task 2 | `grep -n BackupService app.module.ts && grep -v '^#' .env.example \| grep -c '^BACKUP_DIR='` | ✓ 2 matches in module, 1 in env |
| Server typecheck | `pnpm --filter @memoir/server typecheck` | ✓ pass |
| Server unit tests | `pnpm --filter @memoir/server test` | ✓ 37 tests / 6 files pass |
| New tests | `pnpm --filter @memoir/server test -- backup.service` | ✓ 7 tests pass |
| Root typecheck | included in `pnpm verify` | ✓ pass |
| Root vitest | included in `pnpm verify` | ✓ pass |
| Root Playwright | included in `pnpm verify` | 6 / 7 pass; 1 pre-existing failure (see Deferred Issues) |

Manual smoke (not run; documented for the owner per `<verification>` section of the PLAN):

```bash
BACKUP_DIR=/tmp/memoir-backup pnpm --filter @memoir/server dev
# Expect log: "Backup service active (dir: /tmp/memoir-backup)"
# Within ~seconds (if >24h since last backup): "Backup written: memoir-YYYY-MM-DD.db"
ls -la /tmp/memoir-backup        # drwx------ (40700)
sqlite3 /tmp/memoir-backup/memoir-*.db 'SELECT count(*) FROM entries'
```

## Decisions Made

- **D-22 / D-23 / D-24 / D-25 / D-26** — all from the plan frontmatter; no deviations.
- **Security V8 chmod is best-effort** — wrapped `fs.chmodSync(this.backupDir, 0o700)` in try/catch so a non-POSIX host (Windows) doesn't crash the bootstrap. POSIX hosts get strict enforcement (asserted by Test 4).
- **`runBackup()` swallows errors with `log.warn`** — matches the existing `LastfmService` ambient pattern; failure of one night's backup must never crash the server.
- **No `@nestjs/schedule` dependency** — explicit decision in the plan; mirrored `LastfmService.setInterval` pattern. Zero new packages added.
- **Hour-of-day check uses `now.getHours() === 3` (no minute predicate)** — the plan's stated semantic ("fires once per 3am block") is preserved because `setInterval(_, ONE_HOUR_MS)` lands inside the 3am block at most once before crossing into 4am. Dropping the `getMinutes() < 60` clause from the inline example is intentional and equivalent (every minute 0..59 is `< 60`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Test 1 setImmediate/explicit-runBackup race**
- **Found during:** Task 1, first test run
- **Issue:** Initial Test 1 called `svc.onApplicationBootstrap()` (which schedules `setImmediate(runBackup)`) followed by `await new Promise(r => setImmediate(r))` then `await (svc as any).runBackup()`. The bootstrap's catch-up backup and the explicit invocation raced on the same destination file, producing "disk I/O error" from `better-sqlite3`.
- **Fix:** Introduced `stubBootstrapTimers()` helper that mocks `setInterval` and `setImmediate` to no-ops, eliminating the race. Applied to all 7 tests for consistency and clean log output.
- **Files modified:** `packages/server/src/services/backup.service.test.ts`
- **Commit:** `346630d` (folded into GREEN commit)
- **Outcome:** All 7 tests pass deterministically.

No production-code deviations from the plan's implementation block.

## Threat Flags

No new security-relevant surface introduced beyond the plan's `<threat_model>`. The four mitigated/accepted threats (T-04-05-V8, T-04-05-DIR, T-04-05-WAL, T-04-05-DOS, T-04-05-SC) are all covered:

- **T-04-05-V8 (mitigate)**: `fs.chmodSync(this.backupDir, 0o700)` immediately after mkdir, asserted by Test 4.
- **T-04-05-DIR/WAL/DOS/SC (accept)**: documented; no new mitigation needed.

## Known Stubs

None. No placeholder data, no hardcoded empty UI sinks, no "coming soon" — this is a server-only background service with no UI surface.

## Deferred Issues

**1. Pre-existing E2E failure: `tests/e2e/desktop-screenshots.spec.ts:63 — page does not throw uncaught errors`**

- **Symptom:** `<MapCanvas>` raises a React render error in the test env that's surfaced via `console.error` but not caught by the test's `mapbox|access token` filter regex.
- **Root cause:** test env doesn't inject a valid `MAPBOX_TOKEN` via `/config.js`, so Mapbox v3 init in `MapCanvas.tsx` throws during component mount. The error message is the React error-boundary diagnostic "The above error occurred in the <MapCanvas> component" — no token-related substring → filter passes it through.
- **Scope:** `packages/desktop/src/globe/MapCanvas.tsx` (untouched by this plan) + the filter regex in `tests/e2e/desktop-screenshots.spec.ts` (also untouched). No Phase 4 backup-service change can affect frontend Mapbox init.
- **Why not auto-fixed (Scope Boundary):** failure is in files completely unrelated to this plan's task scope (server scheduled backup). Identical failure was logged as a deferred item in `04-02-SUMMARY.md` and `04-03-SUMMARY.md` with the same recommendation.
- **Recommendation:** quick-fix plan that either (a) expands the test filter to drop React-error-boundary console messages mentioning MapCanvas, or (b) provides a stub Mapbox token in the test bootstrap to keep MapCanvas from throwing. Not a Phase 4 follow-up.

## Phase-4 Closeout

All 7 INFRA requirements are now DONE:

| Req | Description | Landed in |
|-----|-------------|-----------|
| INFRA-01 | better-sqlite3 + WAL + foreign_keys | pre-Phase-4 (DbService) |
| INFRA-02 | sqlite-vec extension loaded before migrations | pre-Phase-4 (DbService onModuleInit) |
| INFRA-03 | FTS5 entries_fts table | Plan 04-01 |
| INFRA-04 | vec0 entries_vec virtual table (768-dim) | Plan 04-01 |
| INFRA-05 | EmbeddingService — FIFO worker, dual-write to BLOB + vec0 | Plan 04-02 |
| INFRA-06 | MediaStore abstraction + thumbnails routed via MediaStore | Plan 04-03 |
| INFRA-07 | Nightly BackupService — setInterval @ 3am + 7+4 retention | Plan 04-05 (this) |

Plan 04-04 (`PeaksService` waveform peaks) is the remaining Wave 3 plan; it does not block Phase 4 INFRA completion because the peaks work attaches to `entries` rows separately and doesn't gate `pnpm verify`.

## Self-Check

**Files claimed created:**

```bash
[ -f packages/server/src/services/backup.service.ts ] && echo "FOUND" || echo "MISSING"
# FOUND
[ -f packages/server/src/services/backup.service.test.ts ] && echo "FOUND" || echo "MISSING"
# FOUND
```

**Files claimed modified:**

```bash
grep -c "BackupService" packages/server/src/app.module.ts
# 2 (import line + providers entry)
grep -v '^#' .env.example | grep -c '^BACKUP_DIR='
# 1
```

**Commits claimed:**

```bash
git log --oneline -3
# 1979c62 feat(04-05): register BackupService in AppModule + document BACKUP_DIR
# 346630d feat(04-05): implement BackupService (INFRA-07)
# 6e3eaf7 test(04-05): add failing test for BackupService (INFRA-07)
```

## Self-Check: PASSED
