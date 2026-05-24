# Memoir

## What This Is

A local-first personal sensory archive for a single owner. Moments are captured throughout the day on mobile — audio recordings, photos, location-tagged entries, music context, text notes — and explored on desktop as a spatial-temporal atlas. Memoir wraps native camera + Google Photos with location, weather, music, transcription, and personal reflection. The point is the texture of life: not a curated highlight reel, not a productivity tool, not a journal.

## Core Value

The archive should feel alive and navigable — every captured moment situated in time and place, queryable without an internet connection or account, accumulating meaning over years.

## Requirements

### Validated

- ✓ Mobile PWA capture: audio recording, location tag, text notes, photo association — Phase 1
- ✓ NestJS server + SQLite (better-sqlite3) backend — Phase 1
- ✓ Real-time WebSocket broadcast on entry creation — Phase 1
- ✓ Whisper audio transcription (local, async pipeline) — Phase 1
- ✓ Entry CRUD (create, read, update, delete) — Phase 1
- ✓ Mapbox v3 globe — Sky/Atlas/Roll surface switcher, Cosmographic Atlas design (Three.js retired) — Phase 1.5
- ✓ Day-grouped sidebar tiles with ember dot, type icons, place name — Phase 1.5
- ✓ Photo session clustering (10 min / 50 m, server-side SQL) — Phase 1.5
- ✓ Full-screen detail views: PhotoDetail, AudioDetail, MomentDetail, NoteDetail — Phase 1.5
- ✓ ⌘K command palette (Mantine Spotlight, free text + hardcoded actions) — Phase 1.5
- ✓ Time brush ribbon + facets rail — Phase 1.5
- ✓ Idle-fade, motion polish (entrance rotation, live-arrival ember pulse, crossfade) — Phase 1.5
- ✓ Cosmographic Atlas theme: Instrument Serif + Geist, film grain, ember palette — Phase 1.5
- ✓ Last.fm polling daemon (OAuth once, 10-min cron, auto-creates music entries) — Phase 2
- ✓ Syncthing photo ingest (EXIF timestamp + GPS, Memoir as context layer) — Phase 2
- ✓ Google Takeout import (Location History → moments, old photos → photos) — Phase 2
- ✓ Embeddings pipeline (nomic-embed-text via Ollama, stored in sqlite-vec at write time) — Phase 2
- ✓ transcript_model tracking, re-transcription on model change — Phase 2
- ✓ Bulk ops: merge, dedupe, batch-edit — Phase 2
- ✓ `external_id` + `source` columns on entries — Phase 2

### Active

- [ ] Foundation cleanup: MediaStore abstraction (wrap multer behind interface), nightly SQLite backup, external_id discipline audit
- [ ] Hardware checkpoint: decide dedicated server (Mac Mini / Pi / NAS) vs staying on laptop
- [ ] Terrain timeline — 3D elevation-as-time visualization of the archive
- [ ] Audio wall — chronological grid of all voice memos with inline playback
- [ ] Whisper UI — correct transcripts inline, full-text search across all transcripts
- [ ] Memory recall — natural-language queries over archive (hybrid SQL filter + embedding rank + LLM answer)
- [ ] Weekly synthesis — "your week in 3 sentences" generated from captures
- [ ] Auto-tagging + clustering — LLM proposes tags, owner confirms; tags accumulate over years
- [ ] Pattern surfacing — SQL stats + LLM narration for cross-modal insights
- [ ] Export: JSON, GPX, ZIP-of-media, Markdown digest
- [ ] Full-text search (SQLite FTS5) across transcripts, titles, bodies, tags

### Out of Scope

- Social features / multi-tenant / sharing — violates local-first identity
- Cloud sync — data lives on owner's machine; Syncthing for device-to-device only
- ORM (Prisma, TypeORM, Drizzle) — raw SQL is honest, ORMs fight schema evolution
- Postgres — no driver for this lifecycle
- Separate vector DB (Pinecone, Chroma, Qdrant) — sqlite-vec handles it in the same file
- Search service (Elastic, Meilisearch) — SQLite FTS5 is sufficient
- Message queue (BullMQ, Redis, SQS) — in-process setImmediate workers are correct
- Microservices — one process, one DB file, forever
- Native app shell (Phase 3) — deferred; Phase 2 not yet proven in production at scale; revisit at Phase 2.5 checkpoint
- ⌘K natural-language query parsing — Phase 5 only after months of real data

## Context

- **Current state:** Phase 2 shipped. Server runs on laptop via Tailscale; client is a PWA. Syncthing + Last.fm running in production. Embeddings being generated at write time. SQLite DB at `packages/server/data/memoir.db`.
- **Capture limitation:** ambient capture only works when laptop is awake and reachable on Tailscale. Native shell (Phase 3) would fix this, but the value of ambient capture needs to be proven before adding that complexity.
- **Reflection surfaces (Phase 4):** designed in the original brief but not yet built. The archive is accumulating real data; now is the right time to build the exploration layer.
- **AI surfaces (Phase 5):** embedding pipeline is complete and running. The embeddings index will be mature enough for real evaluation after a few more months of captures. Build Phase 4 first.
- **Backup / hardware:** no automated backup yet. MediaStore abstraction not done. These should land before serious hardware commitment.

## Constraints

- **Tech stack:** pnpm monorepo, NestJS 10 + better-sqlite3, React 18 + Mantine 7 + Mapbox GL v3, React 18 PWA. No new runtimes.
- **Single user:** no auth, no accounts, no multi-tenancy — ever.
- **Local inference:** all AI (Whisper, Ollama embeddings, future LLM) runs locally. No data leaves the machine.
- **Data longevity:** SQLite + filesystem. Formats readable in 10 years without Memoir installed.
- **No external services for core features:** internet is optional (OSM tile cache deferred).

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Retire Three.js → Mapbox v3 globe only | Single canvas, no renderer-swap bugs, continuous zoom matches design spec | ✓ Good |
| Raw SQL over ORM | Schema evolution via migration array; ORMs fight hand-rolled migrations | ✓ Good |
| sqlite-vec for embeddings, not separate vector DB | One file, one process, no infra tax | ✓ Good |
| In-process workers (setImmediate) over message queue | No Redis/BullMQ dep; restart-safe via DB flags | ✓ Good |
| Memoir = context layer, not Google Photos | Don't compete with Photos; wrap with richer metadata | ✓ Good |
| 10 min / 50 m photo session clustering threshold | Implicit in design mocks; tight sessions, sane default | ✓ Good |
| ⌘K v0: free text + hardcoded actions | Natural language deferred to Phase 5; ships immediately useful | ✓ Good |
| Embeddings at write time before AI surfaces | Index matures while building Phase 4; no catch-up batch needed | ✓ Good |
| Phase 3 native shell deferred | Phase 2 ambient capture needs production validation before adding complexity | — Pending |
| Hardware decision deferred to Phase 2.5 | No bottleneck yet; decide when laptop becomes the constraint | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-24 after GSD initialization (brownfield re-plan from Phase 2 complete state)*
