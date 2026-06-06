# Phase 04 — deferred items (out-of-scope discoveries)

## desktop-screenshots.spec.ts > "page does not throw uncaught errors"
- **First seen during:** 04-04 execution (pnpm e2e final run)
- **Symptom:** `<MapCanvas>` component throws uncaught error on page load; React error boundary advice logged. Network requests to Mapbox tile endpoints fail (no MAPBOX_TOKEN in the webserver env block of `playwright.config.ts`).
- **Reproduces on base:** YES — verified at commit d0885f4 by `git stash` + `pnpm e2e -- desktop-screenshots`. Same failure occurs without any 04-04 changes applied.
- **Why deferred:** Outside scope of plan 04-04 (which adds the peaks pipeline). The fix is either to inject a placeholder MAPBOX_TOKEN into the webserver env in `playwright.config.ts`, or to wrap `<MapCanvas>` in an error boundary in `App.tsx`. Either belongs in a separate plan.
- **Not introduced by:** plan 04-04. The four files modified by 04-04 are: peaks.service.ts (new), peaks.service.test.ts (new), media.{service,controller,module}.ts (peaks wiring), tests/e2e/api-smoke.spec.ts (new test that is skipped on this machine). None of these touch MapCanvas or playwright config.
