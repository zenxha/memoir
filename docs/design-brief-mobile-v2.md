# Memoir Mobile — Design Brief v2

*Supersedes `design-brief-mobile.md`. Written after Phase 2 shipped (May 2026).*

---

## What's changed since v1

The first brief was written speculatively. Phase 2 is now live and running:

- **Last.fm scrobbling is real.** The server polls every 10 minutes and auto-creates music entries. Whatever is playing right now is a live signal — not a future feature.
- **Syncthing photo ingest is real.** Photos flow from Android to the server automatically, tagged with EXIF GPS and timestamp. The archive is filling up without the user doing anything.
- **The desktop Cosmographic Atlas design shipped.** Sky (globe) · Atlas (day-grouped list) · Roll (photo grid) are real screens. See `docs/design/proposal.html` for the full 13-slide spec — this is the reference.
- **The archive has depth now.** It's not 10 test entries. There are months of audio recordings, photos, moments, scrobbled music, and location pings. Any design that only works at shallow scale is wrong.

---

## What we're asking for

The same ask as v1: **multiple wireframe candidates** (minimum 2, ideally 3) for a complete mobile app. Each candidate should be a different structural direction — not variations of the same layout.

The five screens we need per candidate:
1. **Home / default state** — what the user sees when they open the app
2. **Browsing the archive** — temporal, spatial, and visual modes
3. **Viewing a single entry** — full-screen, portrait, all four types (audio, photo, moment, note)
4. **Audio recording in progress**
5. **Note capture**

---

## The six requirements (what the engineer needs)

These are hard requirements, not suggestions. The designer's job is to find a way to satisfy all six that feels like Memoir.

### 1. Browse the full archive from mobile

The app must offer three ways to look at the archive:

- **Temporal** — scroll through time. Day headers, grouped entries, sticky dates. Feels like a feed of your own past.
- **Spatial** — a map. Where have I been? What's clustered in a place? Tap a cluster to see what's there.
- **Visual** — the photos, in a grid, dense. Session-grouped (same place, same 10 minutes) like the desktop Roll surface.

These don't need to be three separate tabs. They could be a single surface with a mode toggle, or emergent from scrolling, or something else. What matters is that all three are reachable in under 2 taps from anywhere.

The archive scales to years. The temporal scroll must work with 3,000 entries. Day headers must stick. Year jumping must be possible without dragging a thumb across the whole timeline.

### 2. Full-screen entry view, portrait

When the user opens an entry, it takes over the screen. The desktop has four type-specific layouts:

- **Audio** — large waveform + scrolling transcript, play head prominent
- **Photo** — full-bleed image, minimal metadata in the corners, session filmstrip at bottom
- **Moment** — map crop (zoomed to the entry's location), music card overlaid
- **Note** — large italic serif body, place + weather footer

On mobile these need to work in portrait orientation. Swipe left/right navigates to adjacent entries (same order as the browse view the user came from). The back gesture closes back to where they were.

The designer doesn't need to figure out Mantine component mapping — that's the engineer's job. What we need: the visual composition for each type, the proportions, what's prominent vs. relegated to metadata, where the controls live.

### 3. Note capture that doesn't open a keyboard

Notes are the only type that ask the user to produce something. A blank text field is the wrong answer — by the time the keyboard opens and the user figures out what to type, the moment has passed.

The designer should commit to one approach and design it properly:

- **Voice-to-note** — tap once, speak, Whisper transcribes it. The transcription pipeline already exists on the server. This is the path of least resistance for capture speed.
- **Fragment input** — a constrained text surface (one or two lines, pre-filled with location + now-playing, user adds a word or phrase). Not a blank page.
- **Seeded template** — app pre-fills: "Near [place] · [weather] · listening to [track]" — user changes one thing or adds nothing and saves.

Pick one. Don't hedge across all three.

### 4. Place name, not coordinates

The capture bar currently shows raw lat/lng ("35.64527, 139.39156"). The server already reverse-geocodes every entry — the place name is always available within a few seconds of capture. The capture surface should show the resolved place name ("Shibuya, Tokyo" or "Dolores Park" or "home"). Raw coordinates should never be visible to the user.

During the brief moment before geocoding resolves, the placeholder can be "finding location…" or a subtle animation — not the coordinates.

### 5. Now Playing — passive, always present

Last.fm is polling constantly. Whatever is currently scrobbling should be visible somewhere on the home surface without the user doing anything. It's contextual signal — "this entry happened while I was listening to this" — not an action item.

The current desktop treatment shows a small music card in the MomentDetail view. On mobile, it needs a home. It shouldn't dominate (it's ambient, not primary), but it should always be there when something is playing.

The now-playing element also appears on captured moments automatically (the server links it at creation time). How it looks in a moment entry vs. how it looks as ambient context on the home screen may be different things.

### 6. Search sheet

