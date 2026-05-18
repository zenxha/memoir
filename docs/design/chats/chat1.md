# Image titles purpose

_Started 2026-05-18 04:22 UTC_

---

## User

<system-info comment="Only acknowledge these if relevant">
Project title is now "memoir"
Current date is now May 18, 2026
</system-info>

<default aesthetic>
If no references, art direction or design systems were provided, use this default professional modern, minimal aesthetic as a base. Declare your choice out loud so you stick to it. Guidance:
- Choose a type pairing from web-safe set or Google Fonts. Helvetica is a good choice. Avoid hard-to-read or overly stylized fonts. Use 1-3 fonts only.
- Foreground and background: choose a color tone (warm, cool, neutral, something in-between). Use subtly-toned whites and blacks; avoid saturations above 0.02 for whites.
- Accents: choose 0-2 additional accent colors using oklch. All accents should share same chroma and lightness; vary hue.
- NEVER write out an SVG yourself that's more complicated than a square, circle, diamond, etc.
- For imagery, never hand-draw SVGs; use subtly-striped SVG placeholders instead with monospace explainers for what should be dropped there (e.g. “product shot”)

CRITICAL: ignore default aesthetic entirely if given other aesthetic instructions like reference images, design systems or guidance, or if there are files in the project already.
</default aesthetic>

<attached_files>
- uploads/design-brief.md
</attached_files>

<!-- The user explicitly selected the following skills for this project, as attachments to their message. These are not optional context — they define how you work. Use them. -->
<attached-skill name="Frontend design">
Use this guidance when designing frontend/UI work that is NOT governed by an existing brand or design system. Create distinctive HTML with exceptional attention to aesthetic details and creative choices.

### Design Thinking

Before coding, understand the context and commit to a BOLD aesthetic direction:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc. Use these for inspiration but design one that is true to the aesthetic direction.
- **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?

Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work — the key is intentionality, not intensity.

### Aesthetics Guidelines

- **Typography**: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt for distinctive, characterful choices. Pair a distinctive display font with a refined body font.
- **Color & Theme**: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.
- **Motion**: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Focus on high-impact moments: one well-orchestrated page load with staggered reveals creates more delight than scattered micro-interactions.
- **Spatial Composition**: Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space OR controlled density.
- **Backgrounds & Visual Details**: Create atmosphere and depth rather than defaulting to solid colors. Gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, grain overlays.

Vary between light and dark themes, different fonts, different aesthetics. NEVER converge on the same choices across generations.

Match implementation complexity to the aesthetic vision. Maximalist designs need elaborate animations and effects. Minimalist designs need restraint, precision, and careful attention to spacing and subtle details.
</attached-skill>


<system-reminder>Auto-injected reminder (ignore if not relevant): do not recreate copyrighted or branded UI unless the user's email domain matches that company. Create original designs instead.</system-reminder>

## Assistant

_[tool: read_file]_

_[tool: update_todos]_

I've read the brief carefully. This is meaty, opinionated work — I'll commit to a strong POV rather than ask a bunch of questions back. Let me lay out my direction up front, then build.

**Aesthetic direction — "Cosmographic Atlas":** a dark, warm-black field journal that opens onto a celestial map of the owner's life. Typography pairs **Instrument Serif** (display / titles, the romantic editorial note) with **Geist** (UI) and **JetBrains Mono** (coordinates, timestamps — the field-journal data layer). Four luminous "ember" colors mark entry types against deep ink. Motion is slow, breathing, ambient — UI fades when idle, leaving only the map.

**My POV on the six questions** (full rationale will live in the deck):
1. **Hero**: Keep the Three.js globe but make it the home state of *one continuous Mapbox v3 globe→street zoom*. You always know how to get back to the sky.
2. **Browsing**: Spatial primary, temporal always-on. A persistent timeline ribbon at the bottom brushes the map.
3. **Detail**: Full-screen takeover with type-specific compositions (photo full-bleed, audio = waveform + reading transcript, moment = cartographic crop + music, note = typographic). Arrow keys flip neighbors with crossfade.
4. **Density**: Heatmap fog at low zoom; recent entries glow warmer, older fade cool; frequented places get a soft halo.
5. **Facets**: ⌘K command palette for power slicing + a quiet left-edge rail. Sidebar default = grouped by day.
6. **Tone**: Library-quiet. UI auto-fades after 4s idle.

