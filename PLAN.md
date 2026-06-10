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

- [ ] Build the "paper & ink" Mapbox style per DESIGN.md §Map. Iterate until a screenshot
      reads as "plate from a vintage atlas." This is the highest-leverage design task —
      don't rush it.
- [ ] Atlas page section: full-viewport map, all 341 sites as a GeoJSON source.
- [ ] Clustering at low zoom (survey-marker style), spiderfy/offset for the 41 co-located
      pairs on expansion.
- [ ] Pin system per DESIGN.md (status rings, monopoly tick, active states).
- [ ] Filters: mega_layer (primary tabs), layer, bloc, chokepoint severity, status.
      Plex Mono labels; bottom sheet on mobile.
- [ ] Detail panel: name, operator, kicker line (layer · sub_type), why_it_matters,
      status, capex, key customers, source links. Drafting-card styling, figure caption
      convention.
- [ ] Search by name/operator (simple client-side).
- [ ] Acceptance: atlas is independently shippable and pleasant on a phone.

## Phase 2 — Chapter engine + vertical slice (Chapter 4, lithography)

- [ ] Beat engine: IntersectionObserver triggers; beat kinds `text | plate | map |
      diagram | stamp`; sticky map/figure column with scrolling copy column (stacks on
      mobile per DESIGN.md).
- [ ] Map beat behavior: flyTo camera per beat, story-mode density rule (active sites
      full ink, rest ≤12%), `draw_links` ink-line animation.
- [ ] Stamp component per DESIGN.md motion spec.
- [ ] Build Chapter 4 end-to-end to full polish with a placeholder plate. This is the
      design proof — Rob reviews and signs off before replication.
- [ ] Reduced-motion variants for every interaction introduced.
- [ ] Acceptance: Rob approves the slice on a phone preview.

## Phase 3 — All chapters

- [ ] Wire chapters 0–12 through the engine (copy already in `content/chapters/`).
- [ ] Build the 3–4 in-code SVG diagrams (chapters 2, 7, 10, 11) with draw-on animation.
- [ ] Chapter 11 finale beat: the full-journey arc draw across the world map.
- [ ] Chapter 12 → atlas handoff transition (story map expands into atlas with filters
      appearing; should feel like being handed the pen).
- [ ] Progress affordance: slim chapter rail (Plex Mono numbers) for orientation/jumping.
- [ ] Acceptance: full story scroll works start to finish with placeholder plates.

## Phase 4 — Plates

- [ ] Rob generates the 13 plates with the locked prompt (DESIGN.md plate list);
      art-direction is his, batching for consistency.
- [ ] Post-process pass: normalize cream background, match ink levels, shared grain
      (scriptable in the repo: sharp or ImageMagick).
- [ ] Drop into `/public/plates/{key}.png`, responsive sizes via next/image, alt text
      for every plate.
- [ ] Acceptance: no plate visibly off-palette in a full scroll-through.

## Phase 5 — Polish & extras

- [ ] Concentration stamp recap moment in chapter 12 (all stamps reappear as a ledger).
- [ ] Scenario mode in atlas (v1: hand-authored "Taiwan disruption" — Taiwanese sites
      and 2 downstream layers dim/flag; data lives in `content/scenarios.json`).
- [ ] Methodology page: data provenance, source tiers, confidence flags, corrections
      contact. (This is what makes the piece citable.)
- [ ] "Deep Dive" page rendering `content/primer.md` with a styled TOC.
- [ ] OG image (a plate + title block), meta tags, favicon variant.
- [ ] Performance: code-split the map, lazy plates, Lighthouse pass, bundle check.

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
