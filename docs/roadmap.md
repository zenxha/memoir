# Roadmap

## Phase 1 — Capture + view (mostly built)
Mobile capture, NestJS server, SQLite, Three.js globe + Mapbox street view, sidebar list, detail panel, WS live updates, Whisper transcription. **Status: functional, polish pending.**

## Phase 1.5 — Polish (current focus)

**Blocked on designer response to [design-brief.md](design-brief.md).** The hero view, browsing metaphor, detail layout, density visualization, and sort/filter surfaces are all designer-decided. Once design lands, implementation pass will rebuild the desktop UI against it.

Designer-independent fixes that can land now:
- Pick globe tech (Three.js vs Mapbox globe projection) once designer weighs in on the hero view.
- Fix globe ↔ map transition bidirectionality regardless of which renderer wins.
- Add Mapbox token validation + clearer error when missing.

### Dev tooling (engineer-decided)

A dev-only overlay panel triggered by `Cmd+Shift+D`, gated by `import.meta.env.DEV` in the desktop app. Backing endpoints under `/api/dev/*` on the server, gated by `process.env.NODE_ENV !== 'production'`.

Operations:
- Flush DB (drops all entries + media)
- Seed N fake entries with realistic lat/lng spread
- Show raw entry JSON for the current selection
- WS connection status + message log
- Toggle "offline mode" simulation (drops API responses, triggers mobile queue)

No auth, no production exposure — strictly local dev convenience.

## Phase 2 — Ambient capture (server-side, no app changes)
- **Last.fm polling daemon** — OAuth once, server cron every 10 min hits `user.getRecentTracks`, dedups, auto-creates music entries. Covers Spotify / Apple Music / anything that scrobbles. Server-side only; no mobile changes.
- **Syncthing photo ingest** — Syncthing on Android (`/DCIM` → home server folder). Server watches the folder, reads EXIF (timestamp + GPS), creates `photo` entries that reference the file in place. Memoir becomes the **context layer** around the photo; Google Photos / native gallery remain the storage / browsing primary.
- **Google Takeout import** — historical backfill (Location History → moments, old photos → photos).
- **Local OSM tile cache** — map works without internet.
- **Bulk-edit / merge / dedupe** for imported entries.

## Phase 2.5 — Hardware checkpoint
- Decide on dedicated server hardware (Mac Mini / Pi / NAS) once running on laptop becomes the bottleneck.
- Until then: server runs on laptop, reached via Tailscale. Known limitation: captures only sync when laptop is awake + reachable.
- Backup story (restic → Backblaze B2) lands with hardware decision, not before.

## Phase 3 — Native shell (only if ambient capture proves itself)
Checkpoint after Phase 2 runs in production for ~1 month. Decide whether ambient music + Syncthing photos make the archive *feel alive*. If yes, Capacitor wrap unlocks:
- Background location (significant changes + activity recognition for visit detection on Android)
- Background audio capture (current PWA dies on screen lock)
- Native share extension (share to Memoir from any app)
- `MediaStore` content observer for instant photo entries

If the archive already feels rich without it, skip and stay PWA.

## Phase 4 — Reflection surfaces
- Terrain timeline (3D elevation-as-time visualization, designer-led)
- Audio wall (chronological grid of all voice memos with inline playback)
- Whisper UI (correct transcripts, full-text search across transcripts)

## Phase 5 — Outbound
- Export: JSON, GPX, ZIP-of-media, Markdown digest
- Full-text search across transcripts, titles, bodies, tags
- Tag suggestions (local LLM)
