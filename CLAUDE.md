# CLAUDE.md

Read this first. It's the bootloader for any Claude session in this repo.

## What Memoir is

A **local-first personal sensory archive**. The owner (single user, always) captures small moments throughout the day on mobile — audio, photos, location-tagged moments, music context, text notes — and explores the archive on desktop as a spatial-temporal map. The point is the *texture of life*: not a curated highlight reel, not a productivity tool, not a journaling app.

**Architectural identity (load-bearing — do not propose changes to these):**

- **Local-first, single-user.** No accounts. No sharing. No cloud sync. Data lives on the owner's machine. Never propose social features, multi-tenant patterns, or anything that violates this.
- **Memoir is the context layer, not Google Photos.** Native camera + Google Photos remain primary for photo storage. Memoir wraps them with location + weather + music + transcript + the owner's reflection. Don't propose features that compete with Photos head-on.
- **Ambient is the goal, but earned.** Phase 2 adds server-side ambient signals (Last.fm music polling, Syncthing photo ingest). Native app shell deferred until ambient capture proves itself worth the privacy/complexity tax.
- **The data outlives the app.** Choose tools/formats that will still be readable in 10 years. SQLite + filesystem hit that bar. Stay there.

## Tech stack

- **Monorepo:** pnpm workspaces, 4 packages under `packages/`
- **Contract:** ts-rest + Zod (`@memoir/contract`) — shared API definition
- **Server:** NestJS 10 + better-sqlite3, ts-node in dev
- **Desktop:** React 18 + Mantine 7 + Mapbox GL v3 (Three.js retiring per Phase B)
- **Mobile:** React 18 PWA (Mantine)
- **Tooling:** Vite, Vitest, Playwright, tsx

## The verify loop (most important operational thing)

**Before claiming any change is done, from repo root:**

```bash
pnpm verify   # ~30-40s: typecheck + vitest + playwright
```

This runs:
1. `pnpm typecheck` — tsc across contract, server, desktop, mobile
2. `pnpm test` — vitest unit tests (currently: migration runner contract)
3. `pnpm e2e` — Playwright API smoke + desktop screenshot capture

Failure = iterate without bothering the user.
Pass = present to user with screenshots from `tests/screenshots/`.

Tests boot the server against an ephemeral DB at `tests/.tmp/` via `MEMOIR_DATA_DIR`. The dev DB is never touched.

For visual changes: after verify, `Read` the latest screenshot(s) and compare against the relevant slide in [docs/design/proposal.html](docs/design/proposal.html). Iterate visually before presenting.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full conventions.

## Doc map

| File | Status | Purpose |
|---|---|---|
| [CLAUDE.md](CLAUDE.md) | committed | This file — session bootloader |
| [CONTRIBUTING.md](CONTRIBUTING.md) | committed | Verify loop, test conventions, branch model |
| [README.md](README.md) | committed | Setup / running |
| [docs/design-brief.md](docs/design-brief.md) | committed | What we asked the designer |
| [docs/design/proposal.html](docs/design/proposal.html) | committed | What the designer returned (the 13-slide spec) |
| [docs/design/chats/chat1.md](docs/design/chats/chat1.md) | committed | Full back-and-forth with the designer |
| [packages/server/src/db/README.md](packages/server/src/db/README.md) | committed | Migration conventions |
| `docs/roadmap.md` | **gitignored** | Multi-phase plan |
| `docs/implementation-plan.md` | **gitignored** | Phase 1.5 sequenced work |
| `STATUS.md` | **gitignored** | Current phase + last milestone + next task |
| `.env` | gitignored | Real Mapbox token + Tailscale cert paths |

## Doc convention: committed vs. gitignored

- **Reference artifacts** (design brief, design proposal, contributing guide, DB README, README): committed. They're stable, shareable, hand-off-able.
- **Working planning docs** (roadmap, implementation plan, STATUS): gitignored. They churn every session. The user explicitly chose this split to keep git history clean.

Don't commit working docs. Don't gitignore reference artifacts. If unsure, ask.