Let me build the proposal deck.

_[tool: copy_starter_component]_

_[tool: write_file]_

Now I'll write the main deck. I'll do static HTML inside `<deck-stage>` so the user can direct-edit text.

_[tool: show_html]_

Let me check the first 4 slides before building the screen mocks.

_[tool: show_html]_

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: view_image]_

Cover looks beautiful. Let me check the other slides.

_[tool: view_image]_

The thesis statement is too large — it's overlapping the signoff. Let me check the rest.

_[tool: view_image]_

_[tool: str_replace_edit]_

I need to fix several layout issues. Let me fix them:

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: show_html]_

The iframe may need a reload. Let me force it.

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: str_replace_edit]_

_[tool: grep]_

_[tool: grep]_

_[tool: grep]_

_[tool: grep]_

_[tool: list_files]_

_[tool: grep]_

The filename changed (em dash → hyphen). Let me work with the correct filename.

_[tool: read_file]_

_[tool: show_html]_

_[tool: save_screenshot]_

## Assistant

_[tool: view_image]_

_[tool: eval_js]_

The margin-top isn't taking. Let me debug:

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: grep]_

_[tool: eval_js]_

_[tool: str_replace_edit]_

The thumbnail rail takes 188px of the slide width, breaking my layouts. Let me hide it.

_[tool: grep]_

_[tool: grep]_

_[tool: grep]_

_[tool: str_replace_edit]_

There's a `no-rail` attribute. Let me use that.

_[tool: str_replace_edit]_

_[tool: show_html]_

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: view_image]_

Gap is 70px — the screenshot is just a rendering artifact from html-to-image re-wrapping text. Live layout is fine. Let me check slide 4.

_[tool: str_replace_edit]_

Slide 4 looks great. Small fix — the swatch dots overlap with the type names. Then I'll add the Home slide.

_[tool: str_replace_edit]_

Now adding the Home (globe) slide.

_[tool: show_html]_

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: get_webview_logs]_

_[tool: eval_js]_

_[tool: str_replace_edit]_

`.home`'s `position: relative` is overriding `.screen`'s `position: absolute; inset: 0`. Let me fix.

_[tool: show_html]_

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: str_replace_edit]_

Working! Several layout issues to fix: continents floating outside the globe, text wrapping in chrome elements, slide-tag wrapping, today bar wrap.

_[tool: str_replace_edit]_

Now let me hide the slide-tag/deck-mark when the slide has a `.screen` mock — they conflict with the timeline.

_[tool: grep]_

_[tool: grep]_

_[tool: show_html]_

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: eval_js]_

_[tool: str_replace_edit]_

Let me fix the continents clipping issue with a more reliable mask:

_[tool: str_replace_edit]_

Now adding Browse + Detail + Motion + Closing slides:

_[tool: show_html]_

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: view_image]_

_[tool: view_image]_

_[tool: view_image]_

_[tool: view_image]_

_[tool: view_image]_

_[tool: view_image]_

_[tool: str_replace_edit]_

Let me fix the detail-screen layout issues in small batches.

_[tool: str_replace_edit]_

_[tool: grep]_

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: show_html]_

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: view_image]_

_[tool: view_image]_

_[tool: view_image]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: show_html]_

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: str_replace_edit]_

The continents bleed despite all my mask attempts. Let me just remove them and rely on the grid + dots:

_[tool: view_image]_

_[tool: str_replace_edit]_

Browse looks great. Header text overlaps - let me fix.

_[tool: show_html]_

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: view_image]_

_[tool: str_replace_edit]_

