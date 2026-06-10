# The Physical AI Stack — Interactive Atlas (spec package)

> **Archived 2026-06-10.** This package has been merged into the repo: `CLAUDE.md`,
> `DESIGN.md`, `PLAN.md` at root; `content/` and `data/` at root. Kept for the
> division-of-labor and data-provenance notes below.

A scroll-driven illustrated story + explorable map of the physical AI supply chain,
for robertwilliams.io/aistack. Drop this package into the site repo and build with
Claude Code.

## What's here

```
CLAUDE.md                 Project memory — Claude Code reads this every session
DESIGN.md                 Design system: tokens, type, map style, plates, motion, never-list
PLAN.md                   Phased build plan with checkboxes + session log
content/
  chapters/00–12 …        All 13 chapters: frontmatter (beats, sites, cameras) + copy
  primer.md               The full 12.5k-word technical reference ("Deep Dive" page)
data/
  sites.json              341 facilities with coords, layers, chokepoints, sources
```

## How to use

1. Copy everything into the root of the robertwilliams.io repo (merge `content/` and
   `data/` wherever the repo keeps assets — update paths in CLAUDE.md if you move them).
2. Add `NEXT_PUBLIC_MAPBOX_TOKEN` to `.env.local` and to Vercel env vars.
3. Open Claude Code and say: **"Read CLAUDE.md and PLAN.md, then start Phase 0."**
4. Each session thereafter: **"Read PLAN.md and continue."** Works from any machine —
   all state lives in the repo.

## Division of labor

- **Claude Code:** everything in PLAN.md Phases 0–3, 5, and the mechanical parts of 4 and 6.
- **Rob:** sign-off on the Phase 2 vertical slice (the design proof), art direction of the
  13 plates (locked prompt in DESIGN.md), the Phase 6 fact-verification pass, and final copyedit.

## Notes

- Chapter copy is written at the target register but its figures are **unverified until
  Phase 6** — treat hero-site numbers as drafts.
- sites.json passed automated checks (0 missing coords, 0 out-of-country coords) but is
  AI-aggregated; the methodology page should say so honestly and invite corrections.
