# CLAUDE.md

Read this first. It's the bootloader for any Claude session in this repo.

## What Memoir is

A **local-first personal sensory archive**. The owner (single user, always) captures small moments throughout the day on mobile — audio, photos, location-tagged moments, music context, text notes — and explores the archive on desktop as a spatial-temporal map. The point is the *texture of life*: not a curated highlight reel, not a productivity tool, not a journaling app.

**Architectural identity (load-bearing — do not propose changes to these):**

- **Local-first, single-user.** No accounts. No sharing. No cloud sync. Data lives on the owner's machine. Never propose social features, multi-tenant patterns, or anything that violates this.
- **Memoir is the context layer, not Google Photos.** Native camera + Google Photos remain primary for photo storage. Memoir wraps them with location + weather + music + transcript + the owner's reflection. Don't propose features that compete with Photos head-on.
- **Ambient is the goal, but earned.** Phase 2 adds server-side ambient signals (Last.fm music polling, Syncthing photo ingest). Native app shell deferred until ambient capture proves itself worth the privacy/complexity tax.
- **The data outlives the app.** Choose tools/formats that will still be readable in 10 years. SQLite + filesystem hit that bar. Stay there.

## Tech stack

- **Monorepo:** pnpm workspaces, 4 packages under `packages/`
- **Contract:** ts-rest + Zod (`@memoir/contract`) — shared API definition
- **Server:** NestJS 10 + better-sqlite3, ts-node in dev
- **Desktop:** React 18 + Mantine 7 + Mapbox GL v3 (Three.js retiring per Phase B)
- **Mobile:** React 18 PWA (Mantine)
- **Tooling:** Vite, Vitest, Playwright, tsx

## The verify loop (most important operational thing)

**Before claiming any change is done, from repo root:**

```bash
pnpm verify   # ~30-40s: typecheck + vitest + playwright
```

This runs:
1. `pnpm typecheck` — tsc across contract, server, desktop, mobile
2. `pnpm test` — vitest unit tests (currently: migration runner contract)
3. `pnpm e2e` — Playwright API smoke + desktop screenshot capture

Failure = iterate without bothering the user.
Pass = present to user with screenshots from `tests/screenshots/`.

Tests boot the server against an ephemeral DB at `tests/.tmp/` via `MEMOIR_DATA_DIR`. The dev DB is never touched.

For visual changes: after verify, `Read` the latest screenshot(s) and compare against the relevant slide in [docs/design/proposal.html](docs/design/proposal.html). Iterate visually before presenting.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full conventions.

## Doc map

| File | Status | Purpose |
|---|---|---|
| [CLAUDE.md](CLAUDE.md) | committed | This file — session bootloader |
| [CONTRIBUTING.md](CONTRIBUTING.md) | committed | Verify loop, test conventions, branch model |
| [README.md](README.md) | committed | Setup / running |
| [docs/design-brief.md](docs/design-brief.md) | committed | What we asked the designer |
| [docs/design/proposal.html](docs/design/proposal.html) | committed | What the designer returned (the 13-slide spec) |
| [docs/design/chats/chat1.md](docs/design/chats/chat1.md) | committed | Full back-and-forth with the designer |
| [packages/server/src/db/README.md](packages/server/src/db/README.md) | committed | Migration conventions |
| `docs/roadmap.md` | **gitignored** | Multi-phase plan |
| `docs/implementation-plan.md` | **gitignored** | Phase 1.5 sequenced work |
| `STATUS.md` | **gitignored** | Current phase + last milestone + next task |
| `.env` | gitignored | Real Mapbox token + Tailscale cert paths |

## Doc convention: committed vs. gitignored

- **Reference artifacts** (design brief, design proposal, contributing guide, DB README, README): committed. They're stable, shareable, hand-off-able.
- **Working planning docs** (roadmap, implementation plan, STATUS): gitignored. They churn every session. The user explicitly chose this split to keep git history clean.

Don't commit working docs. Don't gitignore reference artifacts. If unsure, ask.

## Branch / commit conventions

- Default branch: `develop`
- Atomic commits, short conventional-commit messages (`feat:`, `fix:`, `chore:`, `docs:`, `test:`)
- The user wants varying co-author attribution across commits — see `~/.claude/.../memory/feedback_co_author.md`. Trailer when included names the *actual running model* (not a hardcoded default). Roughly 20–65% of commits in a session get the trailer; lean toward including it on substantive Claude work, omit on mechanical/user-directed work.
- Run `pnpm verify` before each commit.

## Architectural anti-patterns (do NOT propose for this project)

The user has explicitly rejected each of these. They're listed in `~/.claude/.../memory/project_memoir_db_pattern.md` and worth repeating here so a fresh session can't accidentally suggest one:

- ❌ Postgres migration — never, no driver for it in this lifecycle
- ❌ ORM (Prisma/TypeORM/Drizzle) — raw SQL is honest, ORMs fight schema evolution
- ❌ Migration frameworks (Knex etc.) — overkill; we hand-roll in `migrations.ts`
- ❌ Separate vector DB (Pinecone/Chroma/Qdrant) — `sqlite-vec` handles it inside the same file
- ❌ Search service (Elastic/Meilisearch) — SQLite FTS5 is enough
- ❌ Message queue (BullMQ/Redis/SQS) — in-process `setImmediate` workers are fine
- ❌ Microservices — one process, one DB file, one media dir, forever
- ❌ Schema normalization for aesthetic reasons — only normalize when a real query hurts
- ❌ Native app shell *yet* — deferred until ambient capture proves itself

## Decision style (when there's a fork in the road)

Lay out the trade-offs first (table or short bullets per option). Then use `AskUserQuestion` to converge, with "Not sure — recommend something" as one of the options. When the user picks "recommend" or the question has a best answer, name something *concrete* — model, dollar cost, time estimate, specific library version. Vague advice gets rejected.

Bias recommendations toward: existing tech they already run, deferred spending, smaller code commitments, things that don't force them down a one-way door.

See `~/.claude/.../memory/feedback_decision_style.md`.

## Quick map of the codebase

```
packages/
  contract/   ts-rest + Zod (the single API truth)
  server/     NestJS server
    src/db/migrations.ts     ← add new schema here
    src/db/db.service.ts     ← migration runner + DbService
    src/entries/             ← CRUD + create-with-async-pipelines
    src/media/               ← file upload + serving (MediaStore abstraction TODO)
    src/services/            ← geocoder, weather, whisper
    src/events/              ← WS gateway for broadcast
    src/main.ts              ← bootstrap, HTTPS detection, /config.js
  desktop/    React + Mantine + Mapbox
    src/api/client.ts        ← ts-rest client + WS factory
    src/globe/               ← Three.js + StreetMap — DEATH ROW, see Phase B
    src/components/          ← Sidebar, DetailPanel, StatusBar, RecentList
  mobile/     React PWA
    src/components/          ← CaptureBar, AudioRecorder
    src/hooks/useOfflineQueue.ts

scripts/seed.ts              ← pnpm seed (populate dev DB)
tests/e2e/                   ← Playwright (API smoke + desktop screenshots)
tests/screenshots/           ← gitignored, visual self-inspection
```

## Open questions in current Phase 1.5

See `docs/implementation-plan.md` for full context. Known open calls Claude should *not* unilaterally decide:

1. Music card fallback content on Moment detail (no album art case)
2. Photo session clustering threshold (recommended: 10 min + 50 m)
3. ⌘K query language v0 (recommend: free text + a few hardcoded actions)

The Three.js retirement question is already answered (yes, retire) — see `docs/implementation-plan.md`.