## Branch / commit conventions

- Default branch: `develop`
- Atomic commits, short conventional-commit messages (`feat:`, `fix:`, `chore:`, `docs:`, `test:`)
- The user wants varying co-author attribution across commits — see `~/.claude/.../memory/feedback_co_author.md`. Trailer when included names the *actual running model* (not a hardcoded default). Roughly 20–65% of commits in a session get the trailer; lean toward including it on substantive Claude work, omit on mechanical/user-directed work.
- Run `pnpm verify` before each commit.

## Architectural anti-patterns (do NOT propose for this project)

The user has explicitly rejected each of these. They're listed in `~/.claude/.../memory/project_memoir_db_pattern.md` and worth repeating here so a fresh session can't accidentally suggest one:

- ❌ Postgres migration — never, no driver for it in this lifecycle
- ❌ ORM (Prisma/TypeORM/Drizzle) — raw SQL is honest, ORMs fight schema evolution
- ❌ Migration frameworks (Knex etc.) — overkill; we hand-roll in `migrations.ts`
- ❌ Separate vector DB (Pinecone/Chroma/Qdrant) — `sqlite-vec` handles it inside the same file
- ❌ Search service (Elastic/Meilisearch) — SQLite FTS5 is enough
- ❌ Message queue (BullMQ/Redis/SQS) — in-process `setImmediate` workers are fine
- ❌ Microservices — one process, one DB file, one media dir, forever
- ❌ Schema normalization for aesthetic reasons — only normalize when a real query hurts
- ❌ Native app shell *yet* — deferred until ambient capture proves itself

## Decision style (when there's a fork in the road)

Lay out the trade-offs first (table or short bullets per option). Then use `AskUserQuestion` to converge, with "Not sure — recommend something" as one of the options. When the user picks "recommend" or the question has a best answer, name something *concrete* — model, dollar cost, time estimate, specific library version. Vague advice gets rejected.

Bias recommendations toward: existing tech they already run, deferred spending, smaller code commitments, things that don't force them down a one-way door.

See `~/.claude/.../memory/feedback_decision_style.md`.

## Quick map of the codebase

```
packages/
  contract/   ts-rest + Zod (the single API truth)
  server/     NestJS server
    src/db/migrations.ts     ← add new schema here
    src/db/db.service.ts     ← migration runner + DbService
    src/entries/             ← CRUD + create-with-async-pipelines
    src/media/               ← file upload + serving (MediaStore abstraction TODO)
    src/services/            ← geocoder, weather, whisper
    src/events/              ← WS gateway for broadcast
    src/main.ts              ← bootstrap, HTTPS detection, /config.js
  desktop/    React + Mantine + Mapbox
    src/api/client.ts        ← ts-rest client + WS factory
    src/globe/MapCanvas.tsx  ← Mapbox v3 globe (Three.js retired Phase B)
    src/components/          ← Sidebar, EntryDetail, ChromeFader
  mobile/     React PWA
    src/components/          ← CaptureBar, AudioRecorder
    src/hooks/useOfflineQueue.ts

scripts/seed.ts              ← pnpm seed (populate dev DB)
tests/e2e/                   ← Playwright (API smoke + desktop screenshots)
tests/screenshots/           ← gitignored, visual self-inspection
```

## Open questions in current Phase 1.5

See `docs/implementation-plan.md` for full context. Known open calls Claude should *not* unilaterally decide:

1. Music card fallback content on Moment detail (no album art case) — recommendation: italic-serif text-only until Phase 2 Last.fm
2. ⌘K query language v0 — recommendation: free text + hardcoded actions; natural language is Phase 5

Resolved: Three.js retired (Phase B done). Photo session clustering shipped at 10 min / 50 m (Phase D done).

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Memoir**

A local-first personal sensory archive for a single owner. Moments are captured throughout the day on mobile — audio recordings, photos, location-tagged entries, music context, text notes — and explored on desktop as a spatial-temporal atlas. Memoir wraps native camera + Google Photos with location, weather, music, transcription, and personal reflection. The point is the texture of life: not a curated highlight reel, not a productivity tool, not a journal.