_[tool: view_image]_

_[tool: view_image]_

Let me check the rest of the slides quickly.

_[tool: show_html]_

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: view_image]_

_[tool: view_image]_

_[tool: delete_file]_

Let me clean up the screenshot folder and finalize.

_[tool: update_todos]_

_[tool: done]_

_[tool: str_replace_edit]_

Let me fix the timeline overflow and the cover overlap:

_[tool: done]_

_[tool: grep]_

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: str_replace_edit]_

Found it — `box-sizing: content-box` (default) means height:132 + padding=166. Adding `box-sizing: border-box` globally to fix this and similar issues.

_[tool: done]_

_[tool: fork_verifier_agent]_

Remaining findings are false positives (transcript spans flow inline naturally; cover footer metadata is intentionally small mono). The deck is in good shape.Done. Here's what I delivered:

**Memoir — Design Proposal** · 11 slides

The direction I committed to is **"Cosmographic Atlas"** — an editorial, dark, library-quiet take on a private sensory archive. The deck makes the six open calls explicitly and then shows what they look like in practice.

The structure:
1. **Cover** · "Memoir / a quiet atlas of ordinary days"
2. **Thesis** · celestial at rest, cartographic when you lean in
3. **Six calls, made** · my position on each open question
4. **Design system** · Instrument Serif / Geist / JetBrains Mono · four ember type-colors
5. **Home — the sky** · slow-rotating globe, today bar, recent sidebar, timeline ribbon
6. **Browse — the atlas** · Mission/Castro view with heatmap fog, day-grouped sidebar, live-arrival banner
7–10. **Detail — photo / audio / moment / note** · four type-specific full-screen compositions
11. **Motion · idle** · how it breathes, eight cells

A couple of things to note as you review:
- The screenshot tool occasionally re-renders text wrap differently than the live page (the thesis slide is the clearest case) — the live render at 1920×1080 is correct.
- Photo entries use a striped placeholder labeled `[ photo · … ]` rather than fabricated imagery, since drawing convincing photographs as SVG would be slop. Drop real photos in those frames when iterating.
- Speaker notes are not included — happy to add a script if you want to walk a stakeholder through the deck.

## User

im wondering why we have titles for images. is the end goal not photo data parity with the google photos library?

## Assistant

_[tool: snip]_

You're right to push on this — it's the strongest part of the critique.

The brief says title and body are *optional, user-added*. Most entries — especially photos — won't have one, ever. The owner snapped a photo of wet eucalyptus; they didn't write "Eucalyptus, still wet" afterward. So putting a literary title slot at the top of every photo detail view does two bad things:

1. It implies the user *should* author one, which turns capture-and-forget into a chore.
2. It steals the spotlight from the photo, which (as you said) is the whole point.

What I should be doing for a photo entry is:

- **Photo at 100% bleed.** No frame, no inset. The image is the slide.
- **Metadata as ambient marginalia.** Place / time / weather in small mono at the corners, fading after ~4s idle along with the rest of chrome. No "title" field shown unless one exists; even then, it's a quiet caption near the bottom, not a 30px italic serif headline.
- **The serif title treatment stays where it earns its keep:** audio (no visual content — the line has to do the work), notes (the text *is* the entry), and moment (the place name *is* the meaning).

The current mock used "Mission · 20th & Valencia" as the big italic — that's the place, not a title — but it still reads as a title because of the treatment, and that's misleading about what the field is.

Want me to rework slide 7 with the photo full-bleed and metadata pulled in tight? I'd keep the photo / audio / moment / note set asymmetric on purpose — only the entries that need words get words.

## User

i mean if we are to have many photos, does it really make sense to put each one as an entry in the sidebar? its hard to ontologize every single data point nicely but not everything needs to be everywhere. lets discuss

## Assistant

Yeah, I think this is the real insight and it punctures something I was treating too symmetrically.

Look at the four types honestly:

