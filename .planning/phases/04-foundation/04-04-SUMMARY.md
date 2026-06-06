---
phase: 04-foundation
plan: 04
subsystem: server/services + server/media
tags:
  - peaks
  - audiowaveform
  - media-controller
  - audio
  - infra-05
  - tdd
requires:
  - entries.peaks_path column (Plan 04-01 migration v7)
  - MediaStore abstraction with subdir-creating `write` and `exists` (Plan 04-03)
  - MediaModule provider slot accepting `{ provide: 'MediaStore', useClass: DiskMediaStore }` (Plan 04-03)
  - WhisperService canonical structure (template for PeaksService — same OnApplicationBootstrap + setImmediate-backfill shape)
provides:
  - PeaksService — fire-and-forget audiowaveform pipeline mirroring WhisperService (binary probe → backfill → generateAsync entry point)
  - entries.peaks_path populated within ~5s of any new audio upload (when audiowaveform binary present)
  - Boot-time backfill populates peaks_path for pre-existing audio entries whose peaks_path IS NULL
  - GET /api/media/peaks/:entryId — stable URL serving the audiowaveform JSON; route ordered BEFORE the @Get(':filename') catch-all to avoid Pitfall 3 collision
  - Same regex guard (`/^[0-9a-zA-Z_-]+$/`) on entryId in both PeaksService and MediaController.servePeaks — T-04-04-V12 mitigation against path traversal
  - File-header documentation of the WaveSurfer.js int8 → -1..+1 normalization caveat (Pitfall 2) so Phase 5 audio wall implementers see it on first scroll-through
  - peaks.service.test.ts — 4 vitest cases (binary-missing probe / backfill SELECT predicate / unsafe-id rejection / real-binary JSON shape + DB update). Real-binary case is `it.skipIf(!commandOnPath('audiowaveform'))` so CI without the tool still passes cleanly.
  - tests/e2e/api-smoke.spec.ts gains a 5th case: full audio-upload → poll-for-peaks_path → GET /api/media/peaks/:id → assert JSON shape. Same `test.skip(!audiowaveformAvailable())` guard.
  - README Prerequisites documents `brew install audiowaveform` + Linux fallback link
affects:
  - packages/server/src/services/peaks.service.ts (new)
  - packages/server/src/services/peaks.service.test.ts (new)
  - packages/server/src/media/media.service.ts
  - packages/server/src/media/media.controller.ts
  - packages/server/src/media/media.module.ts
  - tests/e2e/api-smoke.spec.ts
  - README.md
tech-stack:
  added:
    - audiowaveform (system binary; declared optional with graceful degrade — install via `brew install audiowaveform`)
  patterns:
    - "Whisper-service-style binary-probe + setImmediate backfill (RESEARCH Pattern 6)"
    - "Fire-and-forget setImmediate from MediaService.processUpload, alongside Whisper, NOT chained (D-15)"
    - "NestJS declaration-order route resolution — specific path before catch-all (Pitfall 3 fix)"
    - "Tandem regex guard at trust-boundary (controller param + service filename derivation) — defense in depth at both entry points"
    - "`it.skipIf(!commandOnPath(bin))` + `test.skip(!audiowaveformAvailable())` for binary-gated tests so unit + e2e suites stay green on machines without the optional tool"
key-files:
  created:
    - packages/server/src/services/peaks.service.ts
    - packages/server/src/services/peaks.service.test.ts
    - .planning/phases/04-foundation/deferred-items.md (logs a pre-existing desktop-screenshots e2e failure for a separate plan)
  modified:
    - packages/server/src/media/media.service.ts
    - packages/server/src/media/media.controller.ts
    - packages/server/src/media/media.module.ts
    - tests/e2e/api-smoke.spec.ts
    - README.md
