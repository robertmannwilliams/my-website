# GRID-DESIGN.md — The Largest Machine

Design authority for the `/grid` project. When code and this document disagree, this
document wins. It *inherits* DESIGN.md (the aistack sketchbook) wholesale — tokens,
typography, motion rules, map grammar, never-list — and states only what the grid
piece adds, licenses, or overrides. If something isn't covered here, DESIGN.md rules.
Full concept: `docs/grid-spec-package.md`.

## Direction

Volume II of the same atlas series. Pen-and-ink on warm cream, drafting-table
grammar, plate captions — the reader should feel they've opened the next binder from
the same firm. The visual argument this volume makes: **the grid is the largest
machine ever built, and it has no warehouse** — so it is drawn like the machine
drawings of the utilities that built it: single-line diagrams, switchyard schematics,
survey plates.

**Signature element (spend the boldness here):** the Uri blackout. At the climax of
the night set piece (beat 3.5), the Texas glow flickers and goes dark on the map.
One gavel strike in the whole piece — the grid's equivalent of aistack's red stamp.
No other alarm moments, no second dark sequence.

## Tokens

All of DESIGN.md's palette carries over. The grid adds, pending the rules below:

```css
/* Fuel-family washes — reuse before adding. Pin interiors at ~32% like aistack. */
--fuel-nuclear:  var(--ink);        /* the baseload backbone, drawn in the workhorse */
--fuel-gas:      var(--wash-ochre);
--fuel-oil:      var(--wash-red);   /* peakers/oil — scarce, expensive, red-family */
--fuel-clean:    var(--wash-teal);  /* hydro, wind, solar, geothermal */
--fuel-storage:  var(--wash-teal);  /* batteries + pumped hydro; square glyph differentiates */
--fuel-coal:     #7E6C52;           /* NEW TOKEN "umber" — PENDING ROB SIGN-OFF.
                                       Until signed off, coal renders in --ink-faint. */
--fuel-other:    var(--paper);      /* biomass, waste, misc — the base condition */

/* Night sheet — used ONLY inside the night set piece (beats 2.7–3.5).
   These are story-event tokens, not a theme. PENDING PHASE 1 PROOF + ROB SIGN-OFF. */
--night-sheet:   #16213D;   /* deep ink-navy paper; the sheet, inverted */
--night-line:    #9FAECE;   /* line work + text on the night sheet */
--night-lamp:    #E3C87E;   /* the one licensed glow: transmission + city stipple */
```

Rules: within the day map, DESIGN.md's no-new-hex rule holds — fuel color comes from
the existing palette; **glyph shape, not hue, separates families that share a wash**
(see Pins). The night tokens are quarantined: they may never appear outside the night
set piece, and nothing from the day palette glows, ever. Light mode only still holds
for the site; night is a narrative event with an entrance and an exit.

## Typography

Unchanged from DESIGN.md. One addition: the title block motif for this volume reads
`PROJECT: THE LARGEST MACHINE / SHEET: {n} / SCALE: 60 Hz`. Figure convention
continues: "Fig. 12 — Switchyard, Lackawanna Energy Center."

## The map

DESIGN.md §Map governs (paper style, persistent spine map, recessed/forward states,
traveling camera, journey line, composition padding, z11 cap). Grid additions:

**Pins (plants).** Same surveyor's-circle construction as aistack (5.5px base, 1.5px
ink stroke, cleared paper disc). Interior wash = fuel family per tokens above. Three
capacity steps (not continuous): <250 MW ×0.85, 250–1000 MW ×1.0, >1000 MW ×1.25.
Families sharing the teal wash differentiate by a small ink tick inside the circle at
close zoom and in the legend: wave (hydro), blade (wind), rays (solar), none
(geothermal); storage is a small square instead of a circle. Status: under
construction = dashed ring (aistack's planned convention, promoted). Story-mode
density rule unchanged: active beat's sites at full ink, everything else ≤12% or
hidden.

**Transmission lines.** HIFLD ≥230 kV, simplified. Day map: --ink-faint at 0.6px,
off by default in atlas (a filter lifts them to 0.9px --ink); in story beats they
draw on with stroke animation like aistack's draw_links — annotations, not circuits.
No voltage-color coding at v1; weight carries the hierarchy (500 kV+ slightly
heavier). Night map: --night-lamp at low opacity with a 1px soft bloom — the ONE
licensed glow in the piece.

**Region layers.** ISO/RTO boundaries as dashed ink (drafting convention, same as
country borders); interconnection boundaries slightly heavier. Regulatory wash
(market vs. vertically integrated) as a flat 12–18% wash toggle, atlas-only.

**The night set piece (2.7 → 3.5).** Entered once, exited once, both as slow washes
(~1.5s, beat-driven, never scroll-scrubbed). The sheet crossfades --paper →
--night-sheet; line work to --night-line; city-light stipple (derived from
settlement data or a baked raster, NOT satellite imagery) and transmission glow fade
in. It must still read as *printed* — a cyanotype night-plate from the same firm,
not a NASA composite. Labels thin out; only the story's actors stay lit. Daylight
returns at 3.6 like power being restored — which is the point. Reduced-motion: hard
cut between sheets, no flicker animation on 3.5 (the Texas region simply renders
dark, with the caption carrying the event).

## Widgets

Three interactive moments (dispatch stack 2.4, hold-60Hz 2.8, duck-curve scrubber
2.6) plus the live panel (4.4 + atlas). Shared rules:

- Drawn as instruments from the same drafting kit: ink lines, Plex Mono readouts,
  wash fills at ≤35%. No buttons that look like software; controls look like
  a drafting instrument or a breaker handle.
- Teach one concept in 20–60 seconds; tap-first (44px+ targets); the copy around
  them must read fine if the reader never touches them.
- Never block scroll. No score, no fail state that punishes — "failure" in
  hold-60Hz is a red annotation, not a game over.
- Reduced-motion/static variant for each: the end-state as a captioned figure.
- The live panel degrades to a labeled build-time snapshot ("as of {date}") —
  never a spinner, never an error state.

## Motion

DESIGN.md rules wholesale. Additions: the day/night crossfades are the slowest
moves in the piece (~1.5s); the Uri flicker is 3 quick dips then dark over ~1.2s,
once, non-looping, skipped entirely under reduced motion.

## Never-list (additions to DESIGN.md's)

- Never glow on the day map. Never night tokens outside the set piece.
- Never satellite imagery, even for the night plate.
- Never animated electron/particle flows along lines. Power flow is stated in
  copy and arrows, not simulated sparkles.
- Never a second dark sequence, a second flicker, or alarm-red outside 3.5.
- Never gamify with points, timers, or scores. The widgets are instruments,
  not arcade games.
- Never show a live-data spinner or error; degrade to the labeled snapshot.
- Never zoom past ~z11 (EIA coordinates are plant-gate level at best; some are
  centroid-level).
