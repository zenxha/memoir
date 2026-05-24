# External Integrations

**Analysis Date:** 2026-05-24

## APIs & External Services

**Mapping:**
- Mapbox GL v3 — globe and map rendering in the desktop app
  - SDK/Client: `mapbox-gl` 3.23 npm package (`packages/desktop/src/globe/MapCanvas.tsx`)
  - Auth: `MAPBOX_TOKEN` env var — injected at runtime via server-side `/config.js` endpoint, consumed as `window.__CONFIG__.mapboxToken`
  - Required: yes — no fallback; globe is inoperable without token

**Geocoding:**
- Nominatim (OpenStreetMap) — reverse geocoding lat/lng to human-readable place names
  - SDK/Client: raw `node-fetch` HTTP calls (`packages/server/src/services/geocoder.service.ts`)
  - Auth: none (free public API; User-Agent header set to `Memoir/1.0 (personal archive)`)
  - Endpoint: `https://nominatim.openstreetmap.org/reverse`
  - Called on-demand during entry creation when lat/lng is present

**Weather:**
- Open-Meteo — historical/forecast weather data at a given lat/lng and date
  - SDK/Client: raw `node-fetch` HTTP calls (`packages/server/src/services/weather.service.ts`)
  - Auth: none (free public API)
  - Endpoint: `https://api.open-meteo.com/v1/forecast`
  - Called on-demand during entry creation; result stored as JSON in `entries.weather`

**Music:**
- Last.fm — scrobble history polling and now-playing detection
  - SDK/Client: raw `node-fetch` HTTP calls (`packages/server/src/services/lastfm.service.ts`)
  - Auth: `LASTFM_API_KEY` + `LASTFM_USERNAME` env vars
  - Endpoint: `https://ws.audioscrobbler.com/2.0/` (user.getRecentTracks)
  - Polling cadence: scrobbles every 10 min, now-playing every 30 s
  - Optional: service disables itself at startup if keys are missing
  - Creates `moment` entries of type `source=lastfm` with music metadata

## Data Storage

**Databases:**
- SQLite (better-sqlite3 11) — sole persistent store
  - File: `$MEMOIR_DATA_DIR/memoir.db` (defaults to `packages/server/data/memoir.db`)
  - Connection: `packages/server/src/db/db.service.ts` — `DbService` extends `Database` directly
  - Schema version tracked via `PRAGMA user_version`; migrations hand-rolled in `packages/server/src/db/migrations.ts`
  - WAL mode + foreign keys enabled on init
  - Embeddings stored as `BLOB` (raw `Float32Array` bytes) in `entries.embedding` column

**File Storage:**
- Local filesystem — media files (audio recordings, photos, thumbnails)
  - Directory: `$MEMOIR_DATA_DIR/media/`
  - Upload: multer writes to this directory; path stored as `entries.media_path`
  - Thumbnails: sharp generates `thumb_<filename>.jpg` at 400px width
  - Served: via `GET /api/media/:filename` in `packages/server/src/media/media.controller.ts`

**Caching:**
- None — no external cache layer; SQLite is the only data store

## Authentication & Identity

**Auth Provider:**
- None — no user accounts, no authentication
  - Single-owner app; all endpoints open to the LAN
  - CORS: `origin: '*'` (set in `packages/server/src/main.ts`)
  - Network security relies on Tailscale (private VPN) for LAN access control

## Local AI & ML

**Speech-to-Text:**
- whisper-cpp — local transcription of audio entries
  - Integration: `execFile` shell invocation (`packages/server/src/services/whisper.service.ts`)
  - Binary: `WHISPER_BIN` env var (e.g. `/opt/homebrew/bin/whisper-cli`)
  - Model: `WHISPER_MODEL` env var (ggml `.bin` file — base, small, medium, or large-v3)
  - Pipeline: audio → ffmpeg → 16kHz mono WAV → whisper-cpp → `.txt` → stored in `entries.transcript`
  - Backfill: re-transcribes entries on startup if model has changed (`entries.transcript_model` tracks model name)
  - Optional: disabled if `WHISPER_BIN`/`WHISPER_MODEL` not set or files missing

