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

- [ ] Extend the paper style for the grid: fuel-washed pin system per GRID-DESIGN
      (glyph ticks, capacity steps, construction rings), clustering tuned for
      ~5,000 pins (perf-test the 25 MW threshold on a real phone; drop to 50 MW
      only if it actually chugs).
- [ ] HIFLD transmission ≥230 kV → simplified GeoJSON (build script; document
      simplification tolerance); faint day-map layer + filter lift.
- [ ] ISO/RTO boundary layer; regulatory wash toggle.
- [ ] **The night proof** (highest design risk — do not defer): day→night sheet
      crossfade on the real map style, transmission lamp-glow, city stipple,
      night tokens. Screenshot review with Rob before anything else builds on it.
- [ ] Atlas mode assembled: filters (fuel family tabs, capacity band, region,
      online era, status), detail panel, search. Independently shippable.
- [ ] Acceptance: atlas pleasant on a phone; Rob signs off night proof + coal token.

## Phase 2 — Vertical slice: Act 2 (the design proof)

- [ ] Generalize the aistack beat engine + content pipeline for `content/grid/`
      (new beat kinds: `widget`, `live`); loud validation against plants.json.
- [ ] Act 2 copy authored (register contract; facts ledger entries as written).
- [ ] Dispatch-stack widget (2.4) incl. "add solar" toggle + static fallback.
- [ ] Duck-curve scrubber (2.6) tied to map sun position.
- [ ] Hold-60Hz widget (2.8) on the night map + static fallback.
- [ ] Temporal camera choreography (PA → CA → TX with the sun); night entrance
      at 2.7 sequenced with the story, not scroll position.
- [ ] Acceptance: Rob approves the slice on a phone preview before replication.

## Phase 3 — All acts

- [ ] Acts 1, 3, 4 copy authored (facts ledger alongside; Uri numbers against the
      FERC/NERC final report — strictest check in the piece).
- [ ] Act 1 plates + the watt's-journey camera path along real line geometry.
- [ ] Act 3: interconnection islands frame, DC-tie "doors" beat, Hydro-Québec
      interchange arrows, **the Uri flicker** (signature moment, reduced-motion
      variant per GRID-DESIGN), daylight return at 3.6, regulatory wash beat,
      bill-decoded diagram.
- [ ] Act 4: demand-bends chart, queue beat, wires beat, atlas handover transition.
- [ ] Hero-site blurbs: ~40–60 hand-written `why_it_matters` entries (incl. the
      Canadian hero sites as manual plant entries).
- [ ] Acceptance: full story scroll start to finish.

## Phase 4 — Live layer

- [ ] `/api/grid/live`: EIA v2 proxy, key server-side, ~10 min cache, baked
      snapshot fallback (never a spinner/error per GRID-DESIGN).
- [ ] Live panel (4.4): national demand + fuel mix now; region picker (IP guess,
      manual override, no permission prompts).
- [ ] Atlas live overlay: per-BA demand readout on region hover; docked panel.
- [ ] Acceptance: panel correct against EIA's own dashboard; fallback verified by
      simulating API failure.

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
