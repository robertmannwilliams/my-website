# DESIGN.md — The Engineer's Sketchbook

The single source of truth for how this project looks, moves, and feels. When code and
this document disagree, this document wins.

## Direction

Mid-century American optimism rendered at the drafting table. Pen-and-ink line work on
warm cream paper, sparse watercolor wash accents, impressionist warmth at the edges.
The references: Louis Kahn architectural drawings, 1950s aerospace concept art
(Syd Mead margin-notes energy), Childe Hassam's flag paintings. The visual argument the
design makes: **the AI buildout is an industrial project, not a software project** — so it
is drawn the way America drew its last great industrial projects.

Light mode only. No dark mode. Ever.

**Signature element (spend the boldness here):** the red ink stamp — used exactly ONCE
in the whole piece. At the climax of the ASML sequence, "ONE COMPANY" thunks onto the
paper. One gavel strike in twelve minutes; everything else stays quiet so it lands.
(Revised 2026-06-10 per Rob's reflection: concentration is otherwise woven into prose,
never badged. The atlas keeps chokepoint data as filters — exploration, not rhetoric.)

## Tokens

Define as CSS variables at :root. Derive every color in the project from these.

```css
--paper:        #F8F4E9;   /* page background, warm cream */
--paper-shade:  #EFE9D8;   /* cards, map water, recessed surfaces */
--ink:          #2B4A8C;   /* THE workhorse: line work, body text, map geometry */
--ink-strong:   #1C3263;   /* headings, emphasis, active states */
--ink-faint:    #9DAcc9;   /* hairlines, inactive pins, map graticule, borders */
--wash-red:     #C8502E;   /* stamps, alerts, the accent — use sparingly */
--wash-teal:    #4E7E74;   /* secondary wash, status accents */
--wash-ochre:   #C99A3C;   /* tertiary wash, construction status */
```

Rules: color is *wash, not fill* — tint at 15–35% opacity behind ink line work, the way
watercolor sits behind pen. Never use --wash-* as solid UI surface fills. Never introduce
a hex value outside this palette. Text is --ink on --paper; never pure black, never pure white.

A subtle paper grain (tiling texture or SVG noise at ~3% opacity) sits over --paper.
Subtle. If you can screenshot it and immediately see noise, it's too strong.

## Typography

- **Body / display:** Newsreader (variable, optical sizing on). Display at 500–600 weight,
  tight leading; body at 400, 17–19px, generous measure (~65ch max).
- **Annotation voice:** Newsreader italic for captions, margin notes, and figure labels.
  Figure convention everywhere: "Fig. 4 — EUV exposure tool, Veldhoven." Plates and
  diagrams are ALWAYS captioned in this convention.
- **Utility / data:** IBM Plex Mono for coordinates, capacity figures, the title block,
  filter labels, and axis-like text. Small sizes, letter-spaced, often small caps.
- No other typefaces. No font-weight above 600.

**Title block motif:** the masthead and the site footer borrow the engineering-drawing
title block — a thin-ruled box with PROJECT / SHEET / DATE / SCALE fields set in Plex
Mono. (Revised 2026-06-10: there are no chapter headers — the story is one continuous
flow of beats; section files exist for authoring only. Transitions live in the prose.)

## The map: a paper atlas, not a globe

Custom Mapbox style, built in Mapbox Studio (or style JSON in repo). Layer spec:

- Land: --paper. Water: --paper-shade (or a 10% --ink wash). No satellite, no hillshade,
  no terrain, no POIs, no roads below z8, no transit.
- Coastlines and country borders: --ink at 0.75px, country borders dashed (drafting
  convention). Admin-1 only past z5, fainter.
- Labels: Newsreader for places, Plex Mono for anything numeric. --ink-strong at low
  density. Remove all label halos wider than 1px.
- Optional at low zoom: a faint graticule (--ink-faint, 0.5px) for the atlas-plate feel.
- Projection: mercator. Camera moves are slow `flyTo` (curve ~1.4, speed ~0.8, capped
  ~2.6s). The map should feel like a plate being slid across a drafting table, not a
  video game.
- **One persistent story map** (revised 2026-06-10): the camera *travels* from each site
  to the next as the reader scrolls — the journey is the through-line. A faint dashed
  ink line accumulates behind the camera (the journey so far); the finale re-draws the
  full line bold. Active sites carry real presence: larger pin, larger italic label.

