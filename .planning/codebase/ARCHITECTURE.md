<!-- refreshed: 2026-05-24 -->
# Architecture

**Analysis Date:** 2026-05-24

## System Overview

```text
┌──────────────────────────────────────────────────────────────────┐
│                        Clients (Browsers)                        │
├────────────────────────────┬─────────────────────────────────────┤
│   Desktop (React + Mapbox) │  Mobile PWA (React)                 │
│  `packages/desktop/src/`   │  `packages/mobile/src/`             │
│  Atlas globe + Roll views  │  Capture bar + offline queue        │
└──────────────┬─────────────┴───────────────────┬─────────────────┘
               │  HTTP + WebSocket (/ws)          │
               ▼                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                     NestJS Server (single process)               │
│                    `packages/server/src/`                        │
│                                                                  │
│  ┌────────────────┐  ┌─────────────┐  ┌──────────────────────┐  │
│  │ EntriesModule  │  │ MediaModule │  │   LocationModule      │  │
│  │ .../entries/   │  │ .../media/  │  │   .../location/       │  │
│  └───────┬────────┘  └──────┬──────┘  └──────────────────────┘  │
│          │                  │                                     │
│  ┌───────▼──────────────────▼─────────────────────────────────┐  │
│  │  Ambient Services (fire-and-forget, in-process)            │  │
│  │  LastfmService · SyncthingService (AppModule providers)    │  │
│  │  WhisperService · EmbeddingService · GeocoderService       │  │
│  │  WeatherService · LocationStore                            │  │
│  │  `packages/server/src/services/`                           │  │
│  └────────────────────────────┬───────────────────────────────┘  │
│                               │                                   │
│  ┌────────────────────────────▼───────────────────────────────┐  │
│  │  EventsGateway (WebSocket broadcast at /ws)                │  │
│  │  `packages/server/src/events/events.gateway.ts`            │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  SQLite (better-sqlite3) + filesystem                            │
│  `packages/server/data/memoir.db`                                │
│  `packages/server/data/media/`  (original files + thumbnails)   │
└──────────────────────────────────────────────────────────────────┘

Shared contract (types + API routes):
  `packages/contract/src/index.ts`  ← ts-rest router + Zod schemas
  consumed by server (NestJS) and both clients (@ts-rest/core client)
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

**Overall:** Monorepo, contract-first, local-first server with ambient pipelines

**Key Characteristics:**
- A single shared contract package (`@memoir/contract`) defines all HTTP routes and types via ts-rest + Zod. Both server and clients import from it — the contract is the only coupling point.
- The NestJS server is the sole process: it serves the compiled frontend SPA bundles at `/desktop` and `/mobile`, handles all API calls, and runs ambient polling loops internally via `setInterval`.
- Async enrichment (geocoding, weather, embedding, transcription) runs fire-and-forget after the entry creation response is already returned. Clients receive updates via WebSocket broadcast.
- All persistent state lives in one SQLite file plus a `media/` directory. No external databases, no queues, no caches.

## Layers

**Contract Layer:**
- Purpose: Shared API surface — routes, request/response types, entry schemas
- Location: `packages/contract/src/index.ts`
- Contains: ts-rest router, Zod schemas (`EntrySchema`, `CreateEntrySchema`, `UpdateEntrySchema`, `PhotoSessionSchema`), TypeScript inferred types
- Depends on: nothing in this repo
- Used by: server controllers (`@ts-rest/nest`), desktop client (`@ts-rest/core`), mobile client (`@ts-rest/core`)

**Server Layer:**
- Purpose: Single-process backend: HTTP API, WebSocket events, file serving, ambient signals
- Location: `packages/server/src/`
- Contains: NestJS modules, controllers, services, migration runner
- Depends on: `@memoir/contract`, `better-sqlite3`, external HTTP APIs
- Used by: browser clients

**Desktop Client Layer:**
- Purpose: Spatial-temporal archive explorer (globe + photo roll surfaces)
- Location: `packages/desktop/src/`
- Contains: React components, Mapbox canvas, ts-rest client, WebSocket factory
- Depends on: `@memoir/contract`, `mapboxgl`
- Used by: served from server at `/desktop`

**Mobile Client Layer:**
- Purpose: Ambient capture PWA (audio, photo, moment, note)
- Location: `packages/mobile/src/`
- Contains: React components, capture logic, offline queue, GPS hooks
- Depends on: `@memoir/contract`
- Used by: served from server at `/mobile`

**Database Layer:**
- Purpose: Durable storage — single SQLite file with WAL mode
- Location: `packages/server/data/memoir.db` (runtime), schema in `packages/server/src/db/migrations.ts`
- Contains: `entries` table with 20+ columns covering all entry types; `embedding` BLOB column for vector search
- Depends on: nothing
- Used by: `DbService` exclusively

## Data Flow

### Entry Creation (mobile capture → globe dot)

1. Mobile `CaptureBar` calls `api.entries.create({ body })` — ts-rest typed POST to `/api/entries` (`packages/mobile/src/components/CaptureBar.tsx`)
2. `EntriesController.create()` delegates to `EntriesService.create(dto)` (`packages/server/src/entries/entries.controller.ts`)
3. `EntriesService.create()` concurrently fetches `GeocoderService.reverse()` + `WeatherService.fetch()`, then `INSERT`s into SQLite (`packages/server/src/entries/entries.service.ts`)
4. Entry is read back from DB and broadcast via `EventsGateway.broadcast('entry:new', entry)` (`packages/server/src/events/events.gateway.ts`)
5. `EmbeddingService.embedAsync(id)` is called fire-and-forget via `setImmediate` (`packages/server/src/services/embedding.service.ts`)
6. Desktop `App`'s WebSocket handler receives `entry:new` and prepends entry to state + triggers pulse animation on `MapCanvas` (`packages/desktop/src/App.tsx`)

### Audio Upload → Transcription

1. Mobile `AudioRecorder` creates entry, then POSTs `FormData` to `/api/media/upload`
2. `MediaController.upload()` saves file via Multer diskStorage, calls `MediaService.processUpload()` (`packages/server/src/media/media.controller.ts`)
3. `MediaService` updates `entries.media_path`, detects audio MIME type, calls `WhisperService.transcribeAsync(entryId, relativePath)` (`packages/server/src/media/media.service.ts`)
4. `WhisperService` shells out: `ffmpeg` converts to 16kHz WAV, then `whisper.cpp` CLI writes `.txt` — DB updated with `transcript` + `transcript_model` (`packages/server/src/services/whisper.service.ts`)

### Ambient Last.fm Import

1. `LastfmService.onApplicationBootstrap()` fires immediately then every 10 min (`packages/server/src/services/lastfm.service.ts`)
2. Fetches `user.getRecentTracks` from Last.fm API; skips entries where `external_id` already exists
3. Resolves location: `LocationStore.nearest()` (live heartbeat ±10 min) then `EntriesService.nearestLocation()` (entry history ±30 min)
4. Calls `EntriesService.create()` for each new scrobble as `source: 'lastfm'` entry type `moment`
5. Every 30s, polls now-playing and broadcasts `music:nowplaying` via WebSocket to update `NowPlaying` overlay

### Offline Capture (mobile with no connectivity)

1. `CaptureBar.capture()` catches network error; calls `useOfflineQueue.enqueue(item)` — serialized to `localStorage` (`packages/mobile/src/hooks/useOfflineQueue.ts`)
2. Hook flushes on `window:online` event and whenever `useEffect` runs with connectivity restored
3. Each queued item is POSTed in sequence; blob upload follows entry creation

**State Management:**
- Desktop: plain React `useState` in `App.tsx` — entry array, session array, selected entry, surface, filter, now-playing. No external state manager.
- Mobile: plain React `useState` in `App.tsx` — recent entries, recording mode flag. Offline queue in `useRef` backed by `localStorage`.
- Server: stateless per-request except `LocationStore` (in-memory Map of GPS beats) and `LastfmService.nowPlaying` (in-memory scalar).

## Key Abstractions

**Entry:**
- Purpose: Universal atom — every captured moment (audio, photo, note, moment) is an `Entry` row
- Examples: `packages/contract/src/index.ts` (schema), `packages/server/src/db/migrations.ts` (DDL)
- Pattern: Flat denormalized row; `type` discriminates behavior; `source` tracks provenance (`native`, `lastfm`, `syncthing`)

**ts-rest Contract:**
- Purpose: Single typed API definition consumed by both server and client — eliminates hand-written fetch wrappers
- Examples: `packages/contract/src/index.ts`, `packages/server/src/entries/entries.controller.ts`, `packages/desktop/src/api/client.ts`
- Pattern: `contract.entries.list` referenced on both sides; responses typed end-to-end via Zod inference

**EventsGateway broadcast:**
- Purpose: Server-push for real-time state synchronization across clients
- Examples: called in `EntriesService.create/update/remove`, `LastfmService.pollNowPlaying`
- Pattern: `broadcast(type: string, payload: unknown)` sends JSON `{ type, payload }` to all WebSocket clients

**Migration Array:**
- Purpose: Sequential, version-controlled schema evolution without a framework
- Examples: `packages/server/src/db/migrations.ts`
- Pattern: `{ version: number; name: string; sql: string }[]`, applied in transaction, version tracked via `PRAGMA user_version`

**Ambient Services:**
- Purpose: Background data enrichment running inside the server process; no external workers or queues
- Examples: `LastfmService`, `SyncthingService`, `WhisperService`, `EmbeddingService`
- Pattern: `OnApplicationBootstrap` lifecycle hook + `setInterval` / `setImmediate` / `fs.watch`

## Entry Points

**Server bootstrap:**
- Location: `packages/server/src/main.ts`
- Triggers: `pnpm dev` in server package, or `node dist/main.js` in production
- Responsibilities: Reads `.env`, detects Tailscale TLS certs, creates NestJS app with WsAdapter, registers `/config.js` runtime config endpoint, listens on `0.0.0.0:3000`, optionally creates HTTP→HTTPS redirect on port 3001

**Desktop SPA:**
- Location: `packages/desktop/src/main.tsx`
- Triggers: Served at `/desktop` by NestJS `ServeStaticModule`
- Responsibilities: Mounts `<App>` with Mantine `MantineProvider`

**Mobile SPA:**
- Location: `packages/mobile/src/main.tsx`
- Triggers: Served at `/mobile` by NestJS `ServeStaticModule`
- Responsibilities: Mounts `<App>` with Mantine `MantineProvider`

**Contract package:**
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

**What happens:** `MediaService` calls `WhisperService.transcribeAsync()` which writes directly to the DB via `DbService` — bypassing `EntriesService` and skipping the `entry:updated` WebSocket broadcast.
**Why it's wrong:** Clients see stale transcript state until next reconnect or manual refresh; no real-time update when transcription completes.
**Do this instead:** `WhisperService` should call `EventsGateway.broadcast('entry:updated', ...)` after updating the DB row, or `EntriesService.update()` should be used instead of a raw `db.prepare().run()`.

### `as any` casts in importer services

**What happens:** `LastfmService` and `SyncthingService` pass `external_id` via `as any` cast when calling `EntriesService.create()` (`packages/server/src/services/lastfm.service.ts:109`, `packages/server/src/services/syncthing.service.ts:68`).
**Why it's wrong:** `CreateEntrySchema` does not include `external_id`, so the field is stripped or accepted silently — fragile if schema changes.
**Do this instead:** Add `external_id` as an optional field to `CreateEntrySchema` in `packages/contract/src/index.ts`, then remove the casts.

## Error Handling

**Strategy:** Silent-fail on non-critical ambient paths; throw on core CRUD paths.

**Patterns:**
- Geocoder, weather, Last.fm poll: `try/catch` returning `null` — entry is created without the enrichment rather than failing creation.
- Whisper/embedding: fire-and-forget `execFile`/`fetch` with no propagation — failure means entry simply has no transcript/embedding.
- Media upload: errors in sharp thumbnail generation are caught and logged; upload still succeeds.
- WebSocket client: auto-reconnects after 3s on `onclose`; re-fetches all entries on reconnect to recover missed events.
- Offline mobile capture: `useOfflineQueue` catches any network error and queues to `localStorage`.

## Cross-Cutting Concerns

**Logging:** NestJS `Logger` with class name as context. Used in all services. No structured logging or log aggregation — console output only.
**Validation:** Zod at the contract boundary. ts-rest + NestJS validates request bodies against contract schemas before they reach service methods.
**Authentication:** None. Single-user local-first; all endpoints are unauthenticated. CORS is open (`origin: '*'`). Access control relies on Tailscale network boundary.

---

*Architecture analysis: 2026-05-24*
