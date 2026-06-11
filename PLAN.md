# PLAN.md — Build Plan

Work top to bottom. One phase ≈ one or two Claude Code sessions. Check boxes as you go;
log every session at the bottom. Each phase ends with a pushed commit and a Vercel preview
Rob can open on his phone.

## Phase 0 — Scaffold

- [x] Create route `/aistack` in the existing Next.js app (App Router). Archive the current
      work-in-progress page (keep reachable at `/aistack/old` until launch).
- [x] Install deps: `mapbox-gl`, `gray-matter` (or chosen frontmatter parser). Confirm
      `NEXT_PUBLIC_MAPBOX_TOKEN` works locally and on Vercel.
- [x] Move this package into the repo: `CLAUDE.md`, `DESIGN.md`, `PLAN.md` at root;
      `content/` and `data/` per repo conventions.
- [x] Global tokens: CSS variables from DESIGN.md, font loading (Newsreader + IBM Plex
      Mono via next/font), paper grain, base typography styles.
- [x] Content pipeline: parse `content/chapters/*.md` (frontmatter + per-beat copy) into a
      typed structure at build time. Validate every `sites:` id against `data/sites.json`;
      fail the build on misses.
- [x] Acceptance: deployed preview renders chapter copy as plain styled text (no map yet),
      typography already on-system.

## Phase 1 — The paper map + Atlas mode

- [x] Build the "paper & ink" Mapbox style per DESIGN.md §Map. Iterate until a screenshot
      reads as "plate from a vintage atlas." This is the highest-leverage design task —
      don't rush it.
- [x] Atlas page section: full-viewport map, all 341 sites as a GeoJSON source.
- [x] Clustering at low zoom (survey-marker style), spiderfy/offset for the 41 co-located
      pairs on expansion.
- [x] Pin system per DESIGN.md (status rings, monopoly tick, active states).
- [x] Filters: mega_layer (primary tabs), layer, bloc, chokepoint severity, status.
      Plex Mono labels; bottom sheet on mobile.
- [x] Detail panel: name, operator, kicker line (layer · sub_type), why_it_matters,
      status, capex, key customers, source links. Drafting-card styling, figure caption
      convention.
- [x] Search by name/operator (simple client-side).
- [x] Acceptance: atlas is independently shippable and pleasant on a phone.

## Phase 2 — Chapter engine + vertical slice (Chapter 4, lithography)

- [x] Beat engine: IntersectionObserver triggers; beat kinds `text | plate | map |
      diagram | stamp`; sticky map/figure column with scrolling copy column (stacks on
      mobile per DESIGN.md).
- [x] Map beat behavior: flyTo camera per beat, story-mode density rule (active sites
      full ink, rest ≤12%), `draw_links` ink-line animation.
- [x] Stamp component per DESIGN.md motion spec.
- [x] Build Chapter 4 end-to-end to full polish with a placeholder plate. This is the
      design proof — Rob reviews and signs off before replication.
- [x] Reduced-motion variants for every interaction introduced.
- [x] Acceptance: Rob approves the slice on a phone preview. (Rob, 2026-06-10:
      "Amazing keep it up" — treated as the go-ahead; every knob stays cheap to tune.)

## Phase 3 — All chapters

- [x] Wire chapters 0–12 through the engine (copy already in `content/chapters/`).
- [x] Build the 3–4 in-code SVG diagrams (chapters 2, 7, 10, 11) with draw-on animation.
      (Three diagrams — gpu-grid, cable-nervous-system, training-room; chapter 11's
      "diagram" is the journey arc on the map, next box.)
- [x] Chapter 11 finale beat: the full-journey arc draw across the world map.
- [x] Chapter 12 → atlas handoff transition (story map expands into atlas with filters
      appearing; should feel like being handed the pen).
- [x] Progress affordance: slim chapter rail (Plex Mono numbers) for orientation/jumping.
- [x] Acceptance: full story scroll works start to finish with placeholder plates.

## Phase 3.5 — Restructure (Rob's reflection, 2026-06-10)

- [x] Copy rewritten at the plain-spoken register (style contract: short declaratives,
      concrete nouns, jargon defined inline, no rhetorical colons/triplets). 39 beats,
      ~2,450 words. Opening folded — no double prologue; transitions live in prose.
- [x] Chapters removed: one continuous flow (section files kept as authoring units;
      no headers, kickers, or numbered rail rendered). Progress thread + ATLAS link.
