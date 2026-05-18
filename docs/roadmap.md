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

## Phase 2 — Import + offline maps
- Google Takeout import (Location History → moments, Photos → photos, YouTube Music → music_title)
- Local OSM tile cache so the map works without an internet connection
- Bulk-edit / merge / dedupe imported entries

## Phase 3 — Reflection surfaces
- Terrain timeline (3D elevation-as-time visualization, designer-led)
- Audio wall (chronological grid of all voice memos with inline playback)
- Whisper UI (correct transcripts, search transcripts)
- Music history import (Spotify/Apple Music play history → entries)

## Phase 4 — Outbound
- Export: JSON, GPX, ZIP-of-media, Markdown digest
- Full-text search across transcripts, titles, bodies, tags
- Tag suggestions (local LLM)
