# Codebase Structure

**Analysis Date:** 2026-05-24

## Directory Layout

```
memoir/                          # Monorepo root
├── packages/
│   ├── contract/                # @memoir/contract — shared API types + ts-rest router
│   │   └── src/
│   │       └── index.ts         # Single file: all Zod schemas, TypeScript types, contract router
│   ├── server/                  # @memoir/server — NestJS backend
│   │   ├── src/
│   │   │   ├── main.ts          # Bootstrap: HTTPS detection, WsAdapter, /config.js, port binding
│   │   │   ├── app.module.ts    # Root module: imports all feature modules, registers ambient providers
│   │   │   ├── db/
│   │   │   │   ├── db.module.ts     # Global module exporting DbService
│   │   │   │   ├── db.service.ts    # Extends better-sqlite3 Database; runs migrations on init
│   │   │   │   ├── migrations.ts    # Migration[] array — all DDL, versioned
│   │   │   │   └── README.md        # Migration authoring conventions
│   │   │   ├── entries/
│   │   │   │   ├── entries.module.ts
│   │   │   │   ├── entries.controller.ts  # ts-rest-bound HTTP handlers
│   │   │   │   └── entries.service.ts     # CRUD, session clustering, bulk, importers helpers
│   │   │   ├── media/
│   │   │   │   ├── media.module.ts
│   │   │   │   ├── media.controller.ts    # POST /api/media/upload, GET /api/media/:filename
│   │   │   │   └── media.service.ts       # Sharp thumbnails, Whisper trigger
│   │   │   ├── events/
│   │   │   │   ├── events.module.ts
│   │   │   │   └── events.gateway.ts      # WebSocket gateway at /ws; broadcast() fan-out
│   │   │   ├── location/
│   │   │   │   ├── location.module.ts
│   │   │   │   └── location.controller.ts  # POST /api/location/heartbeat
│   │   │   ├── music/
│   │   │   │   └── music.controller.ts    # GET /api/music/nowplaying
│   │   │   └── services/
│   │   │       ├── geocoder.service.ts    # Nominatim reverse geocoding
│   │   │       ├── weather.service.ts     # Open-Meteo daily weather
│   │   │       ├── whisper.service.ts     # whisper.cpp CLI transcription
│   │   │       ├── embedding.service.ts   # Ollama nomic-embed-text embeddings
│   │   │       ├── lastfm.service.ts      # Last.fm scrobble import + now-playing poll
│   │   │       ├── syncthing.service.ts   # fs.watch photo ingest with EXIF
│   │   │       └── location-store.service.ts  # In-memory GPS heartbeat store
│   │   ├── data/                # Runtime data (gitignored)
│   │   │   ├── memoir.db        # SQLite database
│   │   │   └── media/           # Uploaded files + generated thumbnails
│   │   └── test/                # (empty — unit tests are in packages/server/src)
│   ├── desktop/                 # @memoir/desktop — React SPA (Atlas globe + Roll)
│   │   ├── src/
│   │   │   ├── main.tsx         # React DOM entry; MantineProvider
│   │   │   ├── App.tsx          # Root component: all state, WS subscription, surface routing
│   │   │   ├── api/
│   │   │   │   └── client.ts    # ts-rest client instance + WsMessage types + createWsClient()
│   │   │   ├── globe/
│   │   │   │   └── MapCanvas.tsx   # Mapbox GL v3 globe; dots, pulse, auto-rotate
│   │   │   ├── components/
│   │   │   │   ├── Sidebar.tsx         # Entry list + filter + session tiles (atlas view)
│   │   │   │   ├── EntryDetail.tsx     # Entry detail drawer/modal
│   │   │   │   ├── DetailPanel.tsx     # Detail panel sub-component
│   │   │   │   ├── RollSurface.tsx     # Chronological photo roll surface
│   │   │   │   ├── SurfaceSwitcher.tsx # Atlas / Roll toggle
│   │   │   │   ├── CommandPalette.tsx  # ⌘K / slash command palette
│   │   │   │   ├── NowPlaying.tsx      # Floating now-playing track overlay
│   │   │   │   ├── BulkBar.tsx         # Multi-select action bar (delete, tag)
│   │   │   │   └── ChromeFader.tsx     # Auto-hide chrome wrapper (idle fade)
│   │   │   ├── hooks/
│   │   │   │   └── useIdleFade.ts      # Idle timer hook for ChromeFader
│   │   │   └── styles/
│   │   │       └── theme.css           # Design token CSS vars (--ink-*, --audio, --photo, etc.)
│   │   ├── public/              # Vite public assets
│   │   └── dist/                # Built output served by server at /desktop (gitignored)
│   └── mobile/                  # @memoir/mobile — React PWA (capture)
│       ├── src/
│       │   ├── main.tsx         # React DOM entry; MantineProvider
│       │   ├── App.tsx          # Root: GPS, backend health, heartbeat, capture + recent list
│       │   ├── api/
│       │   │   └── client.ts    # ts-rest client (same pattern as desktop)
│       │   ├── components/
│       │   │   ├── CaptureBar.tsx    # Moment/photo/music/note capture buttons
│       │   │   ├── AudioRecorder.tsx # Audio recording + waveform + upload
│       │   │   ├── RecentList.tsx    # Last 10 entries list
│       │   │   └── StatusBar.tsx     # GPS + connectivity status indicator
│       │   └── hooks/
│       │       ├── useGPS.ts                # Geolocation API wrapper
│       │       ├── useBackend.ts            # /api/entries ping for connectivity detection
│       │       ├── useLocationHeartbeat.ts  # 60s GPS heartbeat poster
│       │       └── useOfflineQueue.ts       # localStorage offline queue + flush on reconnect
│       ├── public/              # Vite public assets + PWA manifest
│       └── dist/                # Built output served by server at /mobile (gitignored)
├── scripts/
│   ├── seed.ts                  # pnpm seed — populates dev DB with sample entries
│   └── takeout-import.ts        # Google Takeout JSON → entries importer (pnpm takeout)
├── tests/
│   ├── e2e/
│   │   ├── api-smoke.spec.ts         # Playwright: API contract smoke tests
│   │   └── desktop-screenshots.spec.ts  # Playwright: desktop screenshot capture
│   ├── screenshots/             # Captured screenshots for visual self-inspection (gitignored)
│   └── .tmp/                    # Ephemeral test DB (MEMOIR_DATA_DIR override, gitignored)
├── docs/
│   ├── design-brief.md          # Design brief given to designer
│   └── design/
│       ├── proposal.html         # 13-slide designer spec (visual reference)
│       └── chats/
│           └── chat1.md          # Designer back-and-forth transcript
├── package.json                  # Root: pnpm scripts (verify, seed, build, typecheck, test, e2e)
├── pnpm-workspace.yaml           # Workspace: packages/*
├── tsconfig.base.json            # Shared TS config
├── playwright.config.ts          # Playwright: baseURL, test dir, screenshot output
├── CLAUDE.md                     # Session bootloader for Claude
├── CONTRIBUTING.md               # Verify loop, test conventions, branch model
└── README.md                     # Setup and run instructions
```