decisions:
  - "Use `fs.mkdirSync` (synchronous) + audiowaveform's `-o` flag instead of routing through `MediaStore.write`. `audiowaveform` writes the output file itself via the `-o` argument; we cannot capture a Buffer to hand to `store.write`. The `media/peaks/` subdir creation matches what `DiskMediaStore.write` does internally (`fsp.mkdir(path.dirname(abs), { recursive: true })`), so MediaController.servePeaks still finds files via `store.exists('peaks/<id>.json')` and the contract remains consistent."
  - "Mock `child_process` at module scope in peaks.service.test.ts via `vi.mock('child_process', …)` with a `vi.hoisted` factory ref, rather than `vi.spyOn(child_process, 'execFile')`. The latter fails with `Cannot redefine property: execFile` because vitest treats the ESM namespace as non-configurable. The mock approach also lets each test override the impl per scenario."
  - "Two separate `if (isAudio) …` lines in MediaService rather than collapsing into a single block — keeps the diff minimal-and-additive (single new line below the existing Whisper trigger) and emphasizes that Whisper and Peaks are independent fire-and-forget pipelines, not a chain."
  - "Same regex `/^[0-9a-zA-Z_-]+$/` literal in two places (PeaksService.generateOne + MediaController.servePeaks) rather than extracted to a shared constant. The two surfaces are at different trust boundaries — duplication is intentional defense in depth so a future refactor cannot accidentally weaken one without touching the other."
  - "Did NOT install the audiowaveform binary during plan execution. Rule 3 EXCLUDED package-manager installs (Slopsquat risk) — and the plan explicitly designs for graceful degrade when the binary is absent. The e2e + unit suites both pass via skip gates."
metrics:
  duration: 11m
  completed: 2026-06-06T10:13Z
  tasks_completed: 2
  files_created: 2
  files_modified: 5
requirements:
  - INFRA-05
---

# Phase 04 Plan 04: PeaksService + INFRA-05 Vertical Slice Summary

**One-liner:** Added the missing piece of the audio capture pipeline — `PeaksService` (audiowaveform fire-and-forget) populates `entries.peaks_path` on upload + boot-time backfill, and `MediaController` exposes the resulting JSON at `/api/media/peaks/:entryId` with the route declared before the catch-all so Phase 5's audio wall can hit a stable URL and hand the bytes straight to WaveSurfer.js (after dividing by 128).

## What shipped

### Task 1 — PeaksService (TDD)

**RED commit** `f352d05` — `test(04-04): add failing tests for PeaksService (RED)`
- 4 vitest cases (`packages/server/src/services/peaks.service.test.ts`, 246 lines):
  1. **Binary probe disables when missing** — `execFile('audiowaveform', ['--version'], …)` errors via mock; `onApplicationBootstrap()` leaves `enabled = false`; a log line mentions `audiowaveform`.
  2. **Backfill SELECT predicate** (D-18) — seed three rows: audio with `peaks_path = NULL` (entry A), audio with `peaks_path = 'media/peaks/b.json'` (entry B), note (entry C). Backfill calls `generateOne` exactly once, with A's id and media_path.
  3. **Unsafe entryId rejected** — `generateOne('../../etc/passwd', …)` writes NO file under `${tmpDir}/etc/`, NO file under `peaks/`, and emits a `log.warn` whose message matches `/unsafe/i`.
  4. **Real binary** (`it.skipIf(!commandOnPath('audiowaveform'))`) — generates a 1s mono 16kHz silent WAV inline, calls `generateOne('real1', 'media/test.wav')`, polls for the output file (5s budget), asserts the JSON has `version` / `channels` / `sample_rate` / `bits === 8` / `length` / `data` keys AND `SELECT peaks_path FROM entries WHERE id = 'real1'` returns `'media/peaks/real1.json'`.
- Module-scope `vi.mock('child_process', …)` + `vi.hoisted(() => vi.fn())` lets each test swap in a deterministic `execFile` callback.
- All 3 substantive cases failed (Test 4 was skipped — no audiowaveform on the executor).

**GREEN commit** `83578c9` — `feat(04-04): implement PeaksService — audiowaveform fire-and-forget pipeline (GREEN)`

Diff stats:
- `packages/server/src/services/peaks.service.ts`: new, 115 lines (file header — Pitfall 2 normalization caveat — imports — constants — class implementation)
- `README.md`: +2 / -1 (brew line + new bullet)

