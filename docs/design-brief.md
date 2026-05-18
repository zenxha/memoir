# Memoir — Design Brief

## What it is

Memoir is a **local-first personal sensory archive**. The owner captures small moments throughout their day — a voice memo, a photo, a music track they're hearing, or just a tagged "moment" at a location — from their phone. Later, at home, they explore those moments as a spatial-temporal map on desktop.

It is **not** a journaling app, not a social app, not a productivity tool. It's closer to a private museum of one person's ordinary days, slowly building over years. Think Apple Photos meets a field journal meets a personal Google Maps Timeline — but everything stays on the owner's own machine, and the focus is the *texture* of life, not the highlight reel.

## Who uses it

A single user (the owner). One person, on their own data, alone. No accounts, no sharing, no collaboration. The designer should imagine someone who has owned the app for two or three years and now has thousands of entries — the design must scale to that, not to a fresh empty state.

## Two surfaces

**Mobile** (PWA, used in the field, one-handed, often outdoors)
- Used for **capture only**. The user opens the app to record something and closes it immediately.
- Must work offline (queues to local storage, flushes when reconnected).
- Four capture types: **audio** (record + auto-transcribe later), **photo** (camera roll or live capture), **moment** (a tagged location-only point, optionally with a music track the user was listening to), **note** (text-only).
- Already feels functional and out of scope for this brief.