## Directory Purposes

**`packages/contract/`:**
- Purpose: Single source of truth for all API shapes — routes, request bodies, responses, shared TypeScript types
- Contains: One file — `src/index.ts`. All Zod schemas and the ts-rest contract router live here.
- Key files: `packages/contract/src/index.ts`

**`packages/server/src/db/`:**
- Purpose: SQLite database setup, schema migration, and the injectable `DbService`
- Contains: Migration array (add new schema here), `DbService` (migration runner + raw SQL access), db module
- Key files: `packages/server/src/db/migrations.ts` (add schema changes here), `packages/server/src/db/db.service.ts`

**`packages/server/src/entries/`:**
- Purpose: Core CRUD feature module for all entry types
- Contains: Controller (HTTP handlers bound to ts-rest contract), Service (all business logic: create pipeline, session clustering, bulk ops)
- Key files: `packages/server/src/entries/entries.service.ts`, `packages/server/src/entries/entries.controller.ts`

**`packages/server/src/services/`:**
- Purpose: Cross-cutting and ambient services not tied to a single controller
- Contains: Geocoder, weather, Whisper, embeddings, Last.fm, Syncthing, LocationStore
- Key files: All files in `packages/server/src/services/`

**`packages/server/src/events/`:**
- Purpose: WebSocket gateway for real-time server→client push
- Contains: `EventsGateway` with `broadcast()` method
- Key files: `packages/server/src/events/events.gateway.ts`

**`packages/desktop/src/globe/`:**
- Purpose: Mapbox GL v3 map canvas, the primary spatial visualization
- Contains: `MapCanvas.tsx` — all map setup, layer configuration, dot rendering, pulse animation
- Key files: `packages/desktop/src/globe/MapCanvas.tsx`

**`packages/desktop/src/components/`:**
- Purpose: All desktop UI components
- Contains: Sidebar, detail views, surfaces, overlays, command palette, bulk actions
- Key files: `Sidebar.tsx`, `EntryDetail.tsx`, `RollSurface.tsx`, `SurfaceSwitcher.tsx`

**`packages/mobile/src/hooks/`:**
- Purpose: Mobile-specific React hooks for device APIs and connectivity
- Contains: GPS, backend health, location heartbeat, offline queue
- Key files: `packages/mobile/src/hooks/useOfflineQueue.ts`, `packages/mobile/src/hooks/useLocationHeartbeat.ts`

**`tests/e2e/`:**
- Purpose: Playwright end-to-end tests — API smoke and desktop visual regression
- Contains: API contract verification, screenshot capture
- Key files: `tests/e2e/api-smoke.spec.ts`, `tests/e2e/desktop-screenshots.spec.ts`

## Key File Locations

**Entry Points:**
- `packages/server/src/main.ts`: Server bootstrap (run first, serves everything)
- `packages/desktop/src/main.tsx`: Desktop SPA entry
- `packages/mobile/src/main.tsx`: Mobile PWA entry