**Embeddings:**
- Ollama (`nomic-embed-text` model) — semantic text embeddings for entries
  - SDK/Client: raw `node-fetch` HTTP calls (`packages/server/src/services/embedding.service.ts`)
  - Auth: none (local service)
  - Endpoint: `$OLLAMA_URL/api/embeddings` (default `http://localhost:11434`)
  - Model: `nomic-embed-text` (hardcoded)
  - Fire-and-forget: `embedAsync()` called after entry creation; backfill runs on startup
  - Optional: disabled if Ollama unreachable at startup (2 s timeout probe)
  - Stored as: 768-dimension `Float32Array` BLOB in `entries.embedding`

## Photo Ingest

**Syncthing:**
- Local file sync daemon — watches a directory for new photos synced from phone
  - SDK/Client: Node `fs.watch()` (`packages/server/src/services/syncthing.service.ts`)
  - Config: `SYNCTHING_MEDIA_DIR` env var — path to synced DCIM directory
  - EXIF parsing: `exifr` npm package reads GPS coordinates and `DateTimeOriginal`
  - Creates `photo` entries of type `source=syncthing`
  - Supported formats: `.jpg`, `.jpeg`, `.png`, `.heic`, `.heif`, `.webp`
  - Optional: disabled if `SYNCTHING_MEDIA_DIR` not set

## Data Import

**Google Takeout:**
- One-shot import script — `scripts/takeout-import.ts`
  - Run via: `pnpm takeout -- --dir /path/to/Takeout`
  - Imports location history and photos from Google Takeout archives
  - No external API dependency — reads local archive files

## Real-Time Communication

**WebSocket (server → clients):**
- Native `ws` 8.18 via `@nestjs/platform-ws` + `@nestjs/websockets`
  - Gateway: `packages/server/src/events/events.gateway.ts` — broadcasts to all connected clients
  - Path: `/ws`
  - Message types: `entry:new`, `entry:updated`, `entry:deleted`, `music:nowplaying`
  - Client (desktop): `packages/desktop/src/api/client.ts` — auto-reconnects every 3 s on close
  - Used by: Last.fm now-playing broadcast, new entry notifications

## Networking & TLS

**Tailscale:**
- Optional TLS layer enabling HTTPS on LAN (required for browser GPS + microphone APIs on mobile)
  - Cert path: `TAILSCALE_CERT` env var
  - Key path: `TAILSCALE_KEY` env var
  - Hostname: `TAILSCALE_HOSTNAME` or `TAILSCALE_IP` env var
  - If configured: server starts HTTPS on `PORT`, plain HTTP redirect on `PORT+1`
  - Certs committed at repo root: `chea.brown-iwato.ts.net.crt`, `chea.brown-iwato.ts.net.key`

## Monitoring & Observability

**Error Tracking:**
- None — no external error tracking service

**Logs:**
- NestJS built-in `Logger` — used in all server services
- Console output only; no log aggregation

## CI/CD & Deployment

**Hosting:**
- Local machine — no cloud hosting; local-first architecture
- No Docker, no container orchestration

**CI Pipeline:**
- None — no CI service configured

## Environment Configuration

**Required env vars:**
- `MAPBOX_TOKEN` — Mapbox GL access token (globe non-functional without this)

**Optional env vars (features degrade gracefully without them):**
- `MEMOIR_DATA_DIR` — data directory (defaults to `packages/server/data/`)
- `PORT` — server port (default 3000)
- `TAILSCALE_CERT` / `TAILSCALE_KEY` / `TAILSCALE_HOSTNAME` / `TAILSCALE_IP` — HTTPS on LAN
- `LASTFM_API_KEY` / `LASTFM_USERNAME` — Last.fm scrobble polling
- `WHISPER_BIN` / `WHISPER_MODEL` — local audio transcription
- `OLLAMA_URL` — embedding service (default `http://localhost:11434`)
- `SYNCTHING_MEDIA_DIR` — photo ingest watch directory
- `MEMOIR_SERVER_URL` — desktop Vite dev proxy target

**Secrets location:**
- `.env` file at repo root (gitignored)
- `.env.example` available as template

## Webhooks & Callbacks

**Incoming:**
- None — no inbound webhooks from external services

**Outgoing:**
- None — polling-based (Last.fm), filesystem-watching (Syncthing), or local subprocess (Whisper/ffmpeg)

---

*Integration audit: 2026-05-24*
