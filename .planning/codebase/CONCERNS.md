# Codebase Concerns

**Analysis Date:** 2026-05-24

## Tech Debt

**`external_id` bypasses the contract schema:**
- Issue: `external_id` is not in `CreateEntrySchema` (packages/contract/src/index.ts:43-60). Both `LastfmService` and `SyncthingService` pass it via `as any` casts when calling `entries.create()`. In `entries.service.ts:73`, the field is read via `(dto as any).external_id`.
- Files: `packages/server/src/entries/entries.service.ts:73`, `packages/server/src/services/lastfm.service.ts:109`, `packages/server/src/services/syncthing.service.ts:71`
- Impact: Type system provides no protection against typos or future rename. Any refactor of external_id will silently miss these call sites.
- Fix approach: Add `external_id` as an optional field to `CreateEntrySchema` in the contract. Remove all `as any` casts at the call sites.

**`transcript_model` missing from the Entry contract schema:**
- Issue: Migration 4 (`packages/server/src/db/migrations.ts:64`) adds a `transcript_model TEXT` column. The `WhisperService` reads and writes it. But `EntrySchema` in `packages/contract/src/index.ts` does not include the field — it is invisible to clients and cannot be relied on in frontend code.
- Files: `packages/contract/src/index.ts`, `packages/server/src/services/whisper.service.ts:59`
- Impact: Desktop/mobile cannot display which Whisper model produced a transcript. Any future UI that surfaces model provenance must add the field to the contract first.
- Fix approach: Add `transcript_model: z.string().nullable()` to `EntrySchema`.

**Media directory path computed in multiple places:**
- Issue: The `MEMOIR_DATA_DIR → media` path is independently computed (with the same fallback logic) in three separate files: `packages/server/src/media/media.service.ts:8-10`, `packages/server/src/media/media.controller.ts:9-11`, and `packages/server/src/services/whisper.service.ts:44-46`. Any change to the path resolution logic must be applied in all three places.
- Files: `packages/server/src/media/media.service.ts`, `packages/server/src/media/media.controller.ts`, `packages/server/src/services/whisper.service.ts`
- Impact: Easy to introduce divergence; `whisper.service.ts` computes the data dir without `/media` appended then joins paths manually, while the other two compute the full media path. A subtle difference.
- Fix approach: Centralise in `DbService` or a dedicated `PathsService` that exposes `dataDir` and `mediaDir`, and inject it wherever needed.