| | What it is | How often | Intentional? |
|---|---|---|---|
| **Audio** | "I stopped and recorded this" | rare | yes — a deliberate act |
| **Moment** | "I'm marking that I was here" | rare | yes — a deliberate act |
| **Note** | "I wrote something down" | rare | yes — a deliberate act |
| **Photo** | "I took a picture" | constant | not really — a *capture* |

Three of these are **deliberate marks**. Photos are **ambient texture**. Treating them as peers in the same chronological list — one tile per shot — is the bug. It floods the spine of the archive with the lowest-meaning items.

The reframe I'd propose:

**Two strata, not four types.**
- **The spine** — audio / moment / note. Sparse. Each one is its own tile in the sidebar, gets its own detail view, gets a serif title slot because the owner explicitly *chose* this moment. Maybe 1–10 per day.
- **The roll** — photos. Dense. Doesn't appear in the spine as individual frames. Collapses into **sessions** (a burst of N photos at one place over a short window) — *that* is the sidebar unit, if photos appear in the sidebar at all.

Where photos actually live:
- **On the map**, full fidelity — every shot is a dot, because dots are cheap and the density *is* the point of the map.
- **In a sidebar session tile**, collapsed: "Dolores Park · 14:08 → 14:14 · 12 frames" with a hero thumb.
- **Contextually**, attached to nearby spine entries: when you're viewing the audio you recorded at 14:22, the 12 photos you took 14 minutes earlier appear as a film strip in the "neighbors" rail, not as 12 separate sidebar items.
- **As a dedicated "roll" surface** — a separate browse mode that's *just* photos, grid-of-grids by day, the way you'd actually look for "that café I photographed last fall."

The detail view for a photo session is different too: it's a film strip you flip through, not 12 full-screen takeovers in a row.

This also fixes a related thing: **density visualization stops needing to fight the sidebar.** The map shows where the *life* has been (mostly photos); the sidebar shows what the owner *chose* to remember (the spine). They tell different stories on purpose.

A couple of things I want your read on before I rework anything:

1. **Sessions** — do you want them auto-grouped (time + place clustering, no user effort), or do you want the user to be able to merge/split them manually? Auto-only is simpler; manual gives more agency.
2. **The roll surface** — should it be a *third* primary view (Sky / Atlas / Roll) or just a filter mode on top of the atlas?
3. **Notes** — should I check the same question for notes? A "note" might also be high-frequency (sticky-thought app territory) or it might be rare (one-a-week journal territory). The brief doesn't say.

## User

i think a flexible design is nice. we can change things later depending on user feedback. we can have auto grouping for now, like how gphotos does it.

can u clarify what u mean by the roll surface?

## Assistant

"The roll" = a third primary surface, dedicated to photos. Think Apple Photos library / Google Photos main view — but living alongside, not replacing, the globe and the map.

The mental model:

| Surface | Primary axis | What you use it for |
|---|---|---|
| **Sky** (globe) | place, zoomed way out | "show me my life" |
| **Atlas** (map + sidebar) | place + time, sparse | "the walk I took in October" — finding deliberate moments |
| **Roll** | time, visual-first | "that café I photographed last fall" — finding a *picture* |

The reason it earns its own surface (rather than being "atlas with the photo filter on") is that **how you find a photo is different from how you find a voicemail**:

- A voicemail you find by remembering when or where you made it → map + timeline.
- A photo you find by *scanning until your eye recognizes it* → a dense grid you scroll through.

So the Roll is something like:
- **Edge-to-edge grid of square thumbs**, very tight, low chrome.
- **Date headers**: "Sun · May 18" / "Sat · May 17" etc. — sticky.
- **Sessions appear as stacked tiles** (auto-grouped, like gphotos), tap to expand the burst inline.
- **A scrubber on the right edge** that's just years → months — drag to jump.
- **A small "near here" or "on this day" affordance** in the corner that pulls context from the map when you switch.
- **No map.** The map is the atlas's job. The roll is for the eye, not the geographer.

