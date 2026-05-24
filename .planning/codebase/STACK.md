# Technology Stack

**Analysis Date:** 2026-05-24

## Languages

**Primary:**
- TypeScript 5.4 - All packages (contract, server, desktop, mobile)

**Secondary:**
- SQL (raw) - SQLite migrations hand-rolled in `packages/server/src/db/migrations.ts`

## Runtime

**Environment:**
- Node.js 20+ (required per `README.md`)

**Package Manager:**
- pnpm (workspaces)
- Lockfile: `pnpm-lock.yaml` — present and committed

## Monorepo

**Workspace manager:** pnpm workspaces (`pnpm-workspace.yaml`)

**Packages:**
- `packages/contract/` — `@memoir/contract` — shared API contract (ts-rest + Zod)
- `packages/server/` — `@memoir/server` — NestJS API + SQLite + ambient services
- `packages/desktop/` — `@memoir/desktop` — React globe/map browser (desktop)
- `packages/mobile/` — `@memoir/mobile` — React PWA capture surface (mobile)

## Frameworks

**API Contract:**
- ts-rest 3.51 (`@ts-rest/core`, `@ts-rest/nest`) — single source of truth for all API routes and shapes
- Zod 3.23 — schema validation, used in contract + shared with clients

**Server:**
- NestJS 10 (`@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, `@nestjs/platform-ws`, `@nestjs/websockets`, `@nestjs/serve-static`) — DI framework, HTTP + WebSocket
- Express (via `@nestjs/platform-express`) — underlying HTTP adapter
- better-sqlite3 11 — synchronous SQLite driver; `DbService` extends it directly (`packages/server/src/db/db.service.ts`)
- ws 8.18 — WebSocket server adapter (`packages/server/src/events/events.gateway.ts`)
- multer 2 — multipart file upload (`packages/server/src/media/`)
- sharp 0.33 — image thumbnail generation (`packages/server/src/media/media.service.ts`)
- exifr 7.1 — EXIF GPS/timestamp parsing from photos (`packages/server/src/services/syncthing.service.ts`)
- node-fetch 2.7 — HTTP client used by geocoder, weather, Last.fm, embedding services

**Desktop:**
- React 18.3 + React DOM — UI rendering
- Mantine 7.11 (`@mantine/core`, `@mantine/hooks`, `@mantine/spotlight`) — component library
- Mapbox GL v3 (`mapbox-gl` 3.23) — globe and map rendering (`packages/desktop/src/globe/MapCanvas.tsx`)
- @emotion/react 11 — CSS-in-JS (Mantine peer dependency)

**Mobile:**
- React 18.3 + React DOM — UI rendering
- Mantine 7.11 — component library (same version as desktop)
- @emotion/react 11 — CSS-in-JS

**Build/Dev:**
- Vite 5.3 + `@vitejs/plugin-react` — desktop and mobile bundler/dev server
- ts-node 10.9 + tsconfig-paths 4.2 — server dev runner (`ts-node -r tsconfig-paths/register src/main.ts`)
- tsx 4.22 — script runner for `scripts/seed.ts`, `scripts/takeout-import.ts`
- TypeScript 5.4 — all packages; strict mode enabled (`tsconfig.base.json`)

**Testing:**
- Vitest 2.1 + `@vitest/coverage-v8` — unit tests in `@memoir/server` (`packages/server/src/`)
- Playwright 1.60 (`@playwright/test`) — E2E API smoke + desktop screenshot tests (`tests/e2e/`)

## Key Dependencies

**Critical:**
- `better-sqlite3` 11 — sole persistence layer; synchronous, no ORM. Never replace with Postgres/ORM (per architectural constraints).
- `mapbox-gl` 3.23 — requires a `MAPBOX_TOKEN` env var, injected at runtime via `/config.js` endpoint
- `@ts-rest/core` + `@ts-rest/nest` — type-safe contract binding between all packages; changing this breaks every client simultaneously

**Infrastructure:**
- `dotenv` 16.4 — loaded explicitly in `packages/server/src/main.ts` at bootstrap
- `reflect-metadata` 0.2 — NestJS DI requirement, imported first in `main.ts`
- `rxjs` 7.8 — NestJS peer dependency

**System-level (not npm):**
- ffmpeg — audio conversion pipeline for Whisper transcription (invoked via `execFile`)
- whisper-cpp (`whisper-cli`) — local speech-to-text binary (`packages/server/src/services/whisper.service.ts`)
- Ollama — local embedding service, default `http://localhost:11434` (`packages/server/src/services/embedding.service.ts`)
- Tailscale — optional TLS layer for HTTPS on LAN (enables GPS/mic on mobile)
- Syncthing — optional file sync for photo ingest

## Configuration

**Environment:**
- Loaded from `.env` at repo root via `dotenv.config()` in `packages/server/src/main.ts`
- Key vars:
  - `MAPBOX_TOKEN` — required for globe rendering
  - `MEMOIR_DATA_DIR` — data/media directory override (defaults to `packages/server/data/`)
  - `PORT` — server port (default 3000)
  - `TAILSCALE_CERT` / `TAILSCALE_KEY` / `TAILSCALE_HOSTNAME` / `TAILSCALE_IP` — optional HTTPS
  - `LASTFM_API_KEY` / `LASTFM_USERNAME` — optional Last.fm polling
  - `WHISPER_BIN` / `WHISPER_MODEL` — optional local transcription
  - `OLLAMA_URL` — optional embedding service (default `http://localhost:11434`)
  - `SYNCTHING_MEDIA_DIR` — optional photo ingest watch directory
  - `MEMOIR_SERVER_URL` — desktop Vite proxy target (dev only)

**Build:**
- `tsconfig.base.json` — shared TS config (strict, esModuleInterop, resolveJsonModule)
- `packages/server/tsconfig.build.json` — server production build
- `packages/server/tsconfig.typecheck.json` — server typecheck (no emit)
- `packages/desktop/vite.config.ts` — Vite with API/WS proxy to server
- `packages/mobile/vite.config.ts` — Vite for PWA

## Platform Requirements

**Development:**
- Node 20+
- pnpm
- ffmpeg (for audio → Whisper conversion)
- whisper-cpp binary (optional, for transcription)
- Mapbox token (required for globe)
- Ollama (optional, for embeddings)

**Production:**
- Single-machine deployment (local-first, no cloud)
- HTTP or HTTPS (Tailscale certs) on port 3000
- SQLite file at `$MEMOIR_DATA_DIR/memoir.db`
- Media files at `$MEMOIR_DATA_DIR/media/`

---

*Stack analysis: 2026-05-24*