`PeaksService` mirrors `WhisperService` line-by-line:
- `private enabled = false;` flipped true by the bootstrap `--version` probe
- `generateAsync(entryId, mediaPath)` — early return if not enabled; setImmediate dispatch
- `private generateOne(entryId, mediaPath)` — regex guard → `fs.mkdirSync(peaksDir, { recursive: true })` → `execFile('audiowaveform', ['-i', absInput, '-o', peaksAbs, '--pixels-per-second', '20', '--bits', '8'], cb)` → on success: `UPDATE entries SET peaks_path = ? WHERE id = ?`
- `private backfill()` — `SELECT id, media_path FROM entries WHERE type='audio' AND media_path IS NOT NULL AND peaks_path IS NULL ORDER BY created_at DESC` → 75ms `setTimeout` tick between rows

The 15-line file header documents the int8→float normalization caveat (Pitfall 2) directly so a Phase 5 implementer reading the source first will see it before writing the WaveSurfer adapter.

### Task 2 — Wiring + Controller route + E2E

**Commit** `48a03ba` — `feat(04-04): wire PeaksService into MediaService + add /api/media/peaks/:entryId route`

Diff stats:
- `packages/server/src/media/media.module.ts`: +2 / -0 (import + provider entry)
- `packages/server/src/media/media.service.ts`: +3 / -0 (import + constructor param + audio-branch line)
- `packages/server/src/media/media.controller.ts`: +13 / -0 (new `servePeaks` method + clarifying comment about route ordering)
- `tests/e2e/api-smoke.spec.ts`: +91 / -1 (helper imports + `silentWav` builder + `audiowaveformAvailable` predicate + the new 5th test case)

Key implementation details:
- `MediaService` constructor parameter order is now `(db, whisper, peaks, @Inject('MediaStore') store)` — peaks slots in alphabetically/causally between whisper and the store
- Two separate `if (isAudio) …` lines (whisper + peaks) so the diff stays minimal-and-additive and the two pipelines stay visibly independent
- `MediaController.servePeaks` lives on line 40; the existing `serveFile` catch-all is now on line 48. NestJS resolves declaration-order, so a GET to `/api/media/peaks/<id>` matches `servePeaks` before falling through to `serveFile` (which would otherwise treat `peaks` as a filename, fail the existence check on a directory, and 404)
- E2E test uploads a 32 KB silent WAV (44-byte canonical PCM header + 16000 mono 16-bit zeros) via `multipart` — no on-disk fixture needed, regenerated per run

## Verification

**Unit tests** — `pnpm --filter @memoir/server test`:
```
✓ src/db/db.service.test.ts (4 tests)
✓ src/db/fts.test.ts (5 tests)
✓ test/migrations.test.ts (8 tests)
✓ src/media/media-store.test.ts (5 tests)
✓ src/services/embedding.service.test.ts (8 tests)
✓ src/services/peaks.service.test.ts (4 tests | 1 skipped)
Test Files  6 passed (6)
Tests       33 passed | 1 skipped (34)
```

**Typecheck** — `pnpm typecheck`: green across contract, server, desktop, mobile.

**E2E (api-smoke only)** — `pnpm e2e -- api-smoke`:
```
✓ GET /api/entries returns an array (empty on fresh DB)
✓ POST → GET → PATCH → DELETE lifecycle works
✓ POST with no lat/lng skips geocoding gracefully
✓ filter by type narrows the list
- audio upload → peaks_path populated → /api/media/peaks/:entryId serves shaped JSON  (skipped: audiowaveform binary not on PATH)
4 passed, 1 skipped (6.0s)
```

**E2E (full suite)** — one pre-existing failure surfaces in `desktop-screenshots.spec.ts > page does not throw uncaught errors`. Reproduced at base commit `d0885f4` via `git stash` + re-run, confirming the failure is unrelated to plan 04-04. Logged in `.planning/phases/04-foundation/deferred-items.md`.

