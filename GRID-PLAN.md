# GRID-PLAN.md — Build Plan

Work top to bottom. One phase ≈ one or two Claude Code sessions. Check boxes as you
go; log every session at the bottom. Each phase ends with a pushed commit and a
Vercel preview Rob can open on his phone. Concept: `docs/grid-spec-package.md`.
Design authority: `GRID-DESIGN.md` (inherits `DESIGN.md`).

## Phase 0 — Data + scaffold

- [x] `GRID-DESIGN.md` + `GRID-PLAN.md` written; CLAUDE.md pointer added.
- [x] Data pipeline: `scripts/build-plants.ts` — download/parse EIA-860M
      (Operating + Planned sheets), aggregate generators → plants, fuel-family
      mapping, ≥25 MW threshold, → `data/plants.json` with meta block (source URL,
      vintage, generated date, counts). Fail loudly on schema surprises.
- [x] Sanity assertions in the script: Palo Verde ≈ nuclear/AZ/~4 GW, Grand
      Coulee ≈ hydro/WA/~6.8 GW; family/count summary printed.
- [x] Route scaffold: `src/app/grid/page.tsx` + `src/features/grid/`. Page renders
      real derived stats from plants.json (plant count, total GW, family breakdown)
      in the design system's voice — a surveyor's note, not a splash page.
- [x] `npm run build` + `npx tsc --noEmit` clean; pushed; preview checked.
- [ ] **Rob:** get a free EIA API key (eia.gov/opendata) → `EIA_API_KEY` in
      `.env.local` + Vercel. Blocks Phase 4 only.

## Phase 1 — Map spike: fuel pins, wires, and the night proof

- [x] Extend the paper style for the grid: fuel-washed pin system per GRID-DESIGN
      (glyph ticks, capacity steps, construction rings), clustering for ~5,000
      pins (cluster radius 22, max zoom 10; survey-marker styling from aistack).
