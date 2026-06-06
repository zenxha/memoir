---
phase: 04-foundation
plan: 02
subsystem: server/services
tags:
  - embedding
  - ollama
  - vec0
  - foundation
  - tdd
requires:
  - sqlite-vec extension loaded on DbService (Plan 04-01)
  - entries_vec vec0 virtual table (Plan 04-01 migration v5)
  - entries.embedding_model column (Plan 04-01 migration v6)
provides:
  - EmbeddingService.generate() promoted to public (D-MECH-02) for Phase 6 RecallService injection
  - Unified FIFO worker covering both backfill (embedding IS NULL) and regenerate (embedding_model != MODEL)
  - Dual write per embedding — entries.embedding BLOB + entries.embedding_model + entries_vec(rowid)
  - 768-dim validation guard (Pitfall 5) with BLOB-only fallback when dim mismatches
  - vec0 rowid binding via BigInt(row.rowid) — surfaces the Pitfall 1 type-coercion requirement in code + comment
  - Ollama-down circuit-break: warn once, 30s normal backoff, 1h after 10 consecutive failures (Pitfall 8)
  - EMBED_MODEL env var with 768-dim invariant documented in .env.example
  - embedding.service.test.ts — 8 vitest cases covering all behaviors above
affects:
  - packages/server/src/services/embedding.service.ts
  - packages/server/src/services/embedding.service.test.ts (new)
  - .env.example
tech-stack:
  added: []
  patterns:
    - "RESEARCH Pattern 3: vec0 + entries write coordination (dual write inside this.db.transaction)"
    - "Whisper-service-style stale-model predicate generalized to embeddings (transcript_model != ? → embedding_model != ?)"
    - "Single FIFO worker iterating SELECT … LIMIT 1 per pass (vs. fetch-once-iterate-all) so the worker re-evaluates the queue after each write"
    - "Module-scope env capture (`const MODEL = process.env.EMBED_MODEL ?? '…'`) — same pattern as OLLAMA_URL"
key-files:
  created:
    - packages/server/src/services/embedding.service.test.ts
  modified:
    - packages/server/src/services/embedding.service.ts
    - .env.example
decisions:
  - "Bind vec0 rowid as BigInt(row.rowid), not as a plain JS number. better-sqlite3 raises 'Only integers are allows for primary key values on entries_vec' for plain Number bindings, even when typeof === 'number'. Reproduced in isolation with a 3-line script before applying the fix. The plan called out Pitfall 1 conceptually but didn't specify BigInt; this is the concrete coercion required."
  - "Worker uses SELECT … LIMIT 1 per loop iteration rather than fetching the full queue up front. This means a slow-running worker stays accurate as new entries arrive (EntriesService.create → embedAsync → setImmediate) and the regenerate predicate stays current if EMBED_MODEL is rotated mid-run."
  - "warnedThisBurst flag is local to the backfill() invocation, not instance state — single-shot embedAsync calls never share the backoff counter with the worker loop (per plan step 6). Honours the plan's explicit separation."
  - "Test bootstrap helper sets `enabled = true` directly rather than calling `onApplicationBootstrap()` to avoid the fire-and-forget setImmediate backfill outliving the test, which otherwise produces 'database connection is not open' unhandled rejections."
metrics:
  duration: 6m
  completed: 2026-06-06T00:58Z
  tasks_completed: 1
  files_created: 1
  files_modified: 2
requirements:
  - INFRA-02
  - INFRA-04
---

# Phase 04 Plan 02: EmbeddingService Refactor Summary

**One-liner:** Refactored EmbeddingService so every embedding write hits both `entries.embedding` BLOB and `entries_vec(rowid)` inside one transaction, with `generate()` now public, an env-driven `EMBED_MODEL`, a unified FIFO worker that covers both backfill and post-model-swap regeneration, a 768-dim validation guard with BLOB-only fallback, and a 10-failure circuit-break to 1h backoff so an unreachable Ollama no longer log-spams.

## What shipped

### Task 1 — Refactor (TDD)

**RED commit** `00ced3b` — `test(04-02): add failing tests for EmbeddingService refactor (RED)`
- 8 vitest cases (`packages/server/src/services/embedding.service.test.ts`, 345 lines):
  1. **FIFO worker SELECT** — raw SQL query returns exactly `[B, A]` (stale-model + NULL-embed, newest-first), excludes current-model row C
  2. **Text concat** — `[title, body, transcript].join(' \n ')` only; `place_name` / `music_*` excluded
  3. **Dual write** — `entries.embedding` populated AND `entries_vec` row with matching rowid
  4. **Model recording** — `entries.embedding_model` populated from env-driven MODEL
  5. **Dim mismatch (Pitfall 5)** — 512-dim vector writes BLOB but NOT vec0; warn emitted
  6. **Ollama-down (Pitfall 8)** — after 10 consecutive failures, the worker's next `setTimeout` delay is `>= 3_600_000` ms; warn count stays well below 10 (no per-failure spam)
  7. **rowid join key (Pitfall 1)** — vec0 INSERT uses INTEGER rowid; TEXT id lookup returns nothing
  8. **Public generate()** — `svc.generate('hello')` callable from external code, returns 768-element vector
