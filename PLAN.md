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

## Phase 6 — Verify & launch

- [ ] Hand-verify every hero-site claim in chapter copy against `sources` URLs in
      sites.json; fix numbers in copy. (Rob leads; Claude Code assists with a checklist
      generated from chapter frontmatter.)
- [ ] Copyedit pass at the dad register: read every beat aloud; cut 10%.
- [ ] Cross-browser/device QA (Safari iOS especially, for Mapbox + sticky behavior).
- [ ] Swap `/aistack` to the new experience; remove `/aistack/old`.
- [ ] Announce: link from homepage with a one-line description.

## Session log

<!-- newest first: YYYY-MM-DD — what was done / what's next / open questions -->

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