**Pins:** ink-drawn symbols, not teardrops. Default: 4–5px circle, 1.25px --ink stroke,
--paper fill. Active/story: filled --ink with a 1px offset ring. Status: construction =
--wash-ochre ring; planned = dashed ring. Chokepoint monopoly sites get a small red tick.
Clusters: a circled count in Plex Mono, drawn like a survey marker.

**Story-mode density rule:** only the active beat's sites at full ink; all other sites at
≤12% opacity or hidden. Atlas mode shows everything.

**draw_links beats:** great-circle-ish ink lines (1px, dashed) that draw on with stroke
animation from the hub site outward, 250–400ms apart. These are annotations, not flight
paths — no glow, no gradients, no animated particles.

## Illustrated plates

One hero illustration ("plate") per chapter, full-bleed or 2/3 width, captioned.
Generated, then unified in post (same cream, same blue, same grain).

**Locked generation prompt — use verbatim, append only the subject:**

> Hand-drawn pen and ink architectural concept sketch in blue ballpoint ink on warm cream
> paper, in the style of mid-century aerospace concept art and architectural drafting.
> Confident loose line work, elevated three-quarter perspective, construction lines left
> visible, handwritten annotation script in the margins. Sparse watercolor wash accents
> only: faded orange-red and muted teal. No photorealism, no gradients, no dark
> backgrounds. Subject: {SUBJECT}.

**Plate list (subject per chapter):**

| Key | Subject |
|---|---|
| the-question | a person at a desk typing at a laptop, window light, city beyond |
| one-computer-building | aerial cutaway of a vast datacenter campus under construction, cranes, substation |
| gpu-grid | a GPU die drawn as a city grid of thousands of identical blocks beside a CPU drawn as a few grand buildings |
| sand-to-wafer | open quartz mine on an Appalachian ridge; inset of a gleaming crystal ingot and mirror-polished wafers |
| euv-machine | cutaway of an EUV lithography machine the size of a bus, droplet generator and mirror column annotated |
| fab-cathedral | semiconductor fab interior, bunny-suited figures dwarfed by overhead tool gantries, cathedral scale |
| hbm-sandwich | exploded view of a chip package: logic die, stacked memory towers, interposer — drawn like a building section |
| cable-nervous-system | rear of server racks, thousands of cables sweeping in bundles like a suspension bridge's strands |
| rack-to-building | progression drawing: chip → tray → rack → row → hall → campus |
| power-island | cooling towers and a restarted nuclear plant beside transmission lines marching toward a datacenter on the horizon |
| training-room | abstract: a building-sized machine reading a library; pages streaming into a grid of numbers |
| two-seconds | the journey map drawn as one continuous ink line around a world map, every stop ticked |
| the-atlas | a drafting table with the world map spread on it, tools, magnifier, stamps |

Plates may be AI-generated (Rob art-directs; keep the same references and palette per
batch) — consistency beats individual quality. Post-process every plate: normalize to
--paper background, match blue levels, add shared grain.

## Diagrams

In-code SVG, drawn in --ink with the same line weights as the map, captioned as figures.
Diagrams ink themselves in on scroll (stroke draw-on, then washes bloom, then annotations).
Hand-drawn imperfection is welcome (slight waviness via path jitter), uniformity is not.

## Motion rules

- Things *draw*, they don't slide or bounce. Primary verbs: stroke draw-on, wash bloom
  (opacity + slight scale from 0.98), annotation write-on, stamp thunk.
- Stamp: drops in with a 80–120ms scale-down (1.15 → 1.0) + 2–3° rotation, one subtle
  paper-shake (1px). Red ink, slightly distressed edge. Once per chapter, max.
- Easing: ease-out family, 300–700ms. Nothing springs, nothing bounces.
- Map camera: one move per beat. Never move the camera while text is still settling.
- `prefers-reduced-motion`: all draw-ons become simple fades; camera jumps replace flyTo;
  stamp appears without animation.

## Never list

- No dark mode, no pure black/white, no gradients on UI, no glassmorphism, no neon glow
- No default-Tailwind look, no shadcn cards, no rounded-2xl-shadow-soft sameness
- No emoji anywhere in the UI
- No teardrop map markers, no Google-Maps-looking anything, no satellite imagery
- No spinning globe hero
- No parallax for its own sake; motion only in the vocabulary above
- No font outside Newsreader / Plex Mono

## Quality floor (do without announcing)

Responsive to 375px (story beats stack: plate above copy; map becomes sticky background
at reduced height). Keyboard navigable, visible focus (--wash-red 2px offset outline).
Alt text on every plate. Lighthouse a11y ≥ 95. Reduced motion respected. Atlas usable
with touch: filter sheet from bottom on mobile.