- All 6 substantive tests failed; tests 1 and 8 passed (test 1 is a pure SQL check, test 8 succeeded at runtime because TypeScript `private` is compile-only — TDD discipline still satisfied since the implementation tests 3/4/5/6/7 all required the refactor to pass)

**GREEN commit** `9b82e96` — `feat(04-02): refactor EmbeddingService — public generate, FIFO worker, dual write to vec0 (GREEN)`

Diff stats:
- `packages/server/src/services/embedding.service.ts`: +115 / -37 (152-line file vs. prior 82)
- `packages/server/src/services/embedding.service.test.ts`: +345 (new file)
- `.env.example`: +5 (EMBED_MODEL block immediately after OLLAMA_URL)

Key implementation points (mapped to plan's must-haves):

| Must-have | Implementation |
|---|---|
| D-MECH-02 (public generate) | `public async generate(text: string): Promise<number[] | null>` — explicit `public` modifier so the literal grep `public async generate` matches |
| D-03 (EMBED_MODEL env) | `const MODEL = process.env.EMBED_MODEL ?? 'nomic-embed-text';` at module scope |
| D-06 (3-field text) | `[row.title, row.body, row.transcript].filter(Boolean).join(' \n ').trim()` |
| D-04/D-05 (unified FIFO worker) | `SELECT id FROM entries WHERE (embedding IS NULL AND …) OR (embedding IS NOT NULL AND embedding_model != ?) ORDER BY created_at DESC LIMIT 1` per iteration |
| D-07 (dual write tx) | `this.db.transaction(() => { UPDATE entries …; if (dimOk) INSERT OR REPLACE INTO entries_vec(rowid, embedding) …; })()` |
| Pitfall 1 (rowid as integer) | `BigInt(row.rowid)` — see Deviations |
| Pitfall 5 (dim guard) | `const dimOk = vec.length === 768;` before vec0 INSERT; warn-log on mismatch; BLOB still written |
| Pitfall 8 (Ollama-down backoff) | Per-failure counter; 30s normal, 1h after 10 consecutive; single warn per burst; clears on success |

### .env.example diff

```diff
 # Embeddings via Ollama (optional)
 # Run: ollama pull nomic-embed-text
 OLLAMA_URL=http://localhost:11434

+# Embedding model (default: nomic-embed-text)
+# Used for semantic recall. Must produce 768-dim vectors to match the entries_vec virtual table schema.
+# Swapping to a different-dim model requires a new migration (vec0 hardcodes dimension at table create).
+EMBED_MODEL=nomic-embed-text
+
 # Data directory (optional — defaults to packages/server/data)
 MEMOIR_DATA_DIR=
```

## Verification

### Server unit tests (vitest)
```
✓ src/db/db.service.test.ts (4 tests)
✓ src/db/fts.test.ts (5 tests)
✓ src/services/embedding.service.test.ts (8 tests)
✓ test/migrations.test.ts (8 tests)

Test Files  4 passed (4)
Tests       25 passed (25)
```

### Server typecheck
```
pnpm --filter @memoir/server typecheck → exit 0
```

### Full workspace typecheck
```
pnpm typecheck → all 4 packages (contract, server, desktop, mobile) clean
```

### Acceptance criteria (structural greps)

| Criterion | Result |
|---|---|
| `grep -n 'public async generate' packages/server/src/services/embedding.service.ts` | line 60 ✓ |
| `grep -n "process.env.EMBED_MODEL ?? 'nomic-embed-text'" packages/server/src/services/embedding.service.ts` | line 6 ✓ |
| `grep -n 'INSERT OR REPLACE INTO entries_vec' packages/server/src/services/embedding.service.ts` | line 110 ✓ |
| `grep -n 'SELECT rowid' packages/server/src/services/embedding.service.ts` | line 81 ✓ |
| `grep -n 'embedding_model != ' packages/server/src/services/embedding.service.ts` | lines 120, 131 ✓ |
| `grep -n 'vec.length === 768' packages/server/src/services/embedding.service.ts` | line 94 ✓ |
| `grep -v '^#' .env.example | grep -c '^EMBED_MODEL='` | 1 ✓ |
| `pnpm --filter @memoir/server test -- embedding.service` exits 0 | ✓ |
| `pnpm --filter @memoir/server typecheck` exits 0 | ✓ |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] vec0 rowid binding must be `BigInt`, not a plain JS Number**