**Desktop** (lives on the user's home machine, the primary "viewing" surface)
- This is what the brief is about.
- Used for **browsing, exploring, and reflecting** on the archive.
- Sessions are open-ended: the user might spend 30 seconds checking what they captured today, or an hour wandering through last summer.
- Must feel calm, atmospheric, and personal. Not a dashboard. Not a feed.

## What an entry looks like

Every entry has:
- A **type** (audio / photo / moment / note)
- A **timestamp** (when it was captured)
- A **location** (lat/lng + accuracy, reverse-geocoded to a place name like "Mission" or "Trinity Bellwoods")
- A **weather snapshot** (temperature + condition at capture time)
- Optional **media** (audio file, photo file, waveform data)
- Optional **transcript** (auto-generated for audio entries via Whisper)
- Optional **music context** (artist + title — what was playing)
- Optional **tags** (user-added later)
- A short **title** and **body** (optional, user-added)

So each entry is a small sensory package: *when, where, what was around me, what I captured.*

## Current state of the build

The mobile capture flow works. The desktop currently has:
- A **3D globe** (Three.js) where each entry is a colored dot at its lat/lng.
- Scrolling/zooming "into" the globe past a threshold swaps to a **Mapbox street-level view** centered on whatever was under the cursor.
- A **right sidebar** with the list of entries (filterable by type via colored chips), and a small **detail panel** that pops up when you click an entry.
- Live websocket updates: when a new entry is captured on mobile, it appears on desktop immediately.

It functions, but it doesn't feel right. The owner's specific complaints:

1. **The globe is visually boring** — it's plain blue with a wireframe overlay. No atmosphere, no texture, no presence.
2. **The globe ↔ map transition is one-way.** You can zoom into the map but there's no path back to the globe.
3. **Viewing a memoir is clunky.** The detail panel feels like an afterthought. There's no good way to flip through several entries in a row, no way to "sit with" a single one.
4. **The Mapbox view is black-and-white and inert.** It's a basemap with dots on it. It should reveal density and patterns over time — the owner wants a sense of *where* their life has been clustering.
5. **There's no sorting or grouping** beyond filter-by-type. The owner wants to be able to browse by date, by place, by type, fluidly.

## Open questions for you (the designer)

These are the calls the owner explicitly wants you to make, not us:

### 1. The "hero" view — globe vs. map vs. something else

Today there are two render modes (Three.js globe + Mapbox street). Mapbox v3 has a native globe projection that would unify them into one continuous zoom — but it would lose the stylized, atmospheric look of the Three.js globe.

The question isn't just "which library" — it's **what should the user see when they open the app?** Should it be:
- A poetic, slow-rotating Earth that invites zoom-in?
- A map already focused on their most recent entry?
- A timeline-first view with map as context?
- Something else entirely?

What does opening Memoir feel like in the first 2 seconds?

### 2. The browsing metaphor — spatial, temporal, or both

How should the user actually find a memory they're thinking of?
- "The walk I took in October" → temporal
- "That café in Lisbon" → spatial
- "All the photos from last summer" → faceted

Should the primary surface be a map (with time as a slider/filter), a timeline (with map as context), or a split view with brushing between the two? Or a third pattern we haven't considered?

### 3. The detail view

The owner wants **full-screen takeover** when viewing a single memoir — that decision is locked. But within that constraint:
- How do you make an audio entry feel *different* from a photo entry from a moment entry?
- How do you let the user flip through neighbors (next entry, previous entry, nearby entries) without exiting the view?
- What's on screen besides the media itself? (transcript, weather, place, time, related entries?)
- Should the user be able to **edit** an entry from this view (add tags, write a title, jot a body)?

### 4. Density and pattern visualization

The owner wants to feel the *texture* of where their life has been. Today every entry is a single dot, equally weighted, at a single lat/lng.
- Should clusters of entries in one place become heatmap blobs at low zoom?
- Should the map *style* reflect how lived-in a region is?
- Should time be visible as color/saturation (older = faded)?
- What should "I've been to this neighborhood 47 times" look like at a glance?

### 5. Sort / filter / faceted browse

Beyond filter-by-type, the owner wants to slice the archive in multiple ways at once: date range + type + region + has-audio + tag. Today this is a row of pill buttons in the sidebar.
- Where do facets live? (Persistent rail? Collapsible drawer? Command palette?)
- What's the "default" view of the sidebar when nothing is filtered — chronological? grouped by day? grouped by place?
- How does the sidebar interact with the map view (do they brush each other)?

### 6. Tone and visual language

The owner has said the app should feel **dark, atmospheric, personal — not a productivity tool.** Mantine is the component library; the current palette is near-black backgrounds (#080808 / #0a0a0a) with a single blue accent and four type-colors (audio blue, photo orange, moment green, note purple).

What should the typography feel like? What's the role of motion (subtle ambient drift? sharp animated transitions? neither)? Does the UI fade away when the user isn't interacting with it, leaving just the map?

## Constraints to design within

- **Tech-locked**: React 18 + Mantine 7 + Mapbox GL v3 (and/or Three.js r128). No swapping the stack.
- **Desktop-only for this brief.** Mobile capture UI is settled.
- **No login, no avatars, no "you" in copy.** Single-owner app — there is no "share" button anywhere.
- **Local-first.** All data lives on the owner's machine. No cloud sync, no analytics, no server-side intelligence beyond the optional Whisper transcription run locally.
- **Scales to thousands of entries.** A design that only looks good with 12 entries on screen is the wrong design.
- **Live updates matter.** When a new entry arrives mid-session (from mobile), it should appear gracefully — not jarring, but visible.

## Out of scope for this brief

- Mobile capture UI (settled).
- Onboarding / first-run experience.
- Any export, sharing, or publishing flows.
- Admin/settings screens.
- Anything related to importing from external services (Google Takeout etc. is Phase 2, design later).

## What to return

The owner wants from you:
- A point of view on each of the **six open questions** above.
- Wireframes or mockups for the **three primary screens**: (1) the default/home view, (2) browsing/sorting the archive, (3) viewing a single entry full-screen.
- Notes on motion, transitions, and what idle/ambient state looks like.
- A short rationale for the calls you made — especially the hero-view and browsing-metaphor decisions, since those shape everything downstream.

You don't need to spec components or hand off implementation details. The engineer will translate your visual direction into Mantine components and Mapbox layers.
