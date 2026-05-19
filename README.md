# Memoir

A local-first personal sensory archive. Capture audio, photos, locations, and music context from your phone; explore them as a spatial-temporal map on desktop.

All data stays on your machine. No accounts, no cloud sync, no analytics.

## Stack

| Layer | Tech |
|---|---|
| API contract | ts-rest + Zod |
| Server | NestJS 10 + better-sqlite3 |
| Desktop | React 18 + Mantine 7 + Mapbox GL v3 |
| Mobile | React 18 + Mantine 7 (PWA) |
| Monorepo | pnpm workspaces |

## Prerequisites

```bash
brew install node pnpm ffmpeg whisper-cpp
npm i -g pnpm   # if not already
```

- **Node 20+**
- **ffmpeg** — audio conversion for Whisper
- **whisper-cpp** — local speech transcription
- **Mapbox token** — free account at mapbox.com, required for the globe

## Quick start

```bash
git clone <repo> && cd memoir
pnpm install
cp .env.example .env
# edit .env — set MAPBOX_TOKEN at minimum
pnpm build          # builds contract → server → desktop → mobile
pnpm --filter @memoir/server dev
```

Desktop → `https://localhost:3000/desktop`  
Mobile  → `https://localhost:3000/mobile`

## Dev mode (hot reload)

```bash
MEMOIR_SERVER_URL=https://localhost:3000 pnpm dev
```

- Server: `:3000` (HTTPS if Tailscale certs configured, HTTP otherwise)
- Desktop Vite: `http://localhost:5173`
- Mobile Vite: `http://localhost:5174`

## HTTPS on LAN (needed for GPS + microphone on mobile)

```bash
tailscale cert <machine-name>.ts.net
# copy cert files into the repo root
# set TAILSCALE_CERT, TAILSCALE_KEY, TAILSCALE_HOST in .env
```

Then access mobile at `https://<machine-name>.ts.net:3000/mobile`.

## Whisper transcription

Memoir transcribes audio entries locally using whisper-cpp. Language is **auto-detected** — Japanese, English, and mixed audio all work.

**Choose a model** based on your language needs:

| Model | Size | English | Japanese | Notes |
|---|---|---|---|---|
| `base.en` | 145 MB | good | ❌ | English only, fastest |
| `base` | 145 MB | good | passable | Multilingual |
| `small` | 244 MB | better | good | Recommended minimum for Japanese |
| `medium` | 769 MB | great | great | Recommended for Japanese-heavy use |
| `large-v3` | 3.1 GB | best | best | Slow on CPU |

```bash
# Download a model (example: medium for Japanese support)
whisper-cli -m ~/.cache/whisper/ggml-medium.bin --help
# or download manually:
curl -L "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin" \
  -o ~/.cache/whisper/ggml-medium.bin
```

Set in `.env`:
```
WHISPER_BIN=/opt/homebrew/bin/whisper-cli
WHISPER_MODEL=/Users/<you>/.cache/whisper/ggml-medium.bin
```

On server start, Whisper automatically backfills any audio entries without transcripts. **Switching to a better model** re-transcribes all entries from the old model — just update `WHISPER_MODEL` and restart.

## Ambient capture (Phase 2)

### Last.fm / Spotify scrobbles

Polls every 10 min and creates `moment` entries for played tracks. Scrobbles are geo-tagged by matching their timestamp to nearby captures (±30 min).

```
LASTFM_API_KEY=   # https://www.last.fm/api/account/create
LASTFM_USERNAME=
```

### Syncthing photo ingest

Point Syncthing to sync your phone's DCIM folder to a local directory, then:

```
SYNCTHING_MEDIA_DIR=/path/to/synced/photos
```

Server watches the folder, reads EXIF for GPS + timestamp, creates `photo` entries.

### Embeddings (for future semantic search)

Requires [Ollama](https://ollama.com):

```bash
brew install ollama
ollama pull nomic-embed-text
```

```
OLLAMA_URL=http://localhost:11434   # default, can omit
```

Embeddings are generated at write time and backfilled on startup. Used by Phase 5 AI search — safe to enable early so the index builds up over time.

### Google Takeout import

```bash
# Download your Takeout archive from takeout.google.com
pnpm takeout -- --dir /path/to/Takeout
pnpm takeout -- --dir /path/to/Takeout --location-only   # skip photos
pnpm takeout -- --dir /path/to/Takeout --thin-minutes 10 # 1 point per 10 min
```

## Verify loop

```bash
pnpm verify   # typecheck + vitest + playwright (~30s)
```

Tests run against an ephemeral DB. Your dev `memoir.db` is never touched.

## Seeding

```bash
pnpm seed                    # 50 fake entries, SF Bay Area
pnpm seed -- --reset         # delete seeded entries first, then reseed
pnpm seed -- --clean         # delete seeded entries only, keep real data
```

## Project layout

```
packages/
  contract/   ts-rest + Zod API contract (single source of truth)
  server/     NestJS + SQLite + all ambient importers
  desktop/    React + Mapbox v3 globe — browse and reflect
  mobile/     React PWA — capture surface

scripts/
  seed.ts             fake entries for development
  takeout-import.ts   Google Takeout historical import

docs/
  design-brief.md         original desktop design brief
  design-brief-mobile.md  mobile design brief
  design/proposal.html    Cosmographic Atlas design spec (13 slides)
```