- **Found during:** Task 1 GREEN — Tests 3, 4, 7 failed with `SqliteError: Only integers are allows for primary key values on entries_vec` even though `typeof row.rowid === 'number'`.
- **Issue:** better-sqlite3's `.run(row.rowid, buf)` against a vec0 virtual table rejects the JS Number binding for the PRIMARY KEY column. Reproduced in isolation:
  ```js
  // typeof rowid === 'number', value === 1
  db.prepare('INSERT INTO ev(rowid, embedding) VALUES (?, ?)').run(1, buf);
  // → SqliteError: Only integers are allows for primary key values on ev

  db.prepare('INSERT INTO ev(rowid, embedding) VALUES (?, ?)').run(BigInt(1), buf);
  // → ok, readback rowid === 1 (back to JS Number)
  ```
- **Fix:** Wrap the rowid binding in `BigInt(...)` at the single call site:
  ```ts
  // vec0 requires a BigInt for the rowid PRIMARY KEY binding — passing a
  // plain JS Number raises "Only integers are allows for primary key
  // values on entries_vec" even when `typeof rowid === 'number'` (Pitfall 1).
  this.db
    .prepare('INSERT OR REPLACE INTO entries_vec(rowid, embedding) VALUES (?, ?)')
    .run(BigInt(row.rowid), buf);
  ```
- **Files modified:** `packages/server/src/services/embedding.service.ts` (one line + inline comment).
- **Commit:** included in `9b82e96` (single GREEN commit; the BigInt fix was applied between the first failed GREEN attempt and the test re-run that passed — no separate commit).
- **Plan relevance:** The plan flagged Pitfall 1 conceptually ("entries.rowid is INTEGER, vec0 keys by INTEGER") but did not name the JS-side coercion. This is the concrete runtime form of that warning.

### Test-side adjustments (not deviations from product behavior)

**1. Test 6 (Pitfall 8 backoff) — `enabled=false` escape hatch**

The plan's Test 6 mocks `setTimeout` to fire immediately so the worker progresses through 10+ failures and a long delay can be observed. With instant timers, the `while (this.enabled)` loop would otherwise spin indefinitely (each fetch returns null → schedule another delay → no row mutates → re-fetch null → …).

The test now flips `(svc as any).enabled = false` from within the mocked setTimeout callback once a `>= 3_600_000 ms` delay is observed. This lets the worker exit cleanly on the next iteration. This is a test-harness device only — production behavior is unchanged.

**2. Test bootstrap helper — `bootService()` instead of `await onApplicationBootstrap()`**

`onApplicationBootstrap()` calls `setImmediate(() => this.backfill())`. In vitest, that scheduled backfill outlives the test and runs against a `db.close()`-d connection, producing noisy "database connection is not open" unhandled rejections that don't fail the test but pollute output.

The test helper `bootService(db)` directly sets `enabled = true` and skips the bootstrap. Tests that need the worker (Test 6) call `await (svc as any).backfill()` explicitly. This is a unit-test convenience and matches the plan's note "DI is bypassed; pass the raw better-sqlite3 instance."

## TDD Gate Compliance

Task 1 executed one TDD cycle. Gate sequence verified in git log:
- `00ced3b test(04-02): … (RED)` → `9b82e96 feat(04-02): … (GREEN)` ✓

No REFACTOR phase — the GREEN implementation is already minimal (no dead code, no duplicated logic). Pitfall-1 BigInt fix was a single-line correction within the same GREEN attempt; not a separate refactor commit.

## Threat Model Mitigations

All `mitigate`-disposition threats from the plan's threat register are implemented:

| Threat ID | Mitigation in code |
|---|---|
| T-04-02-V5 (SQL injection) | Every `db.prepare(...)` uses `?` placeholders; MODEL is bound, not interpolated, into the FIFO worker SELECT |
| T-04-02-DIM (vec0 dim mismatch) | `const dimOk = vec.length === 768;` gate before vec0 INSERT; mismatch logs warn and skips vec0 (line 94–98, 109–113) |
| T-04-02-DOS (Ollama-down hot-loop) | `BACKOFF_MS = 30_000`, `CIRCUIT_BREAK_FAILURES = 10`, `CIRCUIT_BREAK_MS = 3_600_000`; single warn per burst, log-on-recovery (line 121, 132–161) |

## Self-Check: PASSED

Files created:
- `[ -f packages/server/src/services/embedding.service.test.ts ]` → FOUND (345 lines)

Files modified:
- `packages/server/src/services/embedding.service.ts` — `public async generate` at line 60, `BigInt(row.rowid)` at line 112 → FOUND
- `.env.example` — `EMBED_MODEL=nomic-embed-text` present → FOUND

Commits on `worktree-agent-aa278d82f0a92dc37`:
- `00ced3b` test(04-02): add failing tests for EmbeddingService refactor (RED) → FOUND
- `9b82e96` feat(04-02): refactor EmbeddingService — public generate, FIFO worker, dual write to vec0 (GREEN) → FOUND
