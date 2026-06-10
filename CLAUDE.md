# The Physical AI Stack — Interactive Atlas

## What this is

An interactive, scroll-driven story for robertwilliams.io that walks a smart non-technical
reader (canonical reader: a successful PE investor who is not tech-forward) through the entire
physical AI stack — from quartz mines to the model answering a ChatGPT question — and ends by
handing the reader an explorable atlas of 341 real facilities.

Two modes, one page:
1. **Story mode** — one continuous flow of ~39 scroll "beats" (authored in 13 section
   files; no chapter headers are rendered — transitions live in the prose). Beats mix
   illustrated plates, ONE persistent ink-styled Mapbox map whose camera travels
   site-to-site as you scroll (a faint journey line accumulating behind it),
   hand-drawn-style diagrams, and a single red "stamp" moment (ASML).
2. **Atlas mode** — the finale hands over the controls: full map of all sites in
   `data/sites.json` with filters, clustering, and a detail panel per site.

(Story-mode shape revised 2026-06-10 per Rob's structural reflection: chapters and all
but one stamp removed, plain-language register, traversing camera.)

Read `DESIGN.md` before writing any UI code. Read `PLAN.md` to find the next task.

## Where it lives

- This builds INTO Rob's existing Next.js site (github + Vercel). Target route: `/aistack`
  (replaces the current work-in-progress page at that route).
- App Router, TypeScript, React. Deploys on push via Vercel; every commit gets a preview URL.
  Rob reviews previews on his phone — mobile is a first-class review surface.

## Stack decisions (fixed)

- **Map:** Mapbox GL JS with a custom "paper & ink" style (spec in DESIGN.md §Map).
  Token in `NEXT_PUBLIC_MAPBOX_TOKEN` (`.env.local`, gitignored; also set in Vercel).
  Projection: `mercator` (atlas-plate feel, NOT a spinning globe).
- **Scroll:** IntersectionObserver-based beat triggers. No heavyweight scrolly framework
  required; a small custom hook is fine. Keep scroll handling passive and cheap.
- **Animation:** SVG stroke draw-on (`stroke-dashoffset`), opacity/wash blooms, and the
  stamp interaction. `framer-motion` permitted but not required. Respect
  `prefers-reduced-motion` everywhere.
- **Styling:** CSS variables for every token in DESIGN.md. No Tailwind default look,
  no shadcn, no component library. Plain CSS modules or vanilla-extract — your call.
- **Data:** `data/sites.json` imported statically; rendered as a GeoJSON source.
  No backend, no database, no API routes.

## Discretion split

**Fixed (do not change without Rob's sign-off):**
- Chapter order and beat structure as authored in `content/chapters/`
- Design tokens, type pairing, map style direction, and the never-list in DESIGN.md
- The story → atlas page structure; route `/aistack`
- `data/sites.json` schema

**Your call (use judgment, optimize for quality):**
- Component architecture, file layout, hooks, state management
- Library choices within the constraints above
- Micro-interactions, easing curves, exact timings (within DESIGN.md motion rules)
- Performance strategy (clustering thresholds, marker virtualization, image loading)
- Refactors at any time if they improve the code

## Content schema

Chapters are markdown files in `content/chapters/` with YAML frontmatter:

```yaml
id: 4
slug: lithography
title: "The Machine That Prints"
kicker: "Toolchain"            # mega-layer label, shown as an eyebrow
beats:
  - id: 4.1
    kind: plate                # plate | map | diagram | stamp | text
    plate: euv-machine         # asset key, resolves to /public/plates/{key}.png — plate kind only
  - id: 4.2
    kind: map
    sites: [asml-veldhoven-hq] # ids from data/sites.json; camera resolves to first site
    camera: { zoom: 5 }        # optional overrides: center, zoom, pitch, bearing
  - id: 4.3
    kind: map
    sites: [asml-veldhoven-hq, zeiss-smt-oberkochen, asml-cymer-san-diego, asml-wilton-ct]
    draw_links: true           # ink lines draw between sites, first site is the hub
  - id: 4.4
    kind: stamp
    stamp: "ONE COMPANY"
```

Copy lives under `## Beat {id}` headings in the body. Parse frontmatter + split copy by
beat heading at build time (gray-matter or similar). Site ids MUST resolve against
sites.json — fail the build loudly if one doesn't.

## data/sites.json (341 sites)

Key fields: `id`, `name`, `operator`, `layer`, `mega_layer` (Inputs / Toolchain / Silicon /
Systems / Deployment), `sub_type`, `lat`/`lng`, `status` (operational / construction /
planned), `why_it_matters`, `capacity`, `capex_usd_b`, `key_customers`,
`jurisdiction_bloc` (us / allied / china / neutral), `chokepoint_severity`
(monopoly / duopoly / diversified / na), `confidence`, `sources`.

Atlas filters: mega_layer (primary), layer, bloc, chokepoint_severity, status. Detail
panel shows why_it_matters, operator, status, capex, customers, and source links.

## Known gotchas

- **Co-located sites:** 41 pairs share near-identical coords (Hsinchu, Hwaseong, Santa
  Clara clusters). Cluster at low zoom; offset/spiderfy on expansion. Never stack pins.
- **Coordinate precision is city-level**, not parcel-level. Do not zoom story cameras past
  ~z11 on a specific pin; frame the area instead.
- **Light basemap + 341 points = mud.** In story mode show ONLY the active chapter's sites
  at full ink; all others at ~12% opacity or hidden. Full density is reserved for atlas mode.
- **Copy numbers need a verification pass** (PLAN Phase 6) before launch. Source data was
  AI-aggregated; hero-site claims get hand-checked against the `sources` URLs.
- The full technical primer lives at `content/primer.md` — link it as a "Deep Dive"
  page, but never inline its prose into the story.

## Session protocol

1. Read PLAN.md. Continue from the first unchecked task in the current phase.
2. Work in small commits with descriptive messages. Push so Vercel cuts a preview.
3. Before ending: check off completed tasks in PLAN.md, add a dated line to the
   Session Log at the bottom of PLAN.md (what was done, what's next, any open questions
   for Rob), and commit.
4. If a task is ambiguous, make the smaller reversible choice and note it in the log
   rather than stalling.

## Commands

- `npm run dev` — local dev
- `npm run build` — must pass before every push
- `npx tsc --noEmit` — typecheck