On desktop, ⌘K opens a command palette. On mobile, the equivalent is a bottom sheet that opens on tap. The user types a query, sees results — entries, places, track names, dates. A result tap opens the entry full-screen.

In v1 this is free-text search (FTS5 across title, body, transcript, tags). The designer doesn't need to design the search algorithm — just the surface: how it opens, what results look like, how the user dismisses it and gets back.

The search trigger should be reachable from anywhere — not buried in a specific tab.

---

## What the current app looks like

```
┌─────────────────────────────────────┐
│ memoir · online          37.8, -122 │  ← raw coordinates (bad)
├─────────────────────────────────────┤
│  [ Moment ]  [ Audio ]  [ Photo ]   │  ← no hierarchy, no Note
│  35.64527, 139.39156                │  ← still coordinates
│  [ ♪ Artist - Track     ] [ Tag ]   │  ← redundant (Last.fm handles this)
├─────────────────────────────────────┤
│ RECENT                              │  ← 5 entries, no browsing, no access
│ ● 東五反田五丁目          2m        │    to the full archive
│ ● 道玄坂二丁目            1h        │
└─────────────────────────────────────┘
```

Problems (all of which the v2 design should solve):
- No note capture path
- Raw lat/lng everywhere
- Music tag input is redundant — Last.fm populates this automatically; the manual input field is vestigial
- Three equal capture buttons have no hierarchy — audio is the most expressive capture type
- The "recent" list shows ~5 entries with no way to get to the full archive
- No Now Playing treatment
- No search

---

## The Cosmographic Atlas design system

The mobile must feel like the same product as the desktop. Same palette, same type, same grain.

```
Palette:
  --ink-000: #07060a    deep space / screen background
  --ink-050: #0c0a10    page background
  --ink-100: #131119    surface
  --ink-300: #2a2632    border
  --paper-900: #f3ece0  warm parchment / primary text
  --paper-500: #8a8377  secondary text
  --paper-400: #6a6358  tertiary / metadata

Entry type colors (ember):
  audio:  oklch(72% 0.13 250)  periwinkle
  photo:  oklch(78% 0.13 55)   amber
  moment: oklch(74% 0.10 145)  sage
  note:   oklch(74% 0.10 15)   dusty rose
  live:   oklch(76% 0.16 35)   ember / now-playing

Typography:
  Display:  Instrument Serif — italic, headings, entry titles
  UI:       Geist — body text, labels, buttons
  Metadata: JetBrains Mono — timestamps, coordinates, counts
```

Film grain overlay at 55% opacity (`mix-blend-mode: overlay`) on all surfaces.

The OLED/dark palette means the mobile screen doesn't blast light in a dark room — that's intentional and should be preserved. Don't lighten the palette for "mobile readability." The contrast is already calibrated.

---

## Reference material

- **Desktop design in full:** `docs/design/proposal.html` (13 slides — all relevant context for the visual system)
- **Original desktop design brief:** `docs/design-brief.md`
- **Original mobile brief (v1):** `docs/design-brief-mobile.md`
- **Live desktop app:** `https://chea.brown-iwato.ts.net:3000/desktop`
- **Live mobile app (current state):** `https://chea.brown-iwato.ts.net:3000/mobile`

---

## Constraints

- **React 18 + Mantine 7.** No native-only components or gestures that can't be replicated in a PWA.
- **PWA first, Capacitor later.** Same React codebase will eventually run in a native wrapper. Design for PWA; don't design around iOS/Android OS chrome.
- **Portrait phone screen.** 390×844px (iPhone 14 reference). Safe area insets at top (status bar) and bottom (home indicator).
- **One-handed use.** Bottom of screen is primary thumb territory. Capture — the most frequent action — must be reachable with a thumb without shifting grip.
- **Scales to years of data.** Any design that only looks good with 10 entries is wrong. Test your layout assumptions with 500 entries and 3 years of dates.
- **No accounts, no sharing, no onboarding.** Single-owner app. The user is always already logged in. There is no empty state in the archive (there's always at least one entry).
- **Offline-first.** Captures queue when the server is unreachable. The UI should communicate sync state gracefully — not with an error, but with a quiet indicator that resolves itself.

---

## What to return

**For each wireframe candidate:**
- A short name/label ("recorder-first", "bottom-tabs", "single-sheet", etc.)
- The five screens listed above
- One paragraph explaining what structural assumption the candidate makes — what does it get right that the others don't?

**Across all candidates:**
- Navigation model: how does the user move between capture, browse, and single entry?
- Is capture always available, or does it have its own mode?
- Where does Now Playing live on the home screen?
- How do the three archive modes (temporal, spatial, visual) relate to each other?

**You don't need to spec Mantine components** or hand off pixel-perfect measurements. Visual direction, proportions, and interaction model are what matters. The engineer translates to code.