- [ ] Perf-verify the 25 MW threshold on a real phone (Rob's preview pass);
      drop to 50 MW only if it actually chugs.
- [x] HIFLD transmission ≥220 kV → simplified GeoJSON (`build:transmission`;
      visvalingam 12% keep-shapes, 4-decimal precision, 10,495 lines, 4.4 MB
      raw / ~1.2 MB gzipped); faint day-map layer, ≥500 kV drawn heavier.
      Filter lift arrives with atlas assembly.
- [x] ISO/RTO boundary layer (7 footprints via `build:regions`, NRDC mirror of
      the retired HIFLD layer, 2017 vintage, PROVISIONAL) + regulatory wash
      toggle (retail-choice status by state, us-atlas geometry, classification
      PROVISIONAL until Phase 5 facts audit).
- [x] **The night proof** built: day→night sheet crossfade (1.5 s paint
      transitions, snapshot-restore in `map/night.ts`), transmission lamp-glow,
      city stipple from settlement points, night pin variants swapped mid-wash,
      reduced-motion hard cut. DAY/NIGHT toggle on the plate for review.
- [x] Atlas mode assembled: fuel chips, status/capacity/era/region selects,
      wires/regions/regulation layer toggles, client-side search (name or
      operator) with camera fly-to, detail card (EIA fields + construction MW),
      shown-count + clear-filters line, plant labels past z8.5. Plain
      scaffolding chrome per the Phase 4.5 freeze.
- [ ] Acceptance: atlas pleasant on a phone (Rob's preview pass; night/coal
      sign-offs moot until the reskin).

## Phase 2 — Vertical slice: Act 2 (the design proof)

- [x] Story engine built for `content/grid/` (beat kinds `map | text | widget |
      live`); gray-matter pipeline with loud validation (site ids against
      plants.json, orphan copy, unknown widgets/overlays — build fails).
      Purpose-built compact engine (`story/StoryFlow` + `story/StoryMap`)
      following the aistack grammar rather than literally extracting its code —
      smaller surface for the reskin to repaint. Journey trail, story density
      rule, overlay + night per beat, reduced-motion jumpTo.
- [x] Act 2 copy authored: 10 beats, register contract; facts ledger
      (`content/grid/facts.md`) written alongside — one arithmetic error
      caught by the ledger during drafting (16 vs 40 Susquehannas).
- [x] Dispatch-stack widget (2.4) incl. "add solar" toggle (demand 65 GW:
      $160 peaker-set → $40 CC-set with solar — the lesson in one click).
- [x] Duck-curve scrubber (2.6) with belly/neck annotations. (Sun-position
      tie-in to the map dropped — scrubber stands alone; revisit only if the
      reskin wants it.)
- [x] Hold-60Hz widget (2.8): fail path (~8 s untouched), win path
      (peaker + battery bridge), retry, four-second-computer reveal,
      reduced-motion static variant. Sim advances by wall-clock dt so
      throttled background timers slow ticks, not the game.
- [x] Temporal camera choreography (CONUS regions → Susquehanna → seaboard →
      Solar Star → LA night entrance → Menifee → Horse Hollow); night enters
      at 2.7 via beat state, not scroll position.
- [ ] Acceptance: Rob approves the slice on a phone preview before replication.

## Phase 3 — All acts

- [x] Acts 1, 3, 4 copy authored — 22 new beats, register contract, facts
      ledger alongside. Uri figures drafted from the standard record (20 GW
      shed, 4.5 M homes+businesses, <59.4 Hz, 246 deaths) and marked
      STRICTEST CHECK in the ledger — the line-by-line pass against the
      FERC/NERC final report itself stays a Phase 5 gate.
- [ ] Act 1 plates — DEFERRED past the Phase 4.5 reskin on purpose (don't
      illustrate in a visual language that's being replaced). Beats read as
      text/map/diagram meanwhile.
- [x] Watt's-journey camera path (simplified: corridor cameras Jessup →
      ridgelines → city edge over the real transmission layer, not a
      line-following tween — revisit only if the reskin wants more).
- [x] Act 3: interconnection islands (state-dissolve approximation, marked
      provisional), DC-tie "doors" (hand-authored ties.json, 12 ties,
      city-level), Hydro-Québec arcs, **the Uri flicker** (lit → 5-step
      flicker → dark over ~2.2 s; reduced-motion renders dark, no flicker;
      night baselines restore on scroll-back), daylight return at 3.6,
      regulatory wash beat, bill diagram.
- [x] Act 4: demand-bend chart, queue beat, wires beat; 4.4 is a `live` beat
      rendering an honest placeholder card until Phase 4; handover is a plain
      scroll into the atlas plate — the expand transition belongs to the
      single-spine consolidation.
- [ ] Single-spine consolidation: one map instance carrying story → atlas
      (currently two instances on the page).
- [ ] Hero-site blurbs: ~40–60 hand-written `why_it_matters` entries (incl. the
      Canadian hero sites as manual plant entries).
- [ ] Acceptance: full story scroll start to finish on Rob's phone.

## Phase 4 — Live layer

- [ ] `/api/grid/live`: EIA v2 proxy, key server-side, ~10 min cache, baked
      snapshot fallback (never a spinner/error per GRID-DESIGN).
- [ ] Live panel (4.4): national demand + fuel mix now; region picker (IP guess,
      manual override, no permission prompts).
- [ ] Atlas live overlay: per-BA demand readout on region hover; docked panel.
- [ ] Acceptance: panel correct against EIA's own dashboard; fallback verified by
      simulating API failure.

## Phase 4.5 — Reskin (visual language v2)

Rob's call (2026-08-07): the paper-and-ink volume-II continuity is too quaint
for this subject. New direction: **clean, technical, striking**. Bones first,
then this phase replaces the skin in one pass. The swap surface is deliberately
small: map style builder, pin module, night kit, CSS tokens, widget chrome.

- [ ] Direction exploration with Rob: 2–3 styled map screenshots (candidate
      poles: dark control-room base with the night kit promoted to default;
      light Swiss-technical monochrome + one accent; schematic/single-line
      diagram language). Rob picks before any code spreads.
- [ ] Rewrite GRID-DESIGN.md as its own document (drop the DESIGN.md
      inheritance framing); new tokens, type check (Newsreader may not
      survive), motion accents.
- [ ] New map style builder + pin/cluster language + night treatment (or
      day/night inversion if the dark base wins).
- [ ] Restyle widget chrome + plate/page furniture to match.
- [ ] Sweep story plates/diagrams for consistency with the new language.

## Phase 5 — Verification + polish

- [ ] Facts-ledger audit: every number in copy traced to its source.
- [ ] Reduced-motion pass over every interaction (both widgets' static states,
      night hard-cut, no flicker).
- [ ] Perf pass: pin/line layers on mid-tier phone; bundle check.
- [ ] Cross-links: /aistack Act-4 beat ↔ /grid 4.1; projects page entry.
- [ ] Launch checklist: metadata/OG, analytics parity with aistack, 404s, share
      cards.

## Session Log

- **2026-08-07 — Flesh-out session.** Concept developed with Rob; four direction
  decisions locked (four-act structure, widget-level interactivity, live EIA
  data, paper-ink + night set piece). `docs/grid-spec-package.md` committed.
  **Next:** Phase 0. **For Rob:** EIA API key; open questions in spec §Open
  questions (title, retired plants, coal token, night-piece confirmation).
- **2026-08-07 — Phase 0 (same day, "ok go").** Docs pair + CLAUDE.md pointer.
  Pipeline built and run against EIA-860M **June 2026** vintage: 5,054 plants
  ≥25 MW (4,682 operating / 372 construction-only), 1,344 GW operating + 92 GW
  under construction; Palo Verde + Grand Coulee assertions pass; `data/plants.json`
  1.4 MB committed. `/grid` scaffold live: layout reuses `.atlas-root` (atlas.css)
  for full Volume-I surface inheritance + `grid.css` for Volume-II tokens
  (fuel washes; night tokens quarantined); page is the Sheet-0 surveyor's note
  with real derived stats and the Fig.-1 fuel ledger. Verified in browser,
  desktop + 375px; build/tsc clean. **Decisions made without sign-off** (all
  reversible): working title "The Largest Machine" used on the page; route stub
  is `robots: noindex` until launch; PR sheets excluded (own isolated grid —
  candidate story beat later); Operating statuses OP/SB/OA kept, OS dropped;
  construction = U/V/TS only; construction MW at operating plants carried as
  `construction_mw` on the same record. Noted: the host site already runs API
  routes for `/monitor`, so Phase 4's EIA proxy route has precedent. **Next:**
  Phase 1 — fuel-pin map style, HIFLD transmission layer, and the night proof.
  **For Rob:** EIA API key (only Phase 4 blocker); coal umber token + night
  tokens await your sign-off at the Phase 1 screenshot review; say the word if
  you want a different title on the stub.
- **2026-08-07 — Phase 1 map spike (same day, continued).** Plate I live on
  `/grid`: full CONUS map (paper style shared with the atlas via
  `buildPaperStyle`), 4,682 operating + 372 construction plants as fuel-washed
  surveyor pins (glyph ticks for hydro/wind/solar, square storage marks, three
  capacity steps, dashed construction rings; 44 canvas pin variants), clustered
  aistack-style; HIFLD ≥220 kV transmission (10,495 simplified lines) faint on
  the day sheet, ≥500 kV heavier; **the night set piece proven** — DAY/NIGHT
  toggle washes the sheet to ink-navy over 1.5 s, transmission glows lamp-yellow,
  city stipple lights up, pins dim to night variants, everything restores from a
  live snapshot on the way back (verified across two full round-trips; reduced
  motion = hard cut). One real bug found and fixed in verification: the toggle
  guarded on `map.isStyleLoaded()`, which flickers false during tile loads and
  silently ate clicks — replaced with an own load flag. `--night-water` added to
  the night kit (GRID-DESIGN updated). Client data ships as static GeoJSON under
  `public/grid-data/` (plants 0.9 MB, transmission 4.4 MB pre-gzip; Phase 5 perf
  pass may tighten). Dev-only `window.__gridMap` handle left in for debugging.
  Note for future sessions: the in-app browser pane throttles rAF when hidden —
  Mapbox loads stall and WebGL screenshots come back as the body color; verify
  map state programmatically (see the rAF-patch trick) and treat Vercel preview
  on a phone as the visual arbiter. **Next:** Phase 1 remainder — ISO/RTO
  boundaries + regulatory wash, atlas filters/detail panel/search, phone perf
  check. **For Rob:** open the Vercel preview, scroll to Plate I, hit NIGHT —
  this is the sign-off moment for the night tokens + coal ink-faint stand-in;
  zoom into Texas or the Northeast to judge pin/cluster density at the 25 MW
  threshold.
- **2026-08-07 — Direction check (same day).** Rob on the Phase 1 preview: the
  visual language doesn't land — too quaint for the subject; wants **clean,
  technical, striking**. Decision: keep building bones on the current
  scaffolding tokens, defer the redesign to new Phase 4.5 (Reskin);
  GRID-DESIGN.md marked provisional. Practical consequences for coming
  sessions: no visual-polish investment (pin glyph refinement, night-piece
  finesse, drafting-instrument widget chrome all frozen at "works"); design
  sign-off gates (coal token, night tokens) are moot until 4.5; build widgets
  and atlas UI structurally plain. The night sheet's dark-base look is a live
  candidate to become the default in the reskin. **Next:** Phase 1 remainder
  (ISO/RTO boundaries, atlas filters/detail panel/search), then Phase 2.
- **2026-08-07 — Phase 1 complete: atlas assembled (same day, "keep going").**
  New pipelines: `build:regions` → `regions.json` (7 ISO/RTO footprints; EIA's
  own ArcGIS layer now token-locked and HIFLD's retired, so sourced from
  NRDC's public mirror, 2017 vintage, marked PROVISIONAL in meta) +
  `regulatory.json` (51 states, retail-choice classification — choice /
  limited / traditional — geometry from us-atlas; classification PROVISIONAL
  pending Phase 5 audit). `plants.geo.json` enriched with operator, tech,
  online year, market region (BA→ISO map), state, construction MW (1.4 MB).
  GridMap now owns filter state (fuel set, status, capacity band, era,
  region → setData refeed, clusters recount), layer toggles, search index,
  and a detail card; new `AtlasControls` + `DetailCard` components, plain
  chrome per the reskin freeze. Night kit extended to the new layers —
  snapshot-restore proven to round-trip expression-valued paints. Verified
  programmatically end-to-end (nuclear filter = exactly the ledger's 55;
  nuclear×PJM = 17; search→Palo Verde flies camera + opens card; canvas
  pin-click opens card; mobile 375px no overflow, chips wrap to 2 rows).
  Build/tsc clean. **Phase 1 done except Rob's phone acceptance.** **Next:**
  Phase 2 — generalize the beat engine + content pipeline, author Act 2 copy,
  dispatch-stack / duck-curve / hold-60Hz widgets, temporal camera. **For
  Rob:** same preview, now with controls — filter to Nuclear, toggle
  Regions + Regulation, search your favorite plant.
- **2026-08-07 — Phase 2 slice: Act 2 live (same day, "go").** The story
  engine runs on `/grid` between the surveyor's note and the atlas plate:
  10 authored beats scroll over a sticky story map (its own non-interactive
  instance for now; single-spine consolidation is Phase 3 handover work).
  Beats 2.2/2.6/2.9/2.10 anchor on real plants (Susquehanna eia-6103, Solar
  Star eia-58388/9, Menifee Power Bank eia-66494 — Moss Landing's battery is
  off the June-2026 inventory post-fire, so Menifee carries the beat — and
  Horse Hollow eia-56291). Night enters at 2.7 and holds through midnight.
  Widgets verified end-to-end incl. both hold-60 outcomes. Facts ledger
  started with statuses (several TO VERIFY for Phase 5; 2.6 "as much as a
  nuclear reactor" flagged BORDERLINE). Verification notes: IO delivery and
  WebGL screenshots both need a visible pane — beat machinery was driven
  directly via the dev `__applyBeat` handle plus one IO wake test
  (scroll→2.2→camera confirmed). Hold-60 tuning knob: after the peaker's
  online the dial pins at 60.30 (cap); game-feel polish deferred to 4.5.
  Build/tsc clean. **Next:** Rob's phone pass on the slice, then Phase 3
  (Acts 1/3/4 + single-spine map + handover) or reskin exploration —
  Rob's call on order. **For Rob:** the slice reads top to bottom in ~3
  minutes on the preview: note where the register lands, whether the
  widgets feel like instruments or toys, and whether night-at-2.7 works
  for you. Copy is markdown in `content/grid/act2.md` — edit at will.
- **2026-08-07 — Phase 3: the full story (same day, "ok go").** All four
  acts live on `/grid` — 32 beats, outlet to handover. New copy: Act 1
  (the watt's journey, anchored on Lackawanna Energy Center eia-60357),
  Act 3 (islands → 1935 → the doors → Québec → Uri → decode-the-bill),
  Act 4 (the bend → the queue → the wires → live placeholder → handover).
  New data: `interconnections.json` (three islands dissolved from us-atlas
  states — whole-state approximation, provisional), `ties.json`
  (hand-authored: 12 DC ties + 2 Hydro-Québec arcs, city-level,
  provisional). New engine features: beat kinds `diagram` (balance / bill /
  demand-bend in-code SVGs) + `live` (placeholder card until Phase 4),
  multi-overlay beats, and the **Uri flicker** — verified lit→flicker→dark,
  baseline restore on scroll-back, day return at 3.6. Copy discipline:
  every new number ledgered; Uri wording tightened to "homes and
  businesses"; the register held to short declaratives throughout. Night
  now spans 2.7–3.5 across act boundaries. Build validation caught nothing
  loose (all 32 beats resolve). **Deferred consciously:** Act 1 plates
  (post-reskin), hero blurbs + Canadian sites, single-spine consolidation,
  handover transition. **Next:** Rob's full-story phone pass; then hero
  blurbs + spine consolidation, or Phase 4 live layer (needs EIA key), or
  the 4.5 reskin exploration — Rob picks. **For Rob:** the story now reads
  end-to-end (~8 minutes). The Uri beat is the piece's gavel strike — tell
  me if the copy earns it. And the EIA key remains the only Phase 4
  blocker.
