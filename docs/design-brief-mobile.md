# Memoir Mobile — Design Brief

## What we're asking for

A **complete mobile app design** for Memoir — not just the capture surface. The mobile app should do everything the desktop does, adapted for a phone screen. Capture, browse, reflect, search — all of it, on one device, in your pocket.

We are asking for **multiple wireframe candidates** (at least two distinct directions). We want to see different structural approaches before committing to one. Each candidate should cover the full app, not just one screen.

---

## Reference apps (for inspiration, not imitation)

**Google Recorder** — the gold standard for ambient audio capture on mobile. Notice: how it handles a recording in progress without getting in the way; how the transcript appears alongside the waveform; how the list of recordings is deceptively simple but scales to hundreds; how the waveform doubles as a scrubber.

**Google Photos** — the gold standard for a personal visual archive. Notice: the gravity of the grid (you feel the density of your own history); the date-grouped sticky headers; the year scrubber on the right; how a single photo takeover feels full and calm; the contextual clustering ("Tokyo · May 2026").

Memoir is neither of these. It has more data types (audio, photo, moment, note + music + weather + location), a stronger visual identity (Cosmographic Atlas palette — dark, warm, atmospheric), and a spatial/temporal dual nature that neither app attempts. But these two apps have solved capture UX and archive grid UX better than anyone. The designer should understand why they work before departing from them.

---

## What Memoir mobile needs to do

### 1. Capture (already partially designed)
The user opens the app in the field, captures something in under 10 seconds, closes it. Four types: audio, photo, moment, note. The capture bar should always be accessible — one thumb, under 2 taps, no hunting.

### 2. Browse the archive
The full archive — all entry types, all time, all locations — browsable on a phone screen. The desktop has three surfaces: Sky (globe), Atlas (day-grouped list with sidebar), Roll (photo grid). The mobile equivalent doesn't need to replicate these three labels but should cover the same browsing modes:
- **Temporal** — scroll through time, see what I captured when
- **Spatial** — where have I been, what's clustered in a place
- **Visual** — the photos, in a grid, as density

### 3. View a single entry
Full-screen takeover per the Cosmographic Atlas spec (already designed on desktop). On mobile, the four type-specific layouts (audio waveform + transcript, photo full-bleed, moment map crop, note large serif) need to adapt to portrait orientation and touch navigation (swipe left/right to flip entries).

### 4. Now playing (ambient)
The server is always polling Last.fm. Whatever is currently playing should be unobtrusively visible — it's contextual information that doesn't require interaction.

### 5. Search / ⌘K equivalent
On mobile, the command palette becomes a search sheet. Tap to open, type to find — entries, places, songs, dates.

---

## The Cosmographic Atlas design system

The mobile must feel like the same product as the desktop. The designer should work within:

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
  Display:  Instrument Serif (italic, headings, entry titles)
  UI:       Geist (body, labels, buttons)
  Metadata: JetBrains Mono (timestamps, coordinates, counts)
```

Film grain overlay at 55% opacity (mix-blend-mode: overlay) on all surfaces.

---

## The note-taking problem

Notes are the only capture type that ask the user to produce something. A plain text input box is explicitly the wrong answer — by the time a keyboard opens, the moment has passed.

The designer should propose an interaction that keeps note capture as fast as the other types. Directions to consider:

- **Constrained fragments** — not a blank canvas, but a word, a mood, a fragment. "Something about the light" is a valid note.
- **Voice-to-note** — speak it, Whisper transcribes it, transcript becomes the note body. The pipeline already exists.
- **Seeded template** — the app pre-fills location + weather + now-playing; the user adds one line.
- **Deferred** — capture a location-tagged intent now, write the body later from desktop.

The designer should pick one and design it. We are not attached to any of these.

---

## Current capture UI (what to improve)

```
┌─────────────────────────────────────┐
│ memoir · online          37.8, -122 │
├─────────────────────────────────────┤
│  [ Moment ]  [ Audio ]  [ Photo ]   │
│  35.64527, 139.39156                │
│  [ ♪ Artist - Track     ] [ Tag ]   │
├─────────────────────────────────────┤
│ RECENT                              │
│ ● 東五反田五丁目          2m        │
│ ● 道玄坂二丁目            1h        │
└─────────────────────────────────────┘
```

Problems to solve:
- No note capture path
- Raw lat/lng is noise (the user sees "35.64527, 139.39156" — meaningless)
- The music tag input is now redundant (Last.fm handles it automatically)
- Three equal buttons have no hierarchy — audio is the most expressive type and probably deserves more emphasis
- No way to access the archive from here

---

## What to return

**For each wireframe candidate** (minimum 2, ideally 3):
- Name/label for the candidate ("bottom tab", "gesture-based", "recorder-first", etc.)
- Key screens: (1) default/home, (2) browsing the archive, (3) viewing a single entry, (4) during audio recording, (5) note capture
- A one-paragraph rationale — what assumptions this direction makes about how the user moves through the app

**Across all candidates:**
- Notes on navigation model (tabs? gestures? single-screen with sheets?)
- How capture and browse coexist — is capture always available, or does it have its own mode?
- How the Cosmographic Atlas palette translates to mobile brightness and contrast
- The now-playing treatment — where does "♪ ヒッチコック — ヨルシカ" live?

**You don't need to** spec Mantine components or hand off implementation details. The engineer will translate visual direction into code.

---

## Constraints

- **React 18 + Mantine 7.** No native-only components.
- **PWA first, Capacitor later.** Same React codebase will eventually run in a native wrapper. Design for PWA; don't design around native OS patterns.
- **Portrait phone screen.** 390×844px (iPhone 14 reference). Safe area insets at top and bottom.
- **One-handed use.** Bottom of screen is thumb territory. Primary actions live below the midpoint.
- **Scales to years of data.** Any design that only looks good with 10 entries is the wrong design.
- **No accounts, no sharing, no onboarding.** Single-owner app, always already set up.
- **Offline-first.** Captures queue when offline. The UI should communicate this gracefully.

---

## Reference material

- Desktop design system in full: `docs/design/proposal.html` (13 slides — all of it is relevant context)
- Original desktop brief: `docs/design-brief.md`
- Live app at `https://chea.brown-iwato.ts.net:3000/mobile` (ask engineer for access)