**Manual smoke (deferred):** would-be `curl https://localhost:3000/api/media/peaks/<entryId>` requires audiowaveform installed locally; the executor honoured Rule 3's package-manager-install exclusion and did not run `brew install`. The same code path is exercised in the e2e test's skipped case, which the maintainer can run after `brew install audiowaveform`.

## Acceptance criteria

All criteria from the plan pass:

| Criterion | Status |
|-----------|--------|
| `grep "class PeaksService implements OnApplicationBootstrap"` returns a line | OK (line 33) |
| `grep "audiowaveform" peaks.service.ts` returns ≥ 2 lines | OK (8 lines) |
| `grep "WaveSurfer" peaks.service.ts` returns ≥ 1 line | OK (3 lines — file header) |
| `grep "peaks_path IS NULL" peaks.service.ts` returns a line | OK (line 97 — backfill predicate) |
| `grep "audiowaveform" README.md` returns ≥ 2 lines | OK (2 lines — brew line + bullet) |
| `pnpm --filter @memoir/server test -- peaks.service` exits 0 | OK |
| `pnpm --filter @memoir/server typecheck` exits 0 | OK |
| `grep "import { PeaksService }" media.service.ts` returns a line | OK (line 6) |
| `grep "this\.peaks\.generateAsync" media.service.ts` returns a line | OK (line 41) |
| `grep "private readonly peaks: PeaksService" media.service.ts` returns a line | OK (line 18) |
| `grep "PeaksService" media.module.ts` returns a line | OK (line 6 + line 13) |
| `grep "@Get('peaks/:entryId')" media.controller.ts` returns a line | OK (line 40) |
| peaks route line < filename route line | OK (40 < 48) |
| `grep "peaks_path" tests/e2e/api-smoke.spec.ts` returns a line | OK (3 lines) |
| `pnpm e2e -- api-smoke` exits 0 | OK (4 passed, 1 skipped) |

## Deviations from Plan

None of substance. Two minor process deviations worth recording:

1. **Test execFile mocking** — the plan suggested `vi.spyOn(child_process, 'execFile').mockImplementation(...)`. That throws `Cannot redefine property: execFile` because the ESM namespace binding is non-configurable in vitest. Switched to `vi.mock('child_process', …)` with a `vi.hoisted(() => vi.fn())` shared ref. Same coverage, different mechanism.
2. **`pnpm verify` surfaced a pre-existing failure** in `desktop-screenshots.spec.ts > page does not throw uncaught errors` (MapCanvas blows up with no MAPBOX_TOKEN in the playwright webServer env). Verified pre-existing at base commit `d0885f4` via stash-and-re-run. Documented in `.planning/phases/04-foundation/deferred-items.md` and out of scope for plan 04-04.

## Known Stubs

None. Every artifact specified in the plan was implemented end-to-end:
- PeaksService — real audiowaveform invocation, real DB UPDATE, real backfill loop
- MediaController.servePeaks — real existence check, real file serving via `res.sendFile`
- MediaService wiring — real fire-and-forget from `processUpload`
- E2E test — real audio buffer, real upload, real polling, real shape assertion (gated on binary presence; the gate is the only "stub" and is documented in CONTEXT.md / RESEARCH.md as the intended graceful-degrade contract)

## Self-Check: PASSED

Verified all created and modified files exist at their committed paths, and all three commits are reachable from HEAD:

```
FOUND: packages/server/src/services/peaks.service.ts
FOUND: packages/server/src/services/peaks.service.test.ts
FOUND: packages/server/src/media/media.service.ts (modified)
FOUND: packages/server/src/media/media.controller.ts (modified)
FOUND: packages/server/src/media/media.module.ts (modified)
FOUND: tests/e2e/api-smoke.spec.ts (modified)
FOUND: README.md (modified)
FOUND: .planning/phases/04-foundation/deferred-items.md
FOUND: f352d05 (RED — test(04-04): add failing tests for PeaksService)
FOUND: 83578c9 (GREEN — feat(04-04): implement PeaksService)
FOUND: 48a03ba (Task 2 — feat(04-04): wire PeaksService + route + e2e)
```