**Core Value:** The archive should feel alive and navigable — every captured moment situated in time and place, queryable without an internet connection or account, accumulating meaning over years.

### Constraints

- **Tech stack:** pnpm monorepo, NestJS 10 + better-sqlite3, React 18 + Mantine 7 + Mapbox GL v3, React 18 PWA. No new runtimes.
- **Single user:** no auth, no accounts, no multi-tenancy — ever.
- **Local inference:** all AI (Whisper, Ollama embeddings, future LLM) runs locally. No data leaves the machine.
- **Data longevity:** SQLite + filesystem. Formats readable in 10 years without Memoir installed.
- **No external services for core features:** internet is optional (OSM tile cache deferred).
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5.4 - All packages (contract, server, desktop, mobile)
- SQL (raw) - SQLite migrations hand-rolled in `packages/server/src/db/migrations.ts`
## Runtime
- Node.js 20+ (required per `README.md`)
- pnpm (workspaces)
- Lockfile: `pnpm-lock.yaml` — present and committed
## Monorepo
- `packages/contract/` — `@memoir/contract` — shared API contract (ts-rest + Zod)
- `packages/server/` — `@memoir/server` — NestJS API + SQLite + ambient services
- `packages/desktop/` — `@memoir/desktop` — React globe/map browser (desktop)
- `packages/mobile/` — `@memoir/mobile` — React PWA capture surface (mobile)
## Frameworks
- ts-rest 3.51 (`@ts-rest/core`, `@ts-rest/nest`) — single source of truth for all API routes and shapes
- Zod 3.23 — schema validation, used in contract + shared with clients
- NestJS 10 (`@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, `@nestjs/platform-ws`, `@nestjs/websockets`, `@nestjs/serve-static`) — DI framework, HTTP + WebSocket
- Express (via `@nestjs/platform-express`) — underlying HTTP adapter
- better-sqlite3 11 — synchronous SQLite driver; `DbService` extends it directly (`packages/server/src/db/db.service.ts`)
- ws 8.18 — WebSocket server adapter (`packages/server/src/events/events.gateway.ts`)
- multer 2 — multipart file upload (`packages/server/src/media/`)
- sharp 0.33 — image thumbnail generation (`packages/server/src/media/media.service.ts`)
- exifr 7.1 — EXIF GPS/timestamp parsing from photos (`packages/server/src/services/syncthing.service.ts`)
- node-fetch 2.7 — HTTP client used by geocoder, weather, Last.fm, embedding services
- React 18.3 + React DOM — UI rendering
- Mantine 7.11 (`@mantine/core`, `@mantine/hooks`, `@mantine/spotlight`) — component library
- Mapbox GL v3 (`mapbox-gl` 3.23) — globe and map rendering (`packages/desktop/src/globe/MapCanvas.tsx`)
- @emotion/react 11 — CSS-in-JS (Mantine peer dependency)
- React 18.3 + React DOM — UI rendering
- Mantine 7.11 — component library (same version as desktop)
- @emotion/react 11 — CSS-in-JS
- Vite 5.3 + `@vitejs/plugin-react` — desktop and mobile bundler/dev server
- ts-node 10.9 + tsconfig-paths 4.2 — server dev runner (`ts-node -r tsconfig-paths/register src/main.ts`)
- tsx 4.22 — script runner for `scripts/seed.ts`, `scripts/takeout-import.ts`
- TypeScript 5.4 — all packages; strict mode enabled (`tsconfig.base.json`)
- Vitest 2.1 + `@vitest/coverage-v8` — unit tests in `@memoir/server` (`packages/server/src/`)
- Playwright 1.60 (`@playwright/test`) — E2E API smoke + desktop screenshot tests (`tests/e2e/`)
## Key Dependencies
- `better-sqlite3` 11 — sole persistence layer; synchronous, no ORM. Never replace with Postgres/ORM (per architectural constraints).
- `mapbox-gl` 3.23 — requires a `MAPBOX_TOKEN` env var, injected at runtime via `/config.js` endpoint
- `@ts-rest/core` + `@ts-rest/nest` — type-safe contract binding between all packages; changing this breaks every client simultaneously
- `dotenv` 16.4 — loaded explicitly in `packages/server/src/main.ts` at bootstrap
- `reflect-metadata` 0.2 — NestJS DI requirement, imported first in `main.ts`
- `rxjs` 7.8 — NestJS peer dependency
- ffmpeg — audio conversion pipeline for Whisper transcription (invoked via `execFile`)
- whisper-cpp (`whisper-cli`) — local speech-to-text binary (`packages/server/src/services/whisper.service.ts`)
- Ollama — local embedding service, default `http://localhost:11434` (`packages/server/src/services/embedding.service.ts`)
- Tailscale — optional TLS layer for HTTPS on LAN (enables GPS/mic on mobile)
- Syncthing — optional file sync for photo ingest
## Configuration
- Loaded from `.env` at repo root via `dotenv.config()` in `packages/server/src/main.ts`
- Key vars:
- `tsconfig.base.json` — shared TS config (strict, esModuleInterop, resolveJsonModule)
- `packages/server/tsconfig.build.json` — server production build
- `packages/server/tsconfig.typecheck.json` — server typecheck (no emit)
- `packages/desktop/vite.config.ts` — Vite with API/WS proxy to server
- `packages/mobile/vite.config.ts` — Vite for PWA
## Platform Requirements
- Node 20+
- pnpm
- ffmpeg (for audio → Whisper conversion)
- whisper-cpp binary (optional, for transcription)
- Mapbox token (required for globe)
- Ollama (optional, for embeddings)
- Single-machine deployment (local-first, no cloud)
- HTTP or HTTPS (Tailscale certs) on port 3000
- SQLite file at `$MEMOIR_DATA_DIR/memoir.db`
- Media files at `$MEMOIR_DATA_DIR/media/`
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- React components: PascalCase matching the exported component name — `Sidebar.tsx`, `EntryDetail.tsx`, `AudioRecorder.tsx`
- Hooks: camelCase prefixed with `use` — `useOfflineQueue.ts`, `useIdleFade.ts`, `useGPS.ts`
- NestJS services: PascalCase with `.service.ts` suffix — `entries.service.ts`, `geocoder.service.ts`, `embedding.service.ts`
- NestJS controllers: PascalCase with `.controller.ts` suffix — `entries.controller.ts`
- NestJS modules: PascalCase with `.module.ts` suffix — `entries.module.ts`, `db.module.ts`
- Domain constants in UPPER_SNAKE_CASE at module scope — `SESSION_GAP_MS`, `SESSION_GAP_M`, `QUEUE_KEY`
- Interface names: PascalCase — `Migration`, `LfmTrack`, `PhotoRow`, `QueueItem`
- React component functions: PascalCase — `App`, `Sidebar`, `EntryTile`, `DayGroup`
- Internal/helper functions within a file: PascalCase for sub-components, camelCase for pure utilities — `formatTime`, `formatDuration`, `haversineM`, `downsample`, `groupByDay`
- NestJS service methods: camelCase — `findAll`, `findOne`, `create`, `update`, `remove`, `embedAsync`, `transcribeAsync`
- Private class methods prefixed with nothing — TypeScript `private` modifier is used instead
- camelCase throughout — `queueRef`, `tmpDir`, `dbPath`, `place_name` (exception: SQL column names use snake_case and bleed into TypeScript as-is from the contract)
- Contract/schema fields: snake_case to match SQLite column names — `created_at`, `media_path`, `music_title`
- Zod schemas: PascalCase with `Schema` suffix — `EntrySchema`, `CreateEntrySchema`, `UpdateEntrySchema`, `PhotoSessionSchema`
- TypeScript types inferred from Zod with `z.infer<>` and matching name without suffix — `Entry`, `PhotoSession`
- `as const` used for narrow enum-like arrays — `FILTERS = ['all', 'audio', ...] as const`
## Code Style
- No Prettier or ESLint config detected — formatting is manual/editor-level
- Indentation: 2 spaces throughout
- Single quotes for strings in TypeScript/TSX
- Semicolons at end of statements
- Trailing commas in multi-line arrays and objects
- Short lines preferred but not rigidly enforced; long SQL strings are kept inline
- No ESLint config detected — TypeScript's `tsc --noEmit` is the primary static check
- `pnpm typecheck` runs `tsc` across all four packages as the lint gate
## Import Organization
- `@memoir/contract` resolves to `packages/contract/src/index.ts` via both pnpm workspaces and a vitest `resolve.alias`
- No `@/` or `~/` aliases in the frontend packages — relative imports are used directly
## Error Handling
- External HTTP calls (geocoder, weather, Last.fm, Ollama) always wrap in `try/catch` and return `null` on failure — never throw to the caller
- `catch {}` with empty block is acceptable for non-critical failures (WS message parse, EXIF parse logged with `.warn`)
- NestJS controller methods return typed `{ status, body }` objects — `404` is returned as a value, not via `HttpException`
- Offline queue in mobile: on network failure the item is re-queued silently, no user-visible error
- Migration runner: failures propagate (no catch) — a bad migration should crash startup
- `setImmediate` fire-and-forget pattern for background work (`embedAsync`, `transcribeAsync`, `backfill`) — errors are swallowed in the background task, logged at most
## Logging
- Each NestJS service that does I/O creates `private readonly log = new Logger(ServiceName.name)`
- `this.log.log(...)` for informational startup/progress messages
- `this.log.warn(...)` for non-fatal failures (EXIF parse, Last.fm poll failure)
- `console.log` used only in `main.ts` bootstrap for server URL output
- No structured logging library — plain string messages
- Silent catch blocks (`catch { return null; }`) used in geocoder, weather, embedding generate — no log on routine network failure
## Comments
- Block comments (`/** ... */`) at top of test files to describe the contract being tested
- Inline comments on non-obvious constants: `// 10 minutes`, `// 50 metres`
- Section dividers in large files using `// ── Name ────` (used in `EntryDetail.tsx`)
- Comments on deferred work: `// Cartographic placeholder — Mapbox mini-map would go here in a later pass`
- JSX comments with `{/* ... */}` for UI section labels (Brand header, WS status dot, etc.)
- Not used — no JSDoc annotations on exported functions or types
- Interface fields are self-documenting by name; no field-level docs
## Function Design
- NestJS services receive DTOs typed from Zod schemas: `dto: z.infer<typeof CreateEntrySchema>`
- React components receive typed `Props` interfaces defined inline above the component
- Utility functions accept primitives — no config object pattern for small helpers
- Service methods return `Entry | null` for nullable lookups — never throw for not-found
- Controllers return `{ status: N as const, body: ... }` objects — the `as const` assertion is required by ts-rest
- Background async methods (`embedAsync`, `transcribeAsync`) return `void` — callers never await them
- Boolean predicates: `existsByExternalId` returns `boolean` via `!!` cast on the SQLite result
## Module Design
- `packages/contract/src/index.ts` exports everything at the top level — all schemas, types, and the contract object
- NestJS modules use standard `@Module({ imports, controllers, providers, exports })` pattern
- React files export one named component per file — no default exports in components
- Hook files export one named hook per file
- `packages/contract/src/index.ts` acts as the single barrel for the contract package — all types/schemas exported from here
- No barrel `index.ts` files within `packages/server/src/` subdirectories — each module is imported by path
## SQL Conventions
- Raw SQL strings — no ORM, no query builder
- `this.db.prepare(sql).all(...params)` for multi-row queries
- `this.db.prepare(sql).get(id)` for single-row lookup, returns `null` if not found
- `this.db.prepare(sql).run(...params)` for writes
- Parameterized queries with `?` placeholders always — no string interpolation of user data
- Column names in SQL: snake_case
- `JSON.stringify` / `JSON.parse` for array columns (`tags`, `waveform`, `weather`) — stored as TEXT in SQLite, deserialized in `parse()` private method of `EntriesService`
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## System Overview
```text
```
## Component Responsibilities
| Component | Responsibility | File |
|-----------|----------------|------|
| `AppModule` | Root NestJS module; wires all feature modules, serves static frontend builds, registers ambient providers | `packages/server/src/app.module.ts` |
| `DbModule` | Global singleton `DbService`; runs migrations on startup | `packages/server/src/db/db.module.ts` |
| `DbService` | Extends `better-sqlite3 Database`; applies migrations, exposes raw SQL interface | `packages/server/src/db/db.service.ts` |
| `migrations` | Versioned DDL array; single source of truth for schema | `packages/server/src/db/migrations.ts` |
| `EntriesModule` | CRUD for all entry types; photo-session clustering; bulk ops | `packages/server/src/entries/` |
| `EntriesService` | Queries, creates (with geocode + weather + embedding pipelines), updates, removes entries | `packages/server/src/entries/entries.service.ts` |
| `EntriesController` | ts-rest-bound HTTP handlers; delegates entirely to `EntriesService` | `packages/server/src/entries/entries.controller.ts` |
| `MediaModule` | File upload via Multer, thumbnail generation via sharp, file serving | `packages/server/src/media/` |
| `MediaService` | Processes uploads, writes thumbnails, triggers Whisper transcription | `packages/server/src/media/media.service.ts` |
| `EventsGateway` | WebSocket server at `/ws`; `broadcast(type, payload)` fan-out to all connected clients | `packages/server/src/events/events.gateway.ts` |
| `LocationModule` | Stateless location heartbeat endpoint; stores beats in memory | `packages/server/src/location/` |
| `LocationStore` | In-memory `Map<deviceId, Beat>`; provides nearest-beat lookup for importers | `packages/server/src/services/location-store.service.ts` |
| `GeocoderService` | Reverse geocodes lat/lng via Nominatim (OSM); returns place name string | `packages/server/src/services/geocoder.service.ts` |
| `WeatherService` | Fetches daily weather for a lat/lng/date from Open-Meteo; returns JSON string | `packages/server/src/services/weather.service.ts` |
| `WhisperService` | CLI wrapper around whisper.cpp; backfills + transcribes new audio via ffmpeg + execFile | `packages/server/src/services/whisper.service.ts` |
| `EmbeddingService` | Calls local Ollama (`nomic-embed-text`); stores Float32 blob in `entries.embedding`; backfills on boot | `packages/server/src/services/embedding.service.ts` |
| `LastfmService` | Polls Last.fm every 10 min; imports finished scrobbles as `moment` entries; broadcasts now-playing every 30s | `packages/server/src/services/lastfm.service.ts` |
| `SyncthingService` | Watches `SYNCTHING_MEDIA_DIR` via `fs.watch`; ingests arriving images with EXIF parsing | `packages/server/src/services/syncthing.service.ts` |
| `MusicController` | Single ts-rest endpoint exposing `LastfmService.nowPlaying` | `packages/server/src/music/music.controller.ts` |
| `contract` | ts-rest router with Zod schemas for all routes, request bodies, and responses | `packages/contract/src/index.ts` |
| Desktop `App` | Orchestrates globe/roll surface state, WebSocket subscription, entry selection, bulk ops | `packages/desktop/src/App.tsx` |
| `MapCanvas` | Mapbox GL v3 globe; plots entries as colored dots; live-arrival pulse animation; auto-rotates at low zoom | `packages/desktop/src/globe/MapCanvas.tsx` |
| `RollSurface` | Chronological photo roll grouped by day; merges solo photos and session clusters | `packages/desktop/src/components/RollSurface.tsx` |
| `Sidebar` | Entry list grouped by day, filter controls, session tiles, multi-select; lives in atlas view only | `packages/desktop/src/components/Sidebar.tsx` |
| Mobile `App` | GPS acquisition, backend health, location heartbeat, capture + recent list | `packages/mobile/src/App.tsx` |
| `CaptureBar` | Moment/photo/music/note capture; delegates offline to `useOfflineQueue` | `packages/mobile/src/components/CaptureBar.tsx` |
| `useOfflineQueue` | localStorage queue; flushes on reconnect and `window:online`; handles blob upload after entry creation | `packages/mobile/src/hooks/useOfflineQueue.ts` |
| `useLocationHeartbeat` | Posts GPS position to `/api/location/heartbeat` every 60s while app is open | `packages/mobile/src/hooks/useLocationHeartbeat.ts` |
## Pattern Overview
- A single shared contract package (`@memoir/contract`) defines all HTTP routes and types via ts-rest + Zod. Both server and clients import from it — the contract is the only coupling point.
- The NestJS server is the sole process: it serves the compiled frontend SPA bundles at `/desktop` and `/mobile`, handles all API calls, and runs ambient polling loops internally via `setInterval`.
- Async enrichment (geocoding, weather, embedding, transcription) runs fire-and-forget after the entry creation response is already returned. Clients receive updates via WebSocket broadcast.
- All persistent state lives in one SQLite file plus a `media/` directory. No external databases, no queues, no caches.
## Layers
- Purpose: Shared API surface — routes, request/response types, entry schemas
- Location: `packages/contract/src/index.ts`
- Contains: ts-rest router, Zod schemas (`EntrySchema`, `CreateEntrySchema`, `UpdateEntrySchema`, `PhotoSessionSchema`), TypeScript inferred types
- Depends on: nothing in this repo
- Used by: server controllers (`@ts-rest/nest`), desktop client (`@ts-rest/core`), mobile client (`@ts-rest/core`)
- Purpose: Single-process backend: HTTP API, WebSocket events, file serving, ambient signals
- Location: `packages/server/src/`
- Contains: NestJS modules, controllers, services, migration runner
- Depends on: `@memoir/contract`, `better-sqlite3`, external HTTP APIs
- Used by: browser clients
- Purpose: Spatial-temporal archive explorer (globe + photo roll surfaces)
- Location: `packages/desktop/src/`
- Contains: React components, Mapbox canvas, ts-rest client, WebSocket factory
- Depends on: `@memoir/contract`, `mapboxgl`
- Used by: served from server at `/desktop`
- Purpose: Ambient capture PWA (audio, photo, moment, note)
- Location: `packages/mobile/src/`
- Contains: React components, capture logic, offline queue, GPS hooks
- Depends on: `@memoir/contract`
- Used by: served from server at `/mobile`
- Purpose: Durable storage — single SQLite file with WAL mode
- Location: `packages/server/data/memoir.db` (runtime), schema in `packages/server/src/db/migrations.ts`
- Contains: `entries` table with 20+ columns covering all entry types; `embedding` BLOB column for vector search
- Depends on: nothing
- Used by: `DbService` exclusively
## Data Flow
### Entry Creation (mobile capture → globe dot)
### Audio Upload → Transcription
### Ambient Last.fm Import
### Offline Capture (mobile with no connectivity)
- Desktop: plain React `useState` in `App.tsx` — entry array, session array, selected entry, surface, filter, now-playing. No external state manager.
- Mobile: plain React `useState` in `App.tsx` — recent entries, recording mode flag. Offline queue in `useRef` backed by `localStorage`.
- Server: stateless per-request except `LocationStore` (in-memory Map of GPS beats) and `LastfmService.nowPlaying` (in-memory scalar).
## Key Abstractions
- Purpose: Universal atom — every captured moment (audio, photo, note, moment) is an `Entry` row
- Examples: `packages/contract/src/index.ts` (schema), `packages/server/src/db/migrations.ts` (DDL)
- Pattern: Flat denormalized row; `type` discriminates behavior; `source` tracks provenance (`native`, `lastfm`, `syncthing`)
- Purpose: Single typed API definition consumed by both server and client — eliminates hand-written fetch wrappers
- Examples: `packages/contract/src/index.ts`, `packages/server/src/entries/entries.controller.ts`, `packages/desktop/src/api/client.ts`
- Pattern: `contract.entries.list` referenced on both sides; responses typed end-to-end via Zod inference
- Purpose: Server-push for real-time state synchronization across clients
- Examples: called in `EntriesService.create/update/remove`, `LastfmService.pollNowPlaying`
- Pattern: `broadcast(type: string, payload: unknown)` sends JSON `{ type, payload }` to all WebSocket clients
- Purpose: Sequential, version-controlled schema evolution without a framework
- Examples: `packages/server/src/db/migrations.ts`
- Pattern: `{ version: number; name: string; sql: string }[]`, applied in transaction, version tracked via `PRAGMA user_version`
- Purpose: Background data enrichment running inside the server process; no external workers or queues
- Examples: `LastfmService`, `SyncthingService`, `WhisperService`, `EmbeddingService`
- Pattern: `OnApplicationBootstrap` lifecycle hook + `setInterval` / `setImmediate` / `fs.watch`
## Entry Points
- Location: `packages/server/src/main.ts`
- Triggers: `pnpm dev` in server package, or `node dist/main.js` in production
- Responsibilities: Reads `.env`, detects Tailscale TLS certs, creates NestJS app with WsAdapter, registers `/config.js` runtime config endpoint, listens on `0.0.0.0:3000`, optionally creates HTTP→HTTPS redirect on port 3001
- Location: `packages/desktop/src/main.tsx`
- Triggers: Served at `/desktop` by NestJS `ServeStaticModule`
- Responsibilities: Mounts `<App>` with Mantine `MantineProvider`
- Location: `packages/mobile/src/main.tsx`
- Triggers: Served at `/mobile` by NestJS `ServeStaticModule`
- Responsibilities: Mounts `<App>` with Mantine `MantineProvider`
- Location: `packages/contract/src/index.ts`
- Triggers: imported directly by server, desktop, and mobile packages
- Responsibilities: Exports `contract`, all Zod schemas, all TypeScript types
## Architectural Constraints
- **Threading:** Single-threaded Node.js event loop. All ambient services (`setInterval`, `fs.watch`, `setImmediate`) share one thread. No worker threads are used. Long Whisper transcriptions shell out via `execFile` (does not block event loop).
- **Global state:** `LocationStore` is a module-level singleton (`Map<string, Beat>`) — lives in server process memory only, lost on restart. `LastfmService.nowPlaying` is an instance property used as in-memory cache between polls.
- **SQLite sync API:** `DbService` extends `Database` (better-sqlite3) — all DB reads and writes are synchronous. This is intentional and correct for the single-writer use case, but means DB calls block the event loop briefly.
- **No circular imports:** Contract package has no imports from server or clients. Server imports contract only. Clients import contract only.
- **Data dir:** Controlled entirely by `MEMOIR_DATA_DIR` env var; defaults to `packages/server/data/`. Tests use `tests/.tmp/` via `MEMOIR_DATA_DIR` to avoid touching dev data.
- **Frontend served by backend:** Desktop and mobile builds are served as static assets from the same NestJS server at `/desktop` and `/mobile`. No separate CDN or dev proxy in production.
## Anti-Patterns
### Calling EntriesService from MediaService directly for transcription
### `as any` casts in importer services
## Error Handling
- Geocoder, weather, Last.fm poll: `try/catch` returning `null` — entry is created without the enrichment rather than failing creation.
- Whisper/embedding: fire-and-forget `execFile`/`fetch` with no propagation — failure means entry simply has no transcript/embedding.
- Media upload: errors in sharp thumbnail generation are caught and logged; upload still succeeds.
- WebSocket client: auto-reconnects after 3s on `onclose`; re-fetches all entries on reconnect to recover missed events.
- Offline mobile capture: `useOfflineQueue` catches any network error and queues to `localStorage`.
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