- [x] Stamps reduced to ONE — ASML "ONE COMPANY". Concentration otherwise woven into
      sentences. Atlas keeps chokepoint data as filters.
- [x] One persistent story map: camera travels site-to-site (flights capped ~2.6s),
      faint dashed journey line accumulates behind the reader, active pins 35% larger
      with bigger italic labels. Continuous scroll kept (no snap) with slide-like beat
      presentation.
- [x] Spine layout (Rob's follow-on direction, same day): the map is a full-bleed
      sticky background under the whole story with recessed/forward states (paper
      scrim by beat kind; journey line darkens when recessed). Copy rides over the
      table as drafting cards at every width. Plates render as an inset — lead visual
      when recessed, postage stamp when the map takes the stage. Camera composition
      padding keeps targets in the open area (and re-applies on resize).
- [ ] Acceptance: Rob scrolls the rewritten flow on his phone; red-pens the copy.

## Phase 4 — Plates

- [ ] Rob generates the 8 plates with the locked prompt (DESIGN.md plate list);
      art-direction is his, batching for consistency. (Was 13: gpu-grid,
      cable-nervous-system, and training-room are in-code diagrams; two-seconds and
      the-atlas have no plate slots in the flow. Generate AFTER the Phase 3.5 copy
      is approved.)
- [ ] Post-process pass: normalize cream background, match ink levels, shared grain
      (scriptable in the repo: sharp or ImageMagick).
- [ ] Drop into `/public/plates/{key}.png`, responsive sizes via next/image, alt text
      for every plate.
- [ ] Acceptance: no plate visibly off-palette in a full scroll-through.

## Phase 5 — Polish & extras

- ~~Concentration stamp recap ledger~~ (removed 2026-06-10 — there is one stamp now)
- [x] Scenario mode in atlas (v1: hand-authored "Taiwan disruption" — Taiwanese sites
      and 2 downstream layers dim/flag; data lives in `content/scenarios.json`).
- [x] Methodology page: data provenance, source tiers, confidence flags, corrections
      contact. (This is what makes the piece citable.)
- [x] "Deep Dive" page rendering `content/primer.md` with a styled TOC.
- [x] OG image (title block + journey line; plates aren't in yet), meta tags,
      favicon variant.
- [x] Performance: code-split the map, lazy plates, Lighthouse pass, bundle check.
      (Perf 84 / a11y 95 after deferring the story map to first scroll and fixing
      contrast + aria-hidden focusables. Known leftover: Turbopack duplicates the
      sites module across the two lazy map chunks, ~87 KB gz extra on the handoff
      path — revisit if it ever matters.)
- [x] Map visual pass from Rob's 2026-06-11 feedback: settlement label hierarchy,
      pin visibility (wash interiors, cleared disc, zoom scaling, atlas site labels),
      cluster decomposition + frame-contents clicks, impressionist color (mega-layer
      pin washes, sea-glass water, teal coast band). Spec amended in DESIGN.md §map.

## Phase 6 — Verify & launch

- [x] Hand-verify every hero-site claim in chapter copy against `sources` URLs in
      sites.json; fix numbers in copy. (Run 2026-06-10 via four research agents — 29
      claim clusters: 26 confirmed, 3 fixed in copy [EUV containers 13→40, Zeiss
      mirror bump, CUDA age] plus 2 belt-and-braces hedges. Full audit trail with
      links in `docs/verification.md`; Rob spot-checks from there.)
- [ ] Copyedit pass at the dad register: read every beat aloud; cut 10%. (Rob — same
      session as the Phase 3.5 acceptance read.)
- [ ] Cross-browser/device QA (Safari iOS especially, for Mapbox + sticky behavior).
      (Done from here: Chromium against the production build + Lighthouse 84/95.
      WebKit feature floor by audit: Safari/iOS ≥16.2 for :has(), overflow:clip,
      color-mix, svh. Open: a real iOS Safari scroll — rides Rob's phone read.
      Desktop-Safari automation needs macOS Accessibility/Screen Recording grants.)
- [x] Swap `/aistack` to the new experience; remove `/aistack/old`. (Old route,
      `src/features/aistack`, build-stack script, and its pre-hooks all removed.)
- [x] Announce: link from homepage with a one-line description. ("The Physical AI
      Stack — an illustrated atlas of the mines, machines, and buildings behind AI."
      Louder announcement timing is Rob's call, likely post-plates.)

## Session log

<!-- newest first: YYYY-MM-DD — what was done / what's next / open questions -->

- 2026-06-11 (hero, Phases 2-4 — gate passed, hero SHIPPED to the homepage) —
  **Rob passed gate 4 ("Pass — build on"); player, atmosphere, and
  world-keying built and integrated in one pass.** `HeroPainting.tsx`:
  parses strokes.bin v4, mirrors the hero-brush stamp renderer exactly
  (sync-comment in both files), accumulates onto an offscreen canvas
  (steady-state = composite only), tempo curve 1-(1-τ)^2.2 over 5.5s (1.5s
  fast repeat via sessionStorage), pauses on hidden tab/off-screen and
  re-anchors the clock by inverting the curve on resume, DPR capped at 2,
  cover-crop windowing (phone = taller box, centered vertical crop).
  Atmosphere: spring wind (K=90/C=13, ≤600 active strokes via spatial hash),
  warm dapple decay, press-and-hold pentimento (radial destination-out to
  underdrawing.jpg at 25% floor, 600ms release), touch-action pan-y so
  scroll is never hijacked; everything off under reduced-motion (which gets
  the final JPG instantly; no-JS gets a <noscript> img). World-keying:
  /api/hero-geo reads Vercel headers (homepage stays static ○), client
  races variant pick (clock + Open-Meteo, 30min cache) against a 1.2s
  timeout — verified with curled fake headers (London) and the NYC
  fallback; variant locks before the first stroke. Homepage threshold now
  renders the painting (EntryPanorama retired, files kept; ENTER button and
  structure untouched); OG/twitter images → /hero/og.jpg. Verified in real
  Chrome via the dev `window.__hero.skip()` hook (full 46,748-stroke draw,
  master variant via NYC fallback on a clear afternoon — correct); build +
  tsc clean, homepage still static. **For Rob's phone review (the deploy is
  live):** the full 5.5s performance on first load, the 1.5s fast replay on
  return, drag a finger across the paint (wind), press-and-hold for the
  underdrawing, and the dusk variant after 16:30 local / rain variant in
  rain. Tuning knobs (spring, dapple, hold radius, tempo) are all single
  constants at the top of HeroPainting.tsx. Lighthouse + iOS Safari check
  ride this review.

- 2026-06-11 (hero, gate round 3 → crisp layer + sequenced replay) — **Rob's
  gate-3 notes split into render quality (A) and replay feel (B); both built,
  high-pass convergence honest-but-short after the 3 authorized rounds.**
  (A) Two stamp registers (soft 0-4 for tiers ≤1, hard 5-9 with ≤1px-at-size
  feather + chipped silhouettes for tiers ≥2); NEW crisp-touch tier: 23k
  hard dabs (2.5-5.5px) at 98-100% opacity placed by per-pixel residual,
  footprint-MEDIAN colors unsharped ×1.9 against a σ6 low-pass (FINE_PUNCH
  ×1.25 on tier r=3); silhouette protection clips fine strokes at master
  color boundaries (ΔRGB>70); finals + contact sheets now 2× supersampled,
  single downsample, no other smoothing anywhere. (B) Wash thinned (76px
  spacing, α .30-.42, mix .75 — tinted canvas); ordering rebuilt around an
  8×5 cell walk (cells scored light/calm/sky-first, greedy nearest-of-4 walk
  → the activity has a locus; tiers big→small within each cell; crisp pass
  returns late along the same walk; accent tail unchanged, starts 80.0%).
  Replay previews committed: hero/replay-preview.mp4 (5.5s real tempo,
  count(τ)=1-(1-τ)^2.2) + replay-fast.mp4 (1.5s). ffmpeg-static added as a
  devDependency for these. **Convergence: high-pass energy vs master
  flags 42→49→56%, workers 41→52→66%, tower 40→50→62% across rounds 4-6
  (target ≥80%); RGB ±1/255, sat 23.8 vs 25.4%, coverage 100.0%; 46,748
  strokes at 788 KB gz (within the raised 800 KB cap, gate-3 authorized).
  Remaining gap is a design tension: more punch/density drifts back toward
  the gate-2 "confetti" — parked for Rob's call at gate round 4.**

- 2026-06-11 (hero, gate round 2 → oil-paint rework) — **Rob rejected round 2
  ("pointillist confetti, not oil paint") with a render-rework spec; built and
  converged it in the 3 authorized autonomous rounds.** New brush system
  (scripts/hero-brush.mjs, shared by decompose/proof/player): 5 procedural
  bristle-textured stamp alphas swept 1-3 segments along a quadratic bezier
  (bend from coherence), value drift along each stroke, 90-96% opacity wet
  blending, linen-grain overlay tile. Tier-0 now TILES the whole canvas at
  ~38% overlap (interior coverage 100.0% measured by an alpha-accumulation
  pass) and three error-driven tiers refine on top (caps 5k/10k/22k →
  38,140 strokes). Color = footprint area-average (kills the warm-fleck bias)
  + per-stroke chroma restore to footprint mean sat, then a global half-res
  calibration render sets per-channel gains (1.029/1.035/1.028) and a chroma
  ×1.234 so the render histogram lands ON the master: mean RGB (159,154,152)
  vs (158,154,153), sat 24.4% vs 25.4%. Contact sheets committed for all 3
  rounds (hero/contact-sheet-{1,2,3}.png: full view + flags/workers/tower
  1:1 crops, master vs render). **Budget note (authorized by Rob's gate-2
  instruction): strokes.bin is 651 KB gz vs the original 600 KB budget —
  packing already bit-packs alpha+stamp and bend+drift and stores variant
  colors as int8 deltas; the remaining weight is the 38k stroke count the
  coverage + legibility contract needs.** Gate round 3 pending on the new
  proof strip. Then Phases 2-4.

- 2026-06-11 (hero, separate project — spec in hero/HERO.md) — **Phase 1
  decomposition pipeline built, reworked once per Rob's gate notes, awaiting
  gate round 2.** v1 (single-pass dart sampling, 12.3k strokes) rejected at the
  gate with a detailed rework spec; v2 implements it: Hertzmann-style
  error-driven refinement (4 tiers, r=24/12/6/3, per-tier caps with
  worst-cells-first placement → 34,540 strokes, 563 KB gz of a 600 KB budget),
  structure-tensor orientation at tier-matched integration scale (water runs
  horizontal, figures vertical — no global lean), and a fully computed replay
  order: 569-stroke pale toning wash (canvas covered, no paper holes) →
  background-to-foreground within each size tier (lum/edge/y blend, spatial
  sweep passes) → warm+darkest-decile accents forced into the tail (start
  80.6%, warm rule absolute, dark class demotes to keep ≥80%). Variant colors
  ride as int8 deltas (dusk/rain/snow all registered ≥0.66). Outputs:
  strokes.bin, final-{variant}.jpg, og.jpg, underdrawing.jpg, proof strip +
  order heatmap (early=light) for the gate. **Next:** Rob judges proof strip
  round 2; on approval → Phases 2-4 (player, atmosphere, geo-keyed variants,
  homepage swap — swap held behind the gate). (his list:
  weird town names / invisible sites / cluster zoom-ladder / wants tasteful color;
  he picked mega-layer pin washes + teal water/coast, declined red journey thread
  and tinted clusters). (1) Labels: three-tier settlement hierarchy calibrated on
  real symbolrank (Boston 7 / Worcester 10 / suburbs 12-14) — cities ≤8 large
  ink-strong, towns 9-11 quiet, villages ≥12 small-italic only past z10.75; Boston
  metro went from ~108 uniform names to Boston + 12 towns. Gotcha worth remembering:
  Mapbox places symbols from the LAST style layer first, so layer order is
  village→town→city→country to make big names win collisions (the city tier was
  silently losing to towns until reordered). (2) Pins: redrawn at 30px box —
  wash-tinted interiors by mega layer (Deployment stays paper: datacenters as base
  condition, color marks the upstream), 88%-paper cleared disc under each, stroke
  1.5, zoom-scaled in atlas, italic site self-labels past z8.5, filter tabs carry
  matching swatches as legend. (3) Clusters: radius 38→22 (metros decompose z7-9,
  campus pairs stay as small "2" badges), cluster click now getClusterLeaves →
  fitBounds the contents (Bay Area "25" → one click → all 12+ named pins framed at
  z10.5) or spiderfies tight groups; no more zoom ladder. (4) Color: water-tint
  (teal 7% over paper-shade), blurred teal coast band ≤z8, water-edge ink softens
  inland at mid-zoom (pond confetti gone — this also fixed half of issue 1's noise),
  graticule now rules over water too. Atlas opens at z1.45 with country labels on
  from the start (was an anonymous world at z1.25). Journey line nudged 1→1.15px.
  Verified in real Chrome (Boston/Bay Area/SW-US/Taiwan/world + cluster-click +
  spiderfy flows); build + tsc clean. **Tooling note for future sessions:** Mapbox
  GL cannot finish loading in a hidden/backgrounded tab (rAF never fires) — the
  in-app preview browser and background Chrome tabs both hit this; drive
  `map._render()` via a MessageChannel pump or use a visible tab. **Next:** Rob
  eyeballs the deploy on his phone — label density/teal strength/wash opacities are
  all single-constant tunes. Then plates (Phase 4) and his Phase 3.5 copy read.

- 2026-06-11 (later) — **Atlas lock-in replaces cooperative gestures** (Rob's call:
  "end the narrative, lock in the map, press back"). The colophon moved ABOVE the
  atlas, making the atlas the literal end of the page: story → wash-out → signed
  colophon → the map, full stop. Map gestures (scrollZoom, dragPan) are disabled
  during the approach so the canvas can never steal page scroll; when the page
  bottoms out (section bottom ≤ viewport, with hysteresis) the lock engages — plain
  wheel zooms, drag pans, like a real map — and a floating "↑ Back to the story"
  chip (anchor to #colophon, smooth scroll) is the way home; scrolling back up
  releases the lock. Verified the full cycle: approach=dead, bottom=live+chip,
  back=released. cooperativeGestures and its hint CSS removed.

- 2026-06-11 — **Story→atlas seam fixed** (Rob's report: "two full maps... stuck
  between scrolling and moving around the map"). Two causes, two fixes: (1) the
  story table now washes out to blank paper as the reader scrolls past the last
  beat (`is-ending` state with hysteresis; inset/caption/stamp fade too), so the
  story sheet ends cleanly and only then does the atlas arrive — no double world
  map at the seam; plus real air before the atlas header (margin to ~16vh, atlas
  section gets paper bg + z-index so it slides over the released table). (2) the
  atlas map now uses Mapbox cooperativeGestures — plain wheel/one-finger scroll
  moves the PAGE; zoom needs ⌘/Ctrl+wheel, pan needs two fingers, with the hint
  overlay restyled to Plex Mono on ink. Verified: ending fires past the last beat
  (scrim→1), wheel over atlas no longer zooms, hint exists and is styled.

- 2026-06-10 (Phase 6, pre-plates) — **Verification + launch prep run ahead of Phase 4
  at Rob's call.** Fact-check: four parallel research agents verified 29 hero-claim
  clusters against the sites' source URLs + fresh search — 26 confirmed (often with
  margin: Apollo comparison, Loudoun waits, NVL72 weight, eleven nines all check out),
  3 fixed in copy: EUV machine ships in ~40 containers not 13 (canonical ASML/CNBC/
  Intel figure), Zeiss mirror bump corrected to "Germany-sized → under a millimeter,"
  CUDA "fifteen years" → "nearly two decades" (2007 launch). Plus two hedges: wafer
  share "about ninety" → "more than eighty percent," model file "couple of terabytes"
  → "likely a terabyte or two." Audit trail: `docs/verification.md` (also flags TMI
  wording for revisit after the 2027 restart). `/aistack/old` deleted along with the
  whole legacy feature (src/features/aistack, build-stack script, predev/prebuild
  hooks — three/topojson deps left in place pending a homepage-usage check). Homepage
  link relabeled to "The Physical AI Stack" with a real description. QA: Chromium on
  the prod build + Lighthouse already done (84/95); WebKit floor audited (≥16.2);
  the on-device iOS scroll rides Rob's read. **Open before "done":** Rob's read-aloud
  copyedit + Phase 3.5 acceptance, the iOS scroll, the 8 plates, then louder
  announcement whenever Rob wants.

- 2026-06-10 (Phase 5) — **Polish & extras shipped.** Scenario mode: "Taiwan
  disruption" toggle in the atlas filter panel (data in `content/scenarios.json`) —
  switches to an unclustered view, rings the 27 Taiwanese sites in red, fades the
  Systems/Deployment layers to 20%, explainer note in the panel; clicks still open
  the detail card. Methodology page (`/aistack/methodology`) with stats computed from
  the data at build (341 sites, 286 high / 55 medium confidence, 662 source links, 48
  monopolies) and a GitHub-issues corrections path. Deep Dive (`/aistack/primer`):
  the full 11.6k-word primer rendered at build via marked with GitHub-style heading
  ids so its own TOC anchors work; prose styles in the design system. OG card
  (1200×630, next/og): title block + dashed journey line + red 341 SITES stamp, all
  Plex Mono (satori can't take variable-font Newsreader); story icon.svg = survey
  marker with red tick. Colophon links to both pages. **Perf pass:** story map now
  mounts on first scroll instead of at load — Lighthouse perf 46→84 (TBT 2,070ms→80ms),
  a11y 91→95 (DESIGN floor met) after darkening small mono labels and de-focusing
  everything inside the aria-hidden story map. Known leftover: sites module duplicated
  across the two lazy chunks (~87 KB gz on the handoff path) — Turbopack chunking,
  noted in Phase 5 block. **Remaining before launch:** Rob's copy/layout read (Phase
  3.5 box), the 8 plates (Phase 4), then Phase 6 verification, copyedit, QA, swap,
  announce.

- 2026-06-10 (last) — **Spine layout shipped** (Rob: map as background element, plates
  and copy do the work). StoryFlow now renders one full-bleed sticky "table": the map
  under everything with a recessed/forward scrim driven by beat kind (recessed = paper
  wash at 62%, journey line darkens to 0.8 to stay legible; forward = wash lifts).
  Copy is a single column of drafting cards over the table at all widths (left on
  desktop, lower half on phones) with matching camera composition padding, re-applied
  on resize via setPadding (no re-fly on phone URL-bar churn). Plate/diagram inset has
  two sizes: lead visual when recessed (centered-right ~46vw desktop, top-center
  ~88vw mobile), postage stamp top-right when the map is forward; captions hide in the
  small state. Stage edge fades + copy-side wash are gradients-to-paper, sanctioned in
  DESIGN.md as part of the sheet treatment. Verified at 375px (recessed plate beat,
  forward Abilene beat with pin composed in open space) and 1280px geometry. The old
  two-column story grid is gone. **Plates note for Phase 4:** insets argue for
  transparent-background sketches that sit on the washed map — decide at generation.
  **Next:** Rob's phone read of copy + new layout (acceptance box above); then plates
  and/or Phase 5.

- 2026-06-10 (later still) — **Phase 3.5 built: the restructure from Rob's reflection.**
  All copy rewritten at the kitchen-table register (style contract in the Phase 3.5
  block above) — 39 beats, ~2,450 words, double prologue folded, every transition
  carried in prose. Chapters gone: `StoryFlow` renders one continuous beat stream
  (markdown section files unchanged as authoring units; ids/validation intact). Five
  stamps deleted from content; the single ASML "ONE COMPANY" stays and hides when the
  story moves on. One persistent story map for the whole piece (replaces 13 windowed
  maps — simpler AND kinder to WebGL): the camera now TRAVELS from site to site
  (flyTo capped 2.6s), a faint dashed journey line accumulates behind the reader
  (sequential primaries, great-circle segments), active pins render 35% larger with
  13.5px italic labels. Handoff camera now FITS the inhabited world (phones see the
  whole plate). Numbered rail replaced by a 2px progress thread + vertical ATLAS
  link. Figure numbers run sequentially (Fig. 1–11). DESIGN.md and CLAUDE.md amended
  (stamp = single gesture; no chapter headers; traversing-map spec). Verified at 375px
  and 1280px: opening flow, Abilene→Spruce Pine traverse with breadcrumb, stamp thunk
  + hide, finale chain caption, world-fit handoff into the atlas. Kept continuous
  scroll over snap-slides (Safari momentum, reading rhythm, and the traveling camera
  all argue for it — revisit only if the deployed feel disagrees). **Decisions:**
  plates now 8 (after copy approval); stamp-ledger Phase 5 item removed. **Next:**
  Rob scrolls the deploy and red-pens the copy (Phase 3.5 acceptance box). Then
  plates, or Phase 5 polish in parallel. **For Rob:** the copy is yours to mark up —
  every beat lives in `content/chapters/*.md` as plain markdown; edit freely or dictate
  changes and I'll apply them.

- 2026-06-10 (late) — **Narrative-flow brief added** (`docs/narrative-flow-brief.md`)
  for Rob's structural reflection, gated BEFORE Phase 4 so plates don't lock a
  structure that's about to move. Beat-by-beat data (2,576 words / 43 beats / ~12 min),
  stamp cadence, mode rhythm, seven builder observations, decision prompts. Phase 4+
  holds until the reflection lands.

- 2026-06-10 (night) — **Phase 3 complete: the full story scrolls start to finish.**
  All 13 chapters run through the engine; the Phase 0 scaffold renderer is deleted.
  Engine generalizations: figure surface (plate/diagram/map) inherits across text and
  stamp beats; mid-chapter stamps (ch 3/6/9) hide when their figure moves on and return
  without re-thunking on scroll-back (animation fill changed to `backwards` so the
  cascade can fade them); story maps mount within ~1.6 viewports and unmount beyond
  ~3.2 — never more than ~2 live WebGL contexts of 13 chapters (verified). Three
  in-code diagrams ink themselves in on scroll (pathLength=1 dash trick, staggered
  per-element delays, washes bloom then annotations write on; reduced-motion = appear):
  GPU-as-city vs CPU-as-buildings, the cable plant, the training room. Chapter 11
  finale: draw_links beats with >5 sites draw as a sequential chain (170ms/leg) instead
  of hub-and-spokes, with antimeridian world-copy duplication so Pacific legs exit one
  edge and re-enter the other — the 11-stop journey reads as one retraced line.
  Chapter 12: the stamp strikes the world plate, then the handoff beat lazy-loads the
  full 341-site constellation at half ink (shares the atlas chunk) and fits the
  inhabited world on any screen; the real atlas section follows immediately below.
  Chapter rail at ≥1150px: Plex Mono 00–12 + ATLAS, red-ticked active, smooth-scroll
  jumps (auto under reduced motion). **Decisions:** chain-vs-hub inferred from site
  count (>5 = chain) — schema untouched; handoff constellation at 0.5 opacity (full
  density stays exclusive to the atlas); diagrams draw once and stay drawn. Verified in
  browser at 375px and 1280px: ch2 diagram, ch3 stamp hide/return, ch11 chain, ch12
  handoff into atlas, rail tracking. **Phase 2 acceptance checked off** per Rob's
  "Amazing keep it up". **Next:** Phase 4 is Rob's (generate the 13 plates with the
  locked DESIGN prompt; the post-process script and drop-in slots are ready to build on
  request) — or skip ahead to Phase 5 polish (stamp ledger recap, scenario mode,
  methodology + deep-dive pages, OG image, perf pass). **For Rob:** full scroll on the
  phone — the story now runs unbroken from "You type a question" to the atlas.

- 2026-06-10 (evening) — **Phase 2 built; awaiting Rob's sign-off on the slice.**
  Chapter 4 (lithography) runs end-to-end through the new beat engine at `/aistack`
  (`#lithography`): scroll-driven active beat (rect check against a 55% viewport line,
  scoped per chapter), sticky figure column on desktop (copy left, plate/map right),
  mobile per DESIGN — map pinned at 46svh with copy scrolling over it as drafting
  cards. Beat sequence as authored: placeholder plate (ruled frame, construction
  lines, "Fig. 4 — EUV exposure tool, Veldhoven."), camera pre-framed on Veldhoven so
  the map reveals already composed (zero gratuitous moves), `draw_links` beat flies to
  a fitBounds framing of all four sites and draws great-circle ink lines from the hub
  staggered 300ms (SVG stroke-dashoffset over the map, recomputed on resize), and the
  ONE COMPANY stamp thunks (110ms scale 1.18→1, −2.5°, 1px paper shake, distressed
  edge via feTurbulence displacement, multiply blend) and persists. Active sites get
  italic Newsreader labels; chapter sites dim to 12%; the other 300+ sites aren't on
  the sheet. Reduced motion: camera jumps, links fade, stamp appears, no beat dimming.
  **Two host-site landmines fixed:** `html, body { overflow-x: hidden }` silently
  disables ALL position:sticky (body becomes a non-scrolling scroll container) — the
  atlas route now overrides to `overflow-x: clip` via `html:has(.atlas-root)`; and
  mapbox-gl.css's `.mapboxgl-map { position: relative }` outranks single-class
  absolute positioning (scoped both map containers). Also hardened story fitBounds
  (stop in-flight moves, container-relative padding — a tiny mobile map could
  otherwise produce a NaN camera). **Decisions:** multi-site map beats use fitBounds
  with the authored `camera.zoom` as max — "camera resolves to first site" reads as
  intent for single-site beats, but a hub-and-spokes beat must frame its spokes on
  every screen; stamp persists once fired (per "once per chapter"); chapters 0–3 and
  5–12 still render as the Phase 0 text scaffold until sign-off. **Next:** Rob reviews
  the slice on his phone (acceptance box above left unchecked). If approved → Phase 3
  (all chapters through the engine, diagrams, finale arc, chapter rail). **For Rob:**
  scroll Chapter 4 slowly, then fast, then backwards; the stamp should land once and
  stay. Things easiest to tune now: beat trigger line (55%), link draw pace (300ms
  stagger), stamp size/position, mobile card styling.

- 2026-06-10 (later) — **Phase 1 complete.** The paper & ink map is real: in-repo style
  module (`src/features/atlas/map/paperStyle.ts`) — cream land, paper-shade water with an
  ink hairline coast via `fill-outline-color` (no separate coastline data, no tile
  seams), dash-dot admin-0 / faint dashed admin-1 (US worldview), 10° graticule fading
  out past z3, waterways past z8. **Map labels are true Newsreader / Plex Mono**: SDF
  glyph PBFs generated in-repo (`scripts/build-map-glyphs.ts` — tiny-sdf EDT ported onto
  @napi-rs/canvas after fontnik failed to build on Node 22; metrics calibrated against
  decoded Mapbox DIN PBFs) and committed under `public/map-fonts/` (~2.8 MB, OFL).
  Country names render as letterspaced Newsreader caps; oceans in italic. Atlas mode at
  `/aistack#atlas`: all 341 sites clustered (survey-marker discs with hairline outer
  ring + Plex Mono counts), canvas-drawn pins per DESIGN (status rings, red monopoly
  tick, active fill), spiderfy with dashed ink leaders for the 24 co-located groups
  (verified on Ashburn ×4 and Hsinchu), hover tooltip, drafting-card filter panel
  (mega tabs with live counts, layer dropdown, bloc/chokepoint/status chips), global
  search by name/operator (flyTo + select; clears filters if the pick is hidden),
  detail card with kicker line, why-it-matters, facts (monopoly in red), source links,
  and Fig.-caption. Mobile: filter sheet + detail sheet at ≤720px, verified at 375px.
  Map lazy-mounts (IO + rect-check + scroll fallback; eager in dev) and is code-split
  with sites.json riding in the map chunk. Verified flows end-to-end in the preview
  browser (its rAF/IO quirks cost some debugging; flows forced via frame pumps).
  **Next:** Phase 2 — beat engine + Chapter 4 vertical slice (flyTo per beat, story
  density rule, draw_links, stamp motion). **For Rob:** the deployed atlas is the thing
  to feel on a phone — cluster tap, spiderfy, filter sheet, a search. Flag anything
  about the map's voice (label density, border weight, water tone) before Phase 2
  reuses the style for story beats.

- 2026-06-10 — **Phase 0 complete.** Spec package merged to repo root (`content/` and
  `data/` live at root so the paths in CLAUDE.md stay literal; package README archived
  at `docs/aistack-spec-package.md`). Old WIP page archived at `/aistack/old` — its
  about-page links and the url-state writer now point at `/aistack/old` so map
  interactions don't bounce to the new route. New `/aistack` lives in a `(story)` route
  group (`src/app/aistack/(story)/`) so the archive keeps its own fonts/theme untouched;
  feature code under `src/features/atlas/`. Content pipeline
  (`src/features/atlas/lib/content.ts`): gray-matter parse of all 13 chapters / 43 beats,
  copy split by `## Beat {id}`, strict aggregated validation (site ids, beat shapes,
  camera keys, orphaned copy) — verified it fails the build on a planted bad site id.
  Tokens at `:root` per DESIGN.md; Newsreader (variable, opsz) + IBM Plex Mono via
  next/font; 3% SVG-noise grain; title-block motif on masthead and colophon; the host
  site's global `h1–h6 { font-weight: 800 }` is overridden inside `.atlas-root` (DESIGN
  caps at 600). Page renders every beat's copy as styled text with quiet drafting-strip
  placeholders (plate/diagram keys, map camera notes with site names resolved from
  sites.json, static red stamp previews — the animated thunk is Phase 2). Chapter prose
  uses sparse `*emphasis*` (7 instances); rendered as italics, no markdown lib.
  `NEXT_PUBLIC_MAPBOX_TOKEN` confirmed inlined in the production bundle (so Vercel has
  it) and copied into local `.env.local` (it's the public pk token already shipped on
  the live site). Checked on desktop + 375px viewports; lint/tsc/build clean.
  **Decisions made without sign-off** (all reversible): root-level `content/`+`data/`;
  plain stylesheet for the design-system layer (CSS modules can come with Phase 1
  components); beat id + kind shown as faint mono margin markers in the draft for review
  reference. **Next:** Phase 1 — the paper & ink Mapbox style (the high-leverage one),
  atlas mode with clustering/filters/detail panel. **For Rob:** open the preview on your
  phone and check the typography register; flag anything in the title-block/stamp
  styling you want steered before it spreads to the map UI.
