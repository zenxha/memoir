# Memoir Mobile — Design Brief

## Context

This brief covers the **mobile capture surface** only. The desktop atlas (Cosmographic Atlas design system) is already implemented — see `docs/design/proposal.html` for the full desktop spec. The mobile should feel like it belongs to the same family: same palette, same typography, but adapted for one-handed field use.

The mobile app is currently a functional PWA with unstyled Mantine components. It works; it doesn't feel like anything yet. This brief asks you to give it a feeling.

---

## What this surface does

The user opens the app in the middle of living their life — on a walk, at a café, on a train — captures something in under 10 seconds, and closes it. That is the entire use case. The mobile app is **not** a browsing or reflection surface. It is the mouth of the archive.

The only question it ever asks is: *what just happened?*

---

## The four capture types

| Type | What it is | How it works today |
|---|---|---|
| **Audio** | Voice memo — record + auto-transcribe later | Tap Audio → waveform appears + timer → tap Stop → saved |
| **Photo** | A photo from camera or roll | Tap Photo → native file picker / camera → saved |
| **Moment** | A location-tagged point, no media | Tap Moment → saved instantly with GPS + weather |
| **Note** | A text thought | Not yet surfaced in the UI — field exists in the schema, needs a capture path |

All four types share: GPS coordinates, timestamp, weather snapshot (fetched server-side), and optional music context.

---

## What the app knows automatically

Since the last design brief, ambient capture has been added:

- **Last.fm / Spotify integration** — the server polls every 10 min and imports recent scrobbles as `moment` entries. The app always knows what music was playing.
- **Now playing** — the server polls every 30s and shows a real-time "now playing" card (track + artist). This should be visible in the capture UI so the user can see what's being automatically tagged to their moment.
- **GPS** — always running while the app is open. Location accuracy shown.
- **Weather** — fetched server-side on every capture. User never inputs it.

So by the time the user taps "Moment", the app already knows: *where, when, what's playing, what the weather is.* The moment is pre-contextualised. The gesture is just confirmation.

---

## Current UI structure (what to redesign)

```
┌─────────────────────────────────────┐
│ memoir · online          37.8, -122 │  ← StatusBar
├─────────────────────────────────────┤
│  [ Moment ]  [ Audio ]  [ Photo ]   │  ← Capture buttons
│  35.64527, 139.39156                │  ← raw coords (not shown to user)
│  [ ♪ Artist - Track     ] [ Tag ]   │  ← manual music tag (now redundant)
├─────────────────────────────────────┤
│ RECENT                              │  ← last 10 entries
│ ● 東五反田五丁目          2m        │
│ ● 道玄坂二丁目            1h        │
│ ...                                 │
└─────────────────────────────────────┘
```

The music tag input (`♪ Artist - Track`) is now **redundant** — Last.fm handles it automatically. The raw lat/lng readout is internal noise the user shouldn't see. The capture buttons are functional but they don't feel like anything.

---

## What the designer is being asked to decide

### 1. The capture gesture

Today: three equal buttons in a row. There's no hierarchy, no primary action.

The question: should the dominant gesture be:
- A **large single tap zone** that captures "a moment" (the most common type), with audio and photo as secondary gestures?
- A **gesture-based switcher** (swipe between types)?
- A **mode-less capture bar** — one button that figures out the best type from context (location changed → moment, microphone held → audio)?
- Or something else entirely?

The constraint: it must work one-handed, outdoors, with GPS active.

### 2. The audio recording screen

When recording, the current screen shows: a pulsing red dot, a timer, a waveform, pause and stop buttons.

How should recording **feel**? The user is speaking or listening to ambient sound. This screen might be visible for 30 seconds or 10 minutes. It should be calm, not alarming. Consider:
- What does the waveform visualize and how?
- What does pause look like vs. stop?
- Is there any ambient information on screen (place name, now playing) or is it stripped back?
- What's the experience of the recording ending and being saved?

### 3. The now-playing integration