**Schema / Contract:**
- `packages/contract/src/index.ts`: All Zod schemas, TypeScript types, ts-rest contract router
- `packages/server/src/db/migrations.ts`: All DDL — add new columns/tables here

**Core Business Logic:**
- `packages/server/src/entries/entries.service.ts`: Entry CRUD, photo session clustering, bulk ops
- `packages/server/src/media/media.service.ts`: Upload processing, thumbnails, Whisper trigger

**Configuration:**
- `packages/server/src/app.module.ts`: Module wiring — add new modules here
- `packages/server/src/main.ts`: Runtime env config, port, TLS

**API Client (frontend):**
- `packages/desktop/src/api/client.ts`: ts-rest client instance, WebSocket factory, WsMessage types
- `packages/mobile/src/api/client.ts`: Same pattern for mobile

**Testing:**
- `tests/e2e/api-smoke.spec.ts`: API correctness tests
- `tests/e2e/desktop-screenshots.spec.ts`: Visual regression screenshots
- `playwright.config.ts`: Test configuration, base URL, screenshot directory

## Naming Conventions

**Files:**
- Server: `kebab-case.service.ts`, `kebab-case.controller.ts`, `kebab-case.module.ts` — always suffixed with role
- Desktop/mobile components: `PascalCase.tsx`
- Desktop/mobile hooks: `camelCase.ts` prefixed with `use`
- Shared: `index.ts` for package entry points

**Directories:**
- Server feature modules: lowercase noun (`entries/`, `media/`, `events/`, `location/`, `music/`)
- Services not tied to a module: `services/` flat directory
- Frontend: lowercase for grouping dirs (`api/`, `components/`, `hooks/`, `globe/`, `styles/`)

**Database:**
- Column names: `snake_case`
- Table names: plural (`entries`)
- Index names: `idx_{table}_{column}`

**TypeScript:**
- Zod schemas: `PascalCaseSchema` (e.g., `EntrySchema`, `CreateEntrySchema`)
- Inferred types: `PascalCase` (e.g., `Entry`, `PhotoSession`)
- NestJS services/controllers: `PascalCaseService`, `PascalCaseController`, `PascalCaseModule`

## Where to Add New Code

**New entry type or entry field:**
1. Add column to `packages/server/src/db/migrations.ts` (new `Migration` object with incremented version)
2. Add field to `EntrySchema` in `packages/contract/src/index.ts`
3. Add to `CreateEntrySchema` / `UpdateEntrySchema` as needed in `packages/contract/src/index.ts`
4. Update `EntriesService.parse()` in `packages/server/src/entries/entries.service.ts` if JSON parse needed
5. Update `EntriesService.create()` INSERT statement and `EntriesService.update()` allowed fields

**New API endpoint:**
1. Add route to `contract` router in `packages/contract/src/index.ts`
2. Add `@TsRestHandler` method to the relevant controller, or create `new-feature.controller.ts` in the feature dir
3. Add service logic to existing service or create `new-feature.service.ts`
4. Register in the feature module's `providers` and `controllers` arrays
5. If new module: import it in `packages/server/src/app.module.ts`

**New ambient background service:**
1. Create `packages/server/src/services/new-thing.service.ts` — implement `OnApplicationBootstrap`
2. Add to `AppModule.providers` in `packages/server/src/app.module.ts`
3. Use `setImmediate()` for one-shot startup work, `setInterval()` for polling, `fs.watch()` for file changes

**New desktop UI component:**
- Implementation: `packages/desktop/src/components/NewComponent.tsx`
- Import and use in `packages/desktop/src/App.tsx` or another component

**New mobile hook:**
- Implementation: `packages/mobile/src/hooks/useNewHook.ts`

**New database migration:**
- Append a new `Migration` object to the array in `packages/server/src/db/migrations.ts`
- Use next sequential integer for `version`
- Wrap multi-statement DDL in a single `sql` string (executed in one transaction)
- Never modify existing migration entries — always append

**Utility scripts:**
- Add to `scripts/` directory as `tsx`-executable TypeScript files
- Register the command in root `package.json` `scripts` block

## Special Directories

**`packages/server/data/`:**
- Purpose: Runtime SQLite DB and uploaded media files
- Generated: Yes (created by `DbService` on first boot)
- Committed: No (gitignored)

**`tests/.tmp/`:**
- Purpose: Ephemeral test database used by Playwright tests via `MEMOIR_DATA_DIR` env override
- Generated: Yes (created by test runner)
- Committed: No (gitignored, contents are transient)

**`tests/screenshots/`:**
- Purpose: Visual output from `desktop-screenshots.spec.ts` for self-inspection after verify
- Generated: Yes (by Playwright)
- Committed: No (gitignored)

**`packages/*/dist/`:**
- Purpose: Compiled build output; desktop and mobile `dist/` folders are served by NestJS
- Generated: Yes (by Vite / tsc)
- Committed: No (gitignored)

**`.planning/codebase/`:**
- Purpose: Codebase map documents consumed by GSD planning commands
- Generated: Yes (by `/gsd-map-codebase`)
- Committed: No (gitignored as working planning docs)

---

*Structure analysis: 2026-05-24*
