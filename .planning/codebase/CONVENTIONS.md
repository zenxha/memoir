# Coding Conventions

**Analysis Date:** 2026-05-24

## Naming Patterns

**Files:**
- React components: PascalCase matching the exported component name — `Sidebar.tsx`, `EntryDetail.tsx`, `AudioRecorder.tsx`
- Hooks: camelCase prefixed with `use` — `useOfflineQueue.ts`, `useIdleFade.ts`, `useGPS.ts`
- NestJS services: PascalCase with `.service.ts` suffix — `entries.service.ts`, `geocoder.service.ts`, `embedding.service.ts`
- NestJS controllers: PascalCase with `.controller.ts` suffix — `entries.controller.ts`
- NestJS modules: PascalCase with `.module.ts` suffix — `entries.module.ts`, `db.module.ts`
- Domain constants in UPPER_SNAKE_CASE at module scope — `SESSION_GAP_MS`, `SESSION_GAP_M`, `QUEUE_KEY`
- Interface names: PascalCase — `Migration`, `LfmTrack`, `PhotoRow`, `QueueItem`

**Functions:**
- React component functions: PascalCase — `App`, `Sidebar`, `EntryTile`, `DayGroup`
- Internal/helper functions within a file: PascalCase for sub-components, camelCase for pure utilities — `formatTime`, `formatDuration`, `haversineM`, `downsample`, `groupByDay`
- NestJS service methods: camelCase — `findAll`, `findOne`, `create`, `update`, `remove`, `embedAsync`, `transcribeAsync`
- Private class methods prefixed with nothing — TypeScript `private` modifier is used instead

**Variables:**
- camelCase throughout — `queueRef`, `tmpDir`, `dbPath`, `place_name` (exception: SQL column names use snake_case and bleed into TypeScript as-is from the contract)
- Contract/schema fields: snake_case to match SQLite column names — `created_at`, `media_path`, `music_title`

**Types:**
- Zod schemas: PascalCase with `Schema` suffix — `EntrySchema`, `CreateEntrySchema`, `UpdateEntrySchema`, `PhotoSessionSchema`
- TypeScript types inferred from Zod with `z.infer<>` and matching name without suffix — `Entry`, `PhotoSession`
- `as const` used for narrow enum-like arrays — `FILTERS = ['all', 'audio', ...] as const`

## Code Style

**Formatting:**
- No Prettier or ESLint config detected — formatting is manual/editor-level
- Indentation: 2 spaces throughout
- Single quotes for strings in TypeScript/TSX
- Semicolons at end of statements
- Trailing commas in multi-line arrays and objects
- Short lines preferred but not rigidly enforced; long SQL strings are kept inline

**Linting:**
- No ESLint config detected — TypeScript's `tsc --noEmit` is the primary static check
- `pnpm typecheck` runs `tsc` across all four packages as the lint gate

## Import Organization

**Order (consistent across all packages):**
1. Node built-ins (`fs`, `path`, `crypto`, `https`, `http`, `os`)
2. Framework packages (`@nestjs/*`, `react`, `react-dom`)
3. Third-party packages (`better-sqlite3`, `node-fetch`, `zod`, `@mantine/*`, `mapbox-gl`)
4. Internal workspace packages (`@memoir/contract`)
5. Relative imports within the package (`../db/db.service`, `./entries.service`, `../api/client`)

**Path Aliases:**
- `@memoir/contract` resolves to `packages/contract/src/index.ts` via both pnpm workspaces and a vitest `resolve.alias`
- No `@/` or `~/` aliases in the frontend packages — relative imports are used directly

## Error Handling

**Patterns:**
- External HTTP calls (geocoder, weather, Last.fm, Ollama) always wrap in `try/catch` and return `null` on failure — never throw to the caller
- `catch {}` with empty block is acceptable for non-critical failures (WS message parse, EXIF parse logged with `.warn`)
- NestJS controller methods return typed `{ status, body }` objects — `404` is returned as a value, not via `HttpException`
- Offline queue in mobile: on network failure the item is re-queued silently, no user-visible error
- Migration runner: failures propagate (no catch) — a bad migration should crash startup
- `setImmediate` fire-and-forget pattern for background work (`embedAsync`, `transcribeAsync`, `backfill`) — errors are swallowed in the background task, logged at most

**No global error boundary on the server** — NestJS default exception filter handles unhandled controller errors.

## Logging

**Framework:** NestJS `Logger` class (`@nestjs/common`)

**Patterns:**
- Each NestJS service that does I/O creates `private readonly log = new Logger(ServiceName.name)`
- `this.log.log(...)` for informational startup/progress messages
- `this.log.warn(...)` for non-fatal failures (EXIF parse, Last.fm poll failure)
- `console.log` used only in `main.ts` bootstrap for server URL output
- No structured logging library — plain string messages
- Silent catch blocks (`catch { return null; }`) used in geocoder, weather, embedding generate — no log on routine network failure

## Comments

**When to Comment:**
- Block comments (`/** ... */`) at top of test files to describe the contract being tested
- Inline comments on non-obvious constants: `// 10 minutes`, `// 50 metres`
- Section dividers in large files using `// ── Name ────` (used in `EntryDetail.tsx`)
- Comments on deferred work: `// Cartographic placeholder — Mapbox mini-map would go here in a later pass`
- JSX comments with `{/* ... */}` for UI section labels (Brand header, WS status dot, etc.)

**JSDoc/TSDoc:**
- Not used — no JSDoc annotations on exported functions or types
- Interface fields are self-documenting by name; no field-level docs

## Function Design

**Size:** Functions are kept focused — service methods do one thing (findAll, create, update). Large components like `EntryDetail.tsx` use sub-components (`NoteView`, `AudioView`, `MomentView`, `PhotoView`) to stay readable.

**Parameters:**
- NestJS services receive DTOs typed from Zod schemas: `dto: z.infer<typeof CreateEntrySchema>`
- React components receive typed `Props` interfaces defined inline above the component
- Utility functions accept primitives — no config object pattern for small helpers

**Return Values:**
- Service methods return `Entry | null` for nullable lookups — never throw for not-found
- Controllers return `{ status: N as const, body: ... }` objects — the `as const` assertion is required by ts-rest
- Background async methods (`embedAsync`, `transcribeAsync`) return `void` — callers never await them
- Boolean predicates: `existsByExternalId` returns `boolean` via `!!` cast on the SQLite result

## Module Design

**Exports:**
- `packages/contract/src/index.ts` exports everything at the top level — all schemas, types, and the contract object
- NestJS modules use standard `@Module({ imports, controllers, providers, exports })` pattern
- React files export one named component per file — no default exports in components
- Hook files export one named hook per file

**Barrel Files:**
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

---

*Convention analysis: 2026-05-24*