**Hardcoded Ollama embedding model:**
- Issue: `packages/server/src/services/embedding.service.ts:6` hardcodes `MODEL = 'nomic-embed-text'` as a module-level constant with no env var override. Changing models requires a code change and re-deploy.
- Files: `packages/server/src/services/embedding.service.ts:5-6`
- Impact: No way to switch embedding model (e.g. to a larger or faster variant) without modifying source. Embeddings stored by one model are not compatible with another, so a model switch also requires full re-embedding — but the backfill only triggers on missing embeddings, not on model change (unlike Whisper's `transcript_model` tracking).
- Fix approach: Read from `process.env.OLLAMA_MODEL ?? 'nomic-embed-text'`. Add an `embedding_model` column (migration 5) to track which model produced each embedding. Mirror the Whisper re-backfill-on-model-change pattern.

**`CommandPalette` search is client-side and capped at 200 entries:**
- Issue: `packages/desktop/src/components/CommandPalette.tsx:22` slices entries to the first 200 for search actions. The list load itself is capped at 1000 entries (`packages/desktop/src/App.tsx:27`). There is no server-side search endpoint.
- Files: `packages/desktop/src/components/CommandPalette.tsx:22`, `packages/desktop/src/App.tsx:27`
- Impact: As the archive grows beyond 1000 entries, older moments become unreachable through search. The embeddings infrastructure exists but has no query endpoint exposed.
- Fix approach: Add a `GET /api/entries/search?q=` endpoint on the server (SQLite FTS5 or vector similarity using the stored embeddings). Wire the CommandPalette to call it instead of filtering the local list.

**`sky` surface is not a distinct view:**
- Issue: `Surface` type includes `'sky'` (`packages/desktop/src/components/SurfaceSwitcher.tsx:3`). In `App.tsx:112`, only `roll` gets a distinct render path — everything else falls through to the globe+sidebar branch. `sky` actually renders as the globe without a sidebar (the sidebar renders only when `surface === 'atlas'`). This is correct behaviour, but the intent is implicit; a future developer reading the code would not immediately understand that `sky` is "globe without sidebar".
- Files: `packages/desktop/src/App.tsx:112-158`, `packages/desktop/src/components/SurfaceSwitcher.tsx`
- Impact: Low — it works, but the code is subtly misleading. The `key="globe"` on the outer Box further conflates `sky` and `atlas`.
- Fix approach: Add a comment explaining the sky/atlas split, or restructure the conditional to be explicit: `surface === 'roll' ? ... : surface === 'sky' ? <GlobeOnly> : <GlobeWithSidebar>`.

## Known Bugs

**Whisper temp `.wav` file leaked on `ffmpeg` failure:**
- Symptoms: On any ffmpeg error (wrong path, unsupported codec, missing binary), the `.wav` conversion is aborted with `if (err) return` but the partially written `_whisper.wav` temp file is never deleted.
- Files: `packages/server/src/services/whisper.service.ts:50-53`
- Trigger: `ffmpeg` exits with non-zero code during audio conversion.
- Workaround: None. Manual cleanup of `_whisper.wav` files in the media directory is required.

**Offline queue blobs are silently dropped on page reload:**
- Symptoms: When a recording fails to upload (network offline), the audio `Blob` is kept in memory in `queueRef` but `saveQueue()` explicitly strips blobs before writing to `localStorage` (`packages/mobile/src/hooks/useOfflineQueue.ts:15`). On the next page load, the queue is restored from localStorage with the metadata intact but the blob is gone. The flush attempts to re-create the entry and then tries to find `item.blob` — which is `undefined` — so only the entry is created with no audio file attached.
- Files: `packages/mobile/src/hooks/useOfflineQueue.ts:14-15, 37-43`
- Trigger: Network goes offline during recording upload, user reloads the page before reconnecting.
- Workaround: None. The entry will exist in the DB without audio. The user has no indication the audio was lost.

## Security Considerations

**CORS set to wildcard `origin: '*'`:**
- Risk: Any website can make authenticated cross-origin requests to the Memoir server.
- Files: `packages/server/src/main.ts:23`
- Current mitigation: The app is local-only and accessed over Tailscale, so there is no external exposure in normal use. However, CSRF attacks from malicious browser tabs on the same machine can modify or delete entries.
- Recommendations: Restrict `origin` to `localhost` variants and the Tailscale hostname. Since this is a single-user local app, a specific allowlist is straightforward: `['http://localhost:3000', 'https://<TAILSCALE_HOST>:3000']`.

**Media file serving has no path sanitization:**
- Risk: `GET /api/media/:filename` passes the raw `:filename` param through `path.join(MEDIA_DIR, filename)` with no validation that the result stays within `MEDIA_DIR`. A filename like `../../memoir.db` would resolve outside the media directory.
- Files: `packages/server/src/media/media.controller.ts:36-38`, `packages/server/src/media/media.service.ts:42-44`
- Current mitigation: The server is local-only and single-user. No remote attacker can reach it except via Tailscale.
- Recommendations: Add `path.resolve()` + a prefix check: `if (!resolved.startsWith(MEDIA_DIR)) throw new NotFoundException()`. This is a one-line fix with zero risk.

**Mapbox token exposed to any browser tab via `/config.js`:**
- Risk: The Mapbox token is injected into a publicly accessible JavaScript file served by the app. Any script running in a browser tab that can reach the server can read the token.
- Files: `packages/server/src/main.ts:27-29`
- Current mitigation: Local-only exposure; no external attacker. Mapbox tokens can also be scoped to specific URLs/origins in the Mapbox dashboard.
- Recommendations: Scope the Mapbox token to the Tailscale hostname in the Mapbox dashboard. Low priority for a local-only app.

**No authentication on any API endpoint:**
- Risk: Any process or browser tab that can reach `http://localhost:3000` can read, create, update, or delete all entries and upload arbitrary files.
- Files: All controllers under `packages/server/src/`
- Current mitigation: Local-only server; network exposure is intentionally controlled via Tailscale.
- Recommendations: This is an acceptable trade-off for the single-user local-first design. Document it explicitly. If Tailscale exposure expands (e.g. shared with a household member), a simple shared secret header check would suffice.

## Performance Bottlenecks

**Full entry list loaded into desktop memory (limit 1000):**
- Problem: `App.tsx:27` fetches up to 1000 entries on every load, filter change, and WebSocket reconnect. All 1000 entries are held in React state and re-rendered in the Sidebar and passed to MapCanvas.
- Files: `packages/desktop/src/App.tsx:26-29`, `packages/desktop/src/components/Sidebar.tsx`
- Cause: No pagination or virtualisation in the Sidebar list. The globe handles scale reasonably (GeoJSON setData is efficient), but the Sidebar renders all entries in a ScrollArea.
- Improvement path: Add virtual scrolling to `Sidebar` (e.g. `@tanstack/virtual`). For the globe, the 1000-entry limit is fine. For search, move to a server-side endpoint.

**Bulk tag operation is O(n) individual queries:**
- Problem: `entries.service.ts:150-163` iterates each ID individually: SELECT tags, merge, UPDATE, broadcast. For a bulk tag of 100 entries, this issues 200 DB statements plus 100 WS broadcasts.
- Files: `packages/server/src/entries/entries.service.ts:150-163`
- Cause: Tags are stored as JSON strings, making a single SQL UPDATE across multiple rows impossible without per-row JSON parsing.
- Improvement path: Accept the current approach until collections are large (it is still sub-second for hundreds of entries on SQLite). Alternatively, batch the WS broadcast to a single `entry:bulk-updated` event instead of n individual `entry:updated` events.

**Embedding backfill runs at startup sequentially with 50ms delays:**
- Problem: `embedding.service.ts:52-65` iterates all un-embedded entries sequentially with a 50ms sleep between each Ollama call. On a fresh import of 1000+ entries this blocks the embedding queue for 50+ seconds of sleep alone (plus Ollama inference time).
- Files: `packages/server/src/services/embedding.service.ts:52-65`
- Cause: The delay is intentional to avoid hammering Ollama, but it compounds on large datasets.
- Improvement path: Acceptable for current usage. If archive grows to 10k+ entries, consider batching the Ollama API calls (if the model supports it) or running backfill as a separate offline script.

## Fragile Areas

**Whisper transcription pipeline (fire-and-forget with no error visibility):**
- Files: `packages/server/src/services/whisper.service.ts`
- Why fragile: The entire pipeline — ffmpeg conversion, Whisper inference, file I/O — runs inside nested `execFile` callbacks with no structured error handling. The only error check is `if (err) return` after ffmpeg. Whisper's callback ignores its error argument entirely. If Whisper writes no `.txt` file (e.g. empty audio, model mismatch), it silently does nothing. There is no retry, no dead-letter, no user notification.
- Safe modification: Always check the `err` argument in the Whisper `execFile` callback. Log errors via `this.log.warn(...)`. Clean up the `wavPath` in an `else` branch on ffmpeg failure.
- Test coverage: Zero. No unit or integration tests for `WhisperService`.

**`_whisper.wav` naming could collide under concurrent transcriptions:**
- Files: `packages/server/src/services/whisper.service.ts:48`
- Why fragile: The temp WAV path is derived by replacing the source file extension with `_whisper.wav`. If two different audio entries share the same base filename (unlikely with UUID filenames, but possible in theory), or if a backfill and a live upload try to transcribe the same file simultaneously, the second process will clobber the first's temp file.
- Safe modification: Use a unique temp path per transcription: `absPath.replace(/\.[^.]+$/, `_whisper_${Date.now()}.wav`)`.
- Test coverage: None.

**`LocationStore` is in-memory with no persistence:**
- Files: `packages/server/src/services/location-store.service.ts`
- Why fragile: The heartbeat store is a plain `Map` on the `LocationStore` singleton. On server restart, all recent location heartbeats are lost. The Last.fm importer falls back to querying entry history (`nearestLocation`), but if the server was just restarted and no new heartbeats have arrived yet, location inference for scrobbles may degrade.
- Safe modification: This is acceptable for short downtimes. If the server is frequently restarted (dev workflow), the 30-min `nearestLocation` window covers most gaps.
- Test coverage: None.

**Syncthing ingest relies on a 2-second fixed delay for file write completion:**
- Files: `packages/server/src/services/syncthing.service.ts:28`
- Why fragile: `setTimeout(() => this.ingest(full, filename), 2000)` assumes Syncthing finishes writing within 2 seconds. Large image files (e.g. RAW or high-res HEIC) may still be partially written. The `existsSync` check in `ingest` only confirms the file exists, not that it is fully written.
- Safe modification: After the timeout, compare file size against a second stat call 500ms later to confirm the file is no longer growing, or use `fs.open()` in exclusive mode to detect active writes.
- Test coverage: None.

## Scaling Limits

**SQLite single-file DB:**
- Current capacity: SQLite handles millions of rows and hundreds of GBs fine for single-writer workloads.
- Limit: WAL mode is enabled, so concurrent reads and one writer are safe. The concern is the blob store: `embedding` columns are stored as raw BLOB inside the SQLite file. At 768 floats × 4 bytes = ~3KB per entry, 100k entries = ~300MB of embeddings inline in the DB file.
- Scaling path: Per the architectural identity, SQLite stays. If embedding size becomes a concern, move embeddings to a sidecar file or use `sqlite-vec` for native vector storage instead of raw BLOB.

**`findAll` default limit of 200 vs App.tsx requesting 1000:**
- Current capacity: Server default is `limit = 200` in `entries.service.ts:34`, but the desktop overrides to `limit: 1000`.
- Limit: No server-enforced ceiling. A caller can request an unbounded result by passing a large limit. The `findAll` method performs no server-side cap.
- Scaling path: Add a `MAX_LIMIT = 500` server-side cap and enforce pagination. The desktop should implement cursor-based loading rather than a one-shot bulk fetch.

## Dependencies at Risk

**`node-fetch` v2 (CommonJS) in a TypeScript server:**
- Risk: `node-fetch` v2 is the last CommonJS-compatible version. v3+ is ESM-only and would require significant import refactoring. Meanwhile, Node.js 18+ ships a native `fetch` global. The dependency is present but increasingly unnecessary.
- Impact: `packages/server/src/services/geocoder.service.ts`, `packages/server/src/services/weather.service.ts`, `packages/server/src/services/embedding.service.ts`, `packages/server/src/services/lastfm.service.ts` — four separate services.
- Migration plan: Replace all `node-fetch` imports with the native `fetch` global (available in Node 18+). This removes the dependency entirely and eliminates the v2/v3 split concern.

## Missing Critical Features

**No server-side full-text search:**
- Problem: Embeddings are stored but there is no `GET /api/entries/search` endpoint. The only text search is the client-side Mantine Spotlight filter on `label`/`description` fields, capped at 200 entries.
- Blocks: Semantic search across the archive; any future AI-assisted recall feature; effective navigation once the archive exceeds a few hundred entries.

**No media file cleanup on entry deletion:**
- Problem: `EntriesService.remove()` (line 95-98) and `EntriesService.bulk()` (lines 145-148) delete DB rows but make no attempt to delete the associated `media_path` or `media_thumb` files from disk.
- Files: `packages/server/src/entries/entries.service.ts:95-98, 145-148`
- Blocks: The media directory will grow indefinitely as entries are deleted. There is no garbage-collection mechanism.

**No mini-map in the Moment detail view:**
- Problem: `EntryDetail.tsx:212-224` has an explicit `{/* Cartographic placeholder — Mapbox mini-map would go here in a later pass */}` comment. The `MomentView` renders coordinate text and "map view · phase f" label where a map should appear.
- Files: `packages/desktop/src/components/EntryDetail.tsx:212-224`
- Blocks: Moment entries with coordinates show raw lat/lng numbers instead of a navigable map context.

## Test Coverage Gaps

**WhisperService — completely untested:**
- What's not tested: Backfill query, ffmpeg invocation, transcript write-back, error handling, temp file cleanup.
- Files: `packages/server/src/services/whisper.service.ts`
- Risk: Transcription failures are silent; refactoring the service could break it with no test signal.
- Priority: High

**EmbeddingService — completely untested:**
- What's not tested: Backfill, `embedOne` logic, text concatenation, BLOB serialisation, Ollama error paths.
- Files: `packages/server/src/services/embedding.service.ts`
- Risk: Embedding format bugs (e.g. wrong Float32Array byte order) would silently corrupt the BLOB column.
- Priority: Medium

**LastfmService — completely untested:**
- What's not tested: Scrobble deduplication, now-playing poll, location inference, pagination (limit 50), API error handling.
- Files: `packages/server/src/services/lastfm.service.ts`
- Risk: Duplicate scrobble imports or dropped tracks would be hard to detect without test coverage.
- Priority: Medium

**SyncthingService — completely untested:**
- What's not tested: EXIF parsing, GPS extraction, deduplication via `external_id`, file-write race condition handling.
- Files: `packages/server/src/services/syncthing.service.ts`
- Risk: EXIF library changes or unexpected file events could silently create malformed entries.
- Priority: Medium

**Mobile offline queue — completely untested:**
- What's not tested: Enqueue/flush cycle, blob loss on reload, retry on failure, deduplication on re-flush.
- Files: `packages/mobile/src/hooks/useOfflineQueue.ts`
- Risk: The known blob-loss bug (see Known Bugs) would remain undetected through test regression.
- Priority: High

**`EntriesService` business logic — no unit tests:**
- What's not tested: `findSessions` clustering algorithm (haversine distance, time gap), `bulk` tag merge logic, `parse` row deserialization.
- Files: `packages/server/src/entries/entries.service.ts`
- Risk: The session clustering parameters (10 min / 50 m) were recently added; changes to the algorithm have no test net.
- Priority: Medium

---

*Concerns audit: 2026-05-24*