Switching between surfaces is one keystroke — `1 / 2 / 3` or named (Sky / Atlas / Roll). They share the same time brush at the bottom so "last summer" persists across all three.

The nice side-effect: the atlas's sidebar becomes much calmer (just the spine), the map becomes denser and more meaningful (photo dots still there, as heatmap fuel), and photos finally have a home built for how you actually use them.

Want me to mock this up as slides 7 (Roll surface) and adjust the atlas sidebar to drop individual photo tiles? It'd push the deck to ~13 slides total, which I think is still tight.

## User

lets go

## Assistant

_[tool: update_todos]_

_[tool: copy_files]_

## Assistant

_[tool: grep]_

Let me add the new CSS for the Roll surface, session tiles, and full-bleed photo. I'll find the existing CSS end and append.

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Now let me insert the **Two Strata** slide after Six Calls, and update the Six Calls copy:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Now update all slide tags to /13 and renumber. Let me batch this:

_[tool: str_replace_edit]_

Now let me insert the Roll slide between Browse and Detail-Photo:

_[tool: str_replace_edit]_

Now let me update the Browse sidebar — replace individual photo tiles with session tiles:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Now rework the photo detail to be full-bleed:

_[tool: update_todos]_

_[tool: show_html]_

_[tool: save_screenshot]_

_[tool: sleep]_

_[tool: save_screenshot]_

_[tool: get_webview_logs]_

_[tool: eval_js]_

_[tool: grep]_

_[tool: sleep]_

_[tool: eval_js]_

_[tool: show_html]_

_[tool: sleep]_

_[tool: get_webview_logs]_

_[tool: eval_js]_

_[tool: sleep]_

_[tool: eval_js]_

_[tool: sleep]_

_[tool: eval_js]_

_[tool: show_html]_

_[tool: save_screenshot]_

_[tool: sleep]_

_[tool: eval_js]_

_[tool: grep]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: show_html]_

_[tool: sleep]_

_[tool: eval_js]_

_[tool: save_screenshot]_

_[tool: show_html]_

_[tool: sleep]_

_[tool: eval_js]_

_[tool: write_file]_

_[tool: show_html]_

_[tool: eval_js]_

_[tool: show_html]_

The iframe works. The issue is in my file. Let me investigate by toggling parts.

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: save_screenshot]_

Now let me capture the new slides.

_[tool: view_image]_

_[tool: str_replace_edit]_

The Two Strata slide has weird grid overlap. Let me restructure that row:

_[tool: str_replace_edit]_

_[tool: view_image]_

_[tool: view_image]_

_[tool: view_image]_

Let me check the updated browse and fix the issues:

_[tool: str_replace_edit]_

Let me fix the remaining issues — roll floating pills overlap, scrubber, photo corner wrap, session bar, and update data-screen-labels:

_[tool: str_replace_edit]_

_[tool: show_html]_

_[tool: sleep]_

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: view_image]_

_[tool: view_image]_

_[tool: str_replace_edit]_

Let me restructure the session bar header to use better spacing:

_[tool: str_replace_edit]_

Let me reposition the roll's contextual filter pills to the top of the grid instead of the bottom:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: show_html]_

_[tool: sleep]_

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: view_image]_

_[tool: done]_

_[tool: str_replace_edit]_

The roll's 4th-day overflow is intentional (masked fade suggesting "more below"). The other findings are false positives. Let me bump the cover metadata size slightly and accept the rest:

_[tool: delete_file]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Done. The deck is now 13 slides with the strata reframe baked in:

