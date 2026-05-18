# Contributing to Memoir

## The verify loop

Before claiming any change is done — run from repo root:

```bash
pnpm verify
```

This runs in ~30-40s and covers:

| Stage | What | Catches |
|---|---|---|
| `pnpm typecheck` | `tsc --noEmit` across contract, server, desktop, mobile | Type errors, broken imports, contract drift |
| `pnpm test` | Vitest unit tests (currently: migration runner contract) | Logic bugs in pure functions |
| `pnpm e2e` | Playwright API smoke + desktop screenshot capture | Endpoints crashing, UI failing to render, uncaught console errors |

Tests run against an **ephemeral DB** at `tests/.tmp/data/`. Your dev `memoir.db` is never touched.

## Self-inspecting visual changes

After any UI work, the Playwright run produces PNGs in `tests/screenshots/`:
- `home-empty.png` — home view with no entries
- `home-seeded.png` — home view with 4 entries across all four types

Open these and compare against [docs/design/proposal.html](docs/design/proposal.html). The screenshot tests don't assert on visuals — they only confirm the page rendered without crashing. Visual judgment stays human.

## Seeding the dev DB manually

```bash
pnpm dev              # in one terminal
pnpm seed             # in another — 50 entries, last 14 days, SF Bay Area
pnpm seed -- --count 200      # custom count
pnpm seed -- --reset          # delete ONLY seeded entries (source=seed), then reseed
pnpm seed -- --clean          # delete ONLY seeded entries, don't reseed
```

All seeded entries carry `source=seed`. `--reset` and `--clean` never touch real captures (`source=native`). The dev `memoir.db` is also never touched by `pnpm verify` — tests use the ephemeral DB at `tests/.tmp/`.

## Adding a test

**For backend logic** (services, parsing, clustering): add a file to `packages/server/test/*.test.ts`. Run with `pnpm --filter @memoir/server test:watch`.

**For API contracts**: add to `tests/e2e/api-smoke.spec.ts`. Each test should clean up entries it creates.

**For visual capture**: add to `tests/e2e/desktop-screenshots.spec.ts`. Save the PNG to `tests/screenshots/<descriptive-name>.png`.

## Adding a DB migration

See [packages/server/src/db/README.md](packages/server/src/db/README.md). TL;DR: append to the `migrations` array in `migrations.ts`. Versions are monotonic, no gaps, forward-only. The vitest contract tests confirm shape after every migration.

## Branch / commit conventions

- Default branch: `develop`
- Atomic commits with short conventional-commit messages (`feat:`, `fix:`, `chore:`, `docs:`, `test:`).
- Run `pnpm verify` before each commit.

## What lives where

```
packages/
  contract/    ts-rest + Zod API contract
  server/      NestJS + SQLite + Whisper
  desktop/     React + Mantine + Mapbox (Three.js retiring per Phase B)
  mobile/      React PWA — capture surface

scripts/
  seed.ts      pnpm seed — populate dev DB

tests/
  e2e/         Playwright API + visual tests
  screenshots/ (gitignored) — visual self-inspection output
  .tmp/        (gitignored) — ephemeral test DB

docs/
  design-brief.md           the brief sent to the designer
  design/                   the designer's response (proposal.html + chat)
  implementation-plan.md    (gitignored) — Phase 1.5 plan
  roadmap.md                (gitignored) — multi-phase plan
```
