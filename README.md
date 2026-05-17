# Memoir

A local-first sensory archive. Capture audio, photos, locations, and music context from your phone; explore them as a 3D geospatial experience on desktop.

## Stack

| Layer | Tech |
|-------|------|
| API contract | ts-rest + Zod |
| Server | NestJS 10 + better-sqlite3 |
| Desktop | React 18 + Mantine 7 + Three.js + Mapbox GL |
| Mobile | React 18 + Mantine 7 (PWA) |
| Monorepo | pnpm workspaces |

## Setup

### Prerequisites

- Node 20+
- pnpm (`npm i -g pnpm`)
- ffmpeg (`brew install ffmpeg`)
- whisper-cli (`brew install whisper-cpp`)
- (optional) Tailscale for HTTPS on LAN

### Quick start

```bash
git clone <repo>
cd memoir
./setup.sh            # installs deps, builds packages, creates .env
# edit .env — add MAPBOX_TOKEN
pnpm --filter @memoir/server start
```

Desktop → `http://localhost:3000/desktop`  
Mobile  → `http://localhost:3000/mobile` (or `https://<tailscale-host>/mobile`)

### Environment variables

See `.env.example` for all variables. The only required one is `MAPBOX_TOKEN`.

For HTTPS (needed for `getUserMedia` on mobile over LAN):

```bash
tailscale cert <hostname>.ts.net
# then set TAILSCALE_CERT, TAILSCALE_KEY, TAILSCALE_HOST in .env
```

### Whisper transcription

Install model:

```bash
whisper-cli --download-model base.en
# model lands in /opt/homebrew/share/whisper.cpp/models/
```

Set `WHISPER_MODEL` in `.env` to the model path.

## Development

```bash
pnpm --filter @memoir/server   start:dev   # NestJS watch mode
pnpm --filter @memoir/desktop  dev         # Vite dev server :5173
pnpm --filter @memoir/mobile   dev         # Vite dev server :5174
```

Desktop and mobile Vite configs proxy `/api` and `/ws` to `:3000`.

## Project layout

```
packages/
  contract/   shared ts-rest API contract + Zod schemas
  server/     NestJS server, SQLite DB, media storage
  desktop/    Three.js globe + Mapbox street map
  mobile/     PWA capture interface (audio, photo, moment)
```
