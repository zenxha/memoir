# Testing Patterns

**Analysis Date:** 2026-05-24

## Test Framework

**Unit Runner:**
- Vitest 2.1.9
- Config: `packages/server/vitest.config.ts`
- Globals enabled (`globals: true`) — `describe`, `it`, `expect`, `beforeEach`, `afterEach` available without import in theory, but the test file imports them explicitly
- Pool: `forks` (subprocess isolation for SQLite file handles)
- Environment: `node`

**E2E Runner:**
- Playwright 1.60.0
- Config: `playwright.config.ts` (repo root)
- Browser: Chromium only, viewport 1440×900
- Workers: 1 (serial execution — server boots once per run)
- Timeout: 30s per test, 10s per action

**Assertion Library:**
- Vitest built-in `expect` (Jest-compatible API)
- Playwright built-in `expect` with web-specific matchers

**Run Commands:**
```bash
pnpm verify                          # Full gate: typecheck + unit + e2e (~30-40s)
pnpm test                            # All vitest unit tests across packages
pnpm --filter @memoir/server test    # Server unit tests only (vitest run)
pnpm --filter @memoir/server test:watch  # Watch mode for TDD
pnpm e2e                             # Playwright E2E (boots server + desktop)
pnpm typecheck                       # tsc --noEmit across all packages
```

## Test File Organization

**Unit tests location:**
- Separate `test/` directory: `packages/server/test/*.test.ts`
- Vitest also scans `src/**/*.test.ts` per config, but none exist yet
- Currently one test file: `packages/server/test/migrations.test.ts`

**E2E tests location:**
- `tests/e2e/*.spec.ts` at repo root
- Currently two spec files:
  - `tests/e2e/api-smoke.spec.ts` — API contract verification
  - `tests/e2e/desktop-screenshots.spec.ts` — visual capture

**Test output:**
- Screenshots: `tests/screenshots/` (gitignored) — written by Playwright
- Ephemeral DB: `tests/.tmp/data/` (gitignored) — wiped between runs via `MEMOIR_DATA_DIR` env

**Naming:**
- Unit files: `<subject>.test.ts` (e.g., `migrations.test.ts`)
- E2E files: `<subject>.spec.ts` (e.g., `api-smoke.spec.ts`)

## Test Structure

**Unit suite organization:**
```typescript
// Block comment describing the contract being tested
describe('db/migrations', () => {
  it('applies all migrations on a fresh DB', () => { ... });
  it('is idempotent — second run applies nothing', () => { ... });
  it('creates the entries table with all required columns', () => { ... });
  it('creates expected indexes', () => { ... });
  it('migration versions are monotonic with no gaps', () => { ... });
});
```

**Setup/Teardown:**
```typescript
let tmpDir: string;
let dbPath: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memoir-mig-'));
  dbPath = path.join(tmpDir, 'test.db');
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
```
- Each unit test gets a fresh temp directory with a fresh SQLite file
- Teardown removes the temp dir unconditionally (no leaks)
- `db.close()` called explicitly at end of each `it` block that opens a DB connection

**E2E suite organization (Playwright):**
```typescript
test.describe('@memoir/server — entries API contract', () => {
  test('GET /api/entries returns an array (empty on fresh DB)', async ({ request }) => { ... });
  test('POST → GET → PATCH → DELETE lifecycle works', async ({ request }) => { ... });
});
```

**Visual test pattern:**
```typescript
test.beforeAll(() => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

test('home view renders with seeded entries', async ({ page, request }) => {
  // Seed entries via API
  // Navigate to page
  // Wait for render
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'home-seeded.png') });
  // No visual assertion — judgment stays human
});
```

## Mocking

**Framework:** None — no `vi.mock`, no sinon, no test doubles detected.

**Strategy:** Real implementations are used throughout:
- Unit tests: real `better-sqlite3` against a temp file DB — no in-memory mock
- E2E tests: real NestJS server against ephemeral DB (`tests/.tmp/data/`) — no stubs
- External HTTP calls (geocoder, weather, Ollama, Last.fm) are NOT mocked in tests — they either succeed or return `null` gracefully

**What this means:**
- E2E tests that create entries will trigger real geocoding/weather calls if the services are reachable (Nominatim, Open-Meteo are free/public — no key required in test env)
- Ollama/Whisper/Last.fm are opt-in via env vars and silently disabled when not configured — no test interference

**What NOT to mock:**
- The DB — use temp file DBs, never in-memory mocks; real SQLite behavior is the contract
- The migration runner — it must be tested against real SQLite WAL/pragma behavior

## Fixtures and Factories

**Test data in unit tests:**
- No factories or fixture files — data is constructed inline in each `it` block
- The migration test validates schema shape by querying `PRAGMA table_info(entries)` and `sqlite_master` — no data insertion needed