**What changed:**
- **Slide 04 — Two strata.** New foundational slide that names the asymmetry: audio / moment / note are **deliberate** (the spine), photos are **ambient** (the roll). Same data model, different presence rules.
- **Slide 08 — The Roll.** New surface. Dense edge-to-edge grid of toned thumbs, date headers, session stacks with frame counts, contextual filter pills (on this day / near here / just photos / sessions only), year scrubber on the right edge, and the shared time brush at the bottom. Top-right surface switcher: Sky / Atlas / **Roll**.
- **Slide 07 — Atlas sidebar updated.** Photos no longer appear as individual tiles. They collapse into session tiles ("Dolores Park · NW corner · 11:08 → 11:14 · a session, 6 minutes · 12 frames") with a stacked-thumb visual. The sidebar is finally quiet enough to read.
- **Slide 09 — Photo detail reworked.** Full-bleed image. No title chrome. Just place + time + weather + exposure in tiny mono at the corners, an optional caption only when one exists, and a session bar at the bottom with a 12-frame filmstrip. **Arrows now flip frames within the session; ↑↓ moves to the next entry** — a deliberate nav split that mirrors the strata.
- **Slide 03 — Calls #2 and #4 rewritten** to reflect the three-surface model and the "photos are what give the map its density" framing.

**Sidebar effect:** photos are everywhere they should be (map, roll, neighbor strips) and absent where they shouldn't be (cluttering the chronological spine). Atlas now feels readable instead of busy.

**Caveat:** the validator flags the Roll's 4th day as "extending past the slide edge" — that's the intentional mask fade suggesting "more below." Same for the audio transcript's flowing inline spans (they appear as overlap to the bounding-box check but render as continuous text).

If you want me to push further: I'd consider giving moments their own asymmetry too — they're often deliberate but cheap, like checking in. They could earn a lighter detail view than audio or notes. But that's a follow-up if the current direction feels right.

## User

how can i add my own images to te mock area

## Assistant

_[tool: snip]_

_[tool: copy_starter_component]_

I can wire up drag-and-drop image slots so you can drop real photos straight onto the mocks. The slots persist (their content survives reloads) and behave like blank rectangles until you drop something on them.

Let me set it up. The high-impact places to add slots are the hero photo on slide 09, the 12 filmstrip frames on slide 09, and the thumbs in the Roll (slide 08). Want me to also add them to the session-tile thumbs in the Atlas sidebar?

Let me wire up the obvious ones now — you can tell me to add more after.

_[tool: str_replace_edit]_

_[tool: read_file]_

_[tool: str_replace_edit]_

Now let me replace the placeholders with image-slots — the hero photo and filmstrip on slide 09, and the Today row on the Roll:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Now the filmstrip frames:

_[tool: grep]_

_[tool: grep]_

_[tool: grep]_

_[tool: grep]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Now let me add image-slots to the Today row in the Roll (the most prominent row):

_[tool: show_html]_

_[tool: sleep]_

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: view_image]_

_[tool: delete_file]_

_[tool: done]_

Done. Image slots are wired up in the high-impact spots — you can drag images straight onto them now.

**Where the slots live:**
- **Slide 09 (Photo detail)** — one big slot for the hero photo, plus all 12 filmstrip frames as their own slots.
- **Slide 08 (The Roll)** — the entire Today row (the session-stack top frame + the 9 thumbs next to it).

**How to use them:**
1. Navigate to the slide.
2. **Drag any image file** from your desktop / Finder / file explorer onto a slot — or **click** the slot to open a file picker.
3. The image fills the slot. Drops persist across reloads (and survive share links, downloads, and PPTX export).
4. **Double-click a filled photo** to reframe — drag inside the frame to reposition, corner-drag to scale. Crop persists too.
5. To clear: hover the slot, the small ✕ button appears top-right.

**Empty state:** the slots are invisible until you interact — the toned warm placeholder still shows underneath. As soon as you drop a photo, it covers the placeholder.

**If you want slots elsewhere, just ask** — easy adds:
- Other days in the Roll (Sunday / Saturday / Friday)
- Session-tile thumbs in the Atlas sidebar
- The neighbors strip in the audio / moment / note details
- A music cover slot on the moment detail (currently a striped placeholder)

Each slot needs a unique ID, so when adding more I'll just give each a memorable name like `memoir-roll-sunday-3`. Tell me where to put them and I'll wire them up.