The server knows what's playing. This is contextual information that should be visible — but not in a way that makes the user feel like they need to interact with it. It's ambient.

Where does "♪ ヒッチコック — ヨルシカ" live on the capture screen? How does the auto-tagging of music to a moment get **confirmed** (or dismissed)? Does it just happen silently, or does the user get a brief acknowledgement?

### 4. Note-taking

Notes are the only capture type that require the user to produce something — every other type (audio, photo, moment) is a single tap. Notes ask for text.

The obvious solution — a text input box — is the wrong one. By the time the user opens a text keyboard on mobile, they're already in a different mental mode. The magic of the other capture types is that they take less than 2 seconds; a text note should feel the same.

Some directions to consider:
- **Constrained formats** — instead of a blank canvas, offer fragments: a single sentence, a word, a tag, a mood. Less friction than "write something."
- **Voice-to-note** — tap note, speak, the transcript *becomes* the note body. (The audio transcription pipeline already exists server-side via Whisper.)
- **Seeded notes** — the app knows where you are, what you're listening to, what the weather is. Does it offer a prompt or a pre-filled template rather than a blank field?
- **Deferred writing** — capture a location-tagged "note intent" immediately, then let the user fill in the body later from the desktop or a notification.

The constraint: a note should not require the user to stop walking. Whatever the interaction is, it should feel as frictionless as the other types, even if richness comes later.

The designer should pick a direction. We are not attached to the text input box.

### 5. The recent entries strip


After capturing, the user sees their last 10 entries. This is a quick sanity check ("yes, that saved") more than a browsing surface.

How much space does it deserve? What does an entry look like in this compact form — just a dot and a place name, or something richer? Should it be scrollable or fixed to show only 3-4?

### 6. The offline state

The user might be underground or out of range. Captures queue locally and sync when reconnected.

How does the app communicate:
- "you're offline, but this will save when you reconnect"
- "3 items synced" when reconnection happens
- vs. a connectivity error

### 7. Tone and visual language

The desktop uses Instrument Serif (italic, display) + Geist (UI) + JetBrains Mono (metadata), on a near-black palette with four ember type-colors (periwinkle audio, amber photo, sage moment, dusty rose note) and a warm amber "live" color.

The mobile should inherit this language but adapt it for:
- Small screen (390px wide is the target)
- Bright outdoor light — the palette might need higher contrast than the desktop
- Touch targets (minimum 44px, prefer 56px for primary actions)
- One-handed reach zones (bottom of screen is thumb territory; top is far)

---

## Constraints

- **Tech stack fixed**: React 18 + Mantine 7. No native components.
- **PWA first, Capacitor later** — the design will be implemented as a PWA and eventually wrapped in a native Capacitor shell (iOS + Android). Design for the PWA; Capacitor doesn't change the UI, only adds background capabilities.
- **No onboarding.** Single-user app, always already set up.
- **No navigation.** There is no "back" button because there are no other screens. Capture is the only screen.
- **Note type needs a capture path and a rethink.** A plain text input box is explicitly not the answer — see question 4 above. The designer should propose an interaction that keeps note capture as fast as the other types.
- **Scales to years of use.** The recent list shows 10 entries but the underlying archive may have 10,000. The design shouldn't imply this is a small tool.

---

## What to return

- A **point of view** on each of the six questions above.
- Mockups for **four states**: (1) default capture screen, (2) during audio recording, (3) note capture flow, (4) after capture (recent entries visible, now-playing visible).
- Notes on the **transition into and out of** audio recording — what animates, how the waveform appears.
- Notes on how **offline state** is communicated.
- A short rationale for the primary capture gesture decision — that's the one that shapes everything.

You don't need to spec component internals. The engineer will translate your visual direction into Mantine + CSS.

---

## Reference

- Desktop design system: `docs/design/proposal.html` — slides 1–13, especially the typography specimen (slide 04) and the Cosmographic Atlas palette (slide 03).
- The mobile currently lives at the Tailscale URL at `/mobile`. Ask the engineer for access if you need to see it live.