**Test data in E2E tests:**
```typescript
// Inline seed via API POST
const seeds = [
  { type: 'audio', lat: 37.7749, lng: -122.4194, accuracy: 10 },
  { type: 'photo', lat: 37.7693, lng: -122.4824, accuracy: 8 },
  { type: 'moment', lat: 37.8044, lng: -122.2712, accuracy: 12 },
  { type: 'note', lat: 37.7858, lng: -122.4065, accuracy: 6, body: 'a thought' },
];
```

**Cleanup pattern (E2E):**
- Every test that creates entries deletes them at the end: `await request.delete(\`${API}/api/entries/${id}\`)`
- The ephemeral DB is wiped between full `pnpm e2e` runs; cleanup within a run prevents cross-test pollution

**Dev seed script (not tests):**
- `scripts/seed.ts` — run via `pnpm seed`; populates dev DB with 50 entries over 14 days
- `--reset` flag deletes only `source=seed` entries; never touches `source=native`

**Location:** No shared fixture directory — all test data is inline.

## Coverage

**Requirements:** None enforced — no coverage threshold configured.

**Coverage tool:** `@vitest/coverage-v8` installed as devDependency but no coverage script in `package.json`.

**View Coverage:**
```bash
pnpm --filter @memoir/server exec vitest run --coverage
```

**Current coverage:** Only `packages/server/src/db/migrations.ts` and the migration runner logic are covered. No coverage of services, controllers, or frontend code.

## Test Types

**Unit Tests (`packages/server/test/`):**
- Scope: Pure server-side logic that can be exercised without HTTP — currently only the migration runner
- Pattern: Fresh SQLite DB per test, real DB driver, no mocks
- Add new unit tests here for: clustering logic (`findSessions`), embedding logic, bulk operations, any new pure service functions

**Integration / API Contract Tests (`tests/e2e/api-smoke.spec.ts`):**
- Scope: Full HTTP round-trips through the real NestJS server against an ephemeral DB
- Tests each endpoint: GET list, POST create, GET by ID, PATCH update, DELETE, filter by type
- Each test is self-contained: creates and deletes its own data
- Runs via Playwright's `request` fixture (no browser needed for API tests)

**Visual / Smoke Tests (`tests/e2e/desktop-screenshots.spec.ts`):**
- Scope: Does the desktop UI render without crashing?
- Does NOT assert on visual appearance — screenshots are for human review against `docs/design/proposal.html`
- Asserts only: page loads without uncaught JS errors (filtering expected Mapbox token warnings)
- Screenshots saved to `tests/screenshots/home-empty.png`, `tests/screenshots/home-seeded.png`

**E2E Tests:**
- Framework: Playwright
- Both API smoke and visual tests run in the same `pnpm e2e` command
- Server and desktop Vite dev server both boot for the E2E run (via `webServer` config)

## Common Patterns

**Async Testing (Playwright):**
```typescript
test('POST → GET → PATCH → DELETE lifecycle works', async ({ request }) => {
  const create = await request.post(`${API}/api/entries`, {
    data: { type: 'moment', lat: 37.7749, lng: -122.4194, accuracy: 10 },
  });
  expect(create.status()).toBe(201);
  const entry = await create.json();
  // ... further assertions
  await request.delete(`${API}/api/entries/${entry.id}`); // cleanup
});
```

**SQLite Schema Assertion (Vitest):**
```typescript
const cols = db
  .prepare("PRAGMA table_info(entries)")
  .all() as { name: string }[];
const colNames = cols.map(c => c.name);
expect(colNames).toContain('transcript_model');
```

**Idempotency Testing:**
```typescript
it('is idempotent — second run applies nothing', () => {
  const db = new Database(dbPath);
  runMigrations(db);
  const applied = runMigrations(db); // second call
  expect(applied).toBe(0);
  db.close();
});
```

**Page Error Assertion (Playwright):**
```typescript
const errors: string[] = [];
page.on('pageerror', (err) => errors.push(err.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
await page.goto('/');
await page.waitForTimeout(2000);
const real = errors.filter(
  e => !e.includes('mapbox') && !e.includes('Mapbox') && !e.includes('access token')
);
expect(real).toEqual([]);
```

## Adding New Tests

**New backend logic** (services, parsing, clustering):
- Add file to `packages/server/test/*.test.ts`
- Use `new Database(dbPath)` with the `beforeEach` temp-dir pattern
- Run in isolation with `pnpm --filter @memoir/server test:watch`

**New API contract coverage:**
- Add `test(...)` block inside `tests/e2e/api-smoke.spec.ts`
- Clean up any created entries at end of test

**New visual capture:**
- Add `test(...)` block inside `tests/e2e/desktop-screenshots.spec.ts`
- Save screenshot to `tests/screenshots/<descriptive-name>.png`
- Do NOT add visual assertions — screenshots are for human review only

---

*Testing analysis: 2026-05-24*
