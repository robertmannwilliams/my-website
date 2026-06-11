# HERO.md — The self-painting homepage hero

Build spec for the robertwilliams.io landing hero: an American-impressionist painting
that paints itself on load, responds to real NYC weather and time, stirs under the
cursor, and reveals its underdrawing on press-and-hold. Rob's instructions live in
`hero/ROB-GUIDE.md`; this file is for Claude Code.

## Behavior spec (the contract)

1. **First load:** the hero canvas replays ~8–15k brush strokes over ~5–6s with a
   tempo curve — broad early washes land quickly, accents arrive deliberately. Ends
   holding the finished painting. Must feel like painting, never like progressive
   image loading.
2. **Repeat views (same session):** 1.5s fast replay on return to home; never the
   full performance twice. (sessionStorage flag.)
3. **Variant selection — visitor-keyed:** time of day comes from the visitor's own
   clock (client Date()); weather comes from the visitor's approximate location via
   Vercel's IP geo headers (request geo: city, latitude, longitude — no permission
   prompt, never the browser Geolocation API), fed to Open-Meteo (free, no key).
   Fallback chain: missing/invalid geo → NYC (40.71, -74.01). Selection: snowing →
   snow (if asset exists, else rain); precipitation → rain; night hours → nocturne
   (if asset exists, else dusk); evening → dusk; July 4 after dark → fireworks (if
   asset exists); otherwise → master. Weather fetch is non-blocking, 1s timeout,
   cached 30min; default master. Optional flourish (Rob's call, behind a flag): the
   hero's figure caption names the visitor's city — "Fig. 1 — The Buildout. Painted
   for rain over {city}." Privacy posture: coarse IP-derived city only, nothing
   stored, no consent prompt required.
4. **Cursor as breeze (desktop) / drag (touch):** pointer movement applies a local
   wind field — nearby strokes displace 1–4px with velocity falloff and spring back;
   a soft dapple of warmth (+value, small radius) trails the pointer. Subtle: at rest
   the painting is completely still. No permanent change.
5. **Press-and-hold (≥350ms):** the underdrawing ghosts through — strokes fade to
   ~25% opacity in a soft radial zone around the pointer revealing `underdrawing.png`
   beneath; releases spring back over ~600ms. (The pentimento moment.)
6. **Fallbacks:** `prefers-reduced-motion` → instant final frame, no replay, no wind.
   No-JS → static `<img>` of the final frame. The final frame is also the OG image.
7. **Responsive:** one stroke field, windowed — desktop renders the full 21:9 sweep;
   mobile renders a centered vertical crop of the same field. No separate mobile asset.
8. **Performance budget:** stroke file ≤ 600KB gzipped; first paint of the page not
   blocked by hero assets (canvas mounts with paper color, performance starts when
   stroke file arrives); steady-state ≤ 4ms/frame on a mid phone (batch draws, cap
   devicePixelRatio at 2, pause rAF when tab hidden or hero off-screen).

## Asset contract (provided by Rob in hero/sources/)

`master.png` (required), `variant-dusk.png`, `variant-rain.png` (required),
`variant-snow.png` (optional), `underdrawing.png` (required),
`order-map.png` (optional — 4-tone grayscale, white = paint first … black = last).
Variants may drift a few px from the master; the pipeline samples colors with a 3×3
median to tolerate it. If a variant is grossly misregistered, flag it to Rob rather
than shipping it.

## Phase 1 — Decomposition pipeline + proof strip (gate)

`scripts/hero-decompose.mjs` (Node + sharp), run offline, committed outputs:

1. Load master at full res. Compute per-pixel **edge density** (Sobel magnitude,
   blurred) and **orientation** (structure tensor angle, smoothed).
2. **Sample strokes:** blue-noise-ish sampling, density and stroke size inversely
   tied to edge density (calm sky → fewer, broader strokes; figures → many small).
   Target 8–15k strokes. Each stroke: x, y, length, width, angle (along local
   orientation), color (3×3 median at x,y).
3. **Order:** if `order-map.png` exists, bucket by its 4 tones then jitter within
   buckets. Else heuristic: order = weighted blend of luminance (light first),
   saturation (gray before vivid), and edge density (calm before detailed); clamp
   so strokes within a region stay loosely grouped — the goal is washes → masses →
   street → accents.
4. **Variant color fields:** resample each variant at the master's stroke positions
   (same geometry, new colors) → variants cost only bytes of color data.
5. **Edge dissolve:** apply a painterly alpha/density falloff to the stroke field
   toward the canvas edges (noise-modulated, not a clean vignette) so the painting
   thins into the page's paper background. No transparency in source assets; the
   fade is a property of the stroke field. Final-frame JPEGs bake the same falloff
   over the site paper color.
6. **Output:** `public/hero/strokes.bin` — quantized binary (Uint16 positions,
   Uint8 sizes/angle/colors per field) + small JSON header. Plus
   `public/hero/final-{variant}.jpg` stills and `public/hero/og.jpg`.
7. **Proof strip:** `scripts/hero-proof.mjs` renders the master field at
   20/50/80/100% completion into one wide PNG → `hero/proof-strip.png`.

- [x] Pipeline runs on Rob's sources without manual tweaking. (Reworked twice
      per Rob's gate notes. Round 1 notes → Hertzmann-style error-driven
      refinement, tier-scale tensor orientation, computed order with toning
      wash + forced-late accents. Round 2 notes → oil-paint rendering: tier-0
      tiles the full canvas at ~38% overlap (coverage 100.0% interior), curved
      tapered stamp strokes (5 procedural bristle stamps swept 1-3 segments
      along a bezier), 90-96% opacity wet blending + linen grain, footprint
      area-average color with chroma restore, then global value+chroma
      calibration to the master histogram — converged in 3 autonomous rounds
      (contact sheets 1-3 committed): mean RGB within 1/255 per channel, sat
      24.4% vs master 25.4%, 38,140 strokes. strokes.bin is 651 KB gz against
      the original 600 KB budget — overage authorized by Rob's gate-2 note,
      logged in PLAN.md.)
- [x] Proof strip committed and shown to Rob
- [ ] **GATE: Rob approves the strip** (round 3 pending — oil-paint rework above)

## Phase 2 — The player

`components/HeroPainting.tsx` (client component, canvas 2D first — only escalate to
WebGL if the frame budget fails on a real phone):

- [ ] Stroke renderer: each stroke drawn as a rotated rounded-rect/ellipse dab;
      batch by setTransform; draw onto an offscreen canvas that accumulates, so
      steady-state cost is compositing, not redrawing 12k strokes
- [ ] Replay scheduler with tempo curve (ease: fast attack, slow finish; slight
      per-stroke jitter so nothing feels mechanical)
- [ ] Session-aware replay length (full vs 1.5s fast)
- [ ] Reduced-motion + no-JS static paths; lazy-mount via IntersectionObserver
- [ ] Acceptance: full performance on desktop + iPhone preview, 60fps steady state

## Phase 3 — Atmosphere

- [ ] Wind field: pointer velocity → local displacement with spring-back (strokes
      near the pointer redraw from the live layer; cap the active set ~600 strokes)
- [ ] Warm dapple following the pointer (temporary +L on affected strokes)
- [ ] Press-and-hold pentimento: radial mask → underdrawing beneath; 600ms release
- [ ] Touch equivalents; ensure page scroll is never hijacked (vertical pan passes
      through; wind only on horizontal-ish movement)
- [ ] All atmosphere disabled under reduced motion

## Phase 4 — World-keying + integration

- [ ] Geo middleware/server component exposing visitor city + coords; Open-Meteo
      fetch (timeout 1s, cached 30min) + visitor-local hour → variant pick per
      Behavior §3; NYC fallback verified by faking absent headers
- [ ] Crossfade rule: variant applies at load only — never mid-session swaps
- [ ] Replace current homepage hero; keep page structure; final-frame `<img>`
      fallback inside `<noscript>`; OG/meta updated to og.jpg
- [ ] Lighthouse: no regression on LCP (the paper-color canvas + early static
      fallback should keep LCP honest); a11y ≥ 95; verify Safari iOS
- [ ] Session log updated; Rob reviews the Vercel preview on his phone

## Notes for the build

- The current homepage shows a reference-sketch SVG and the Hassam-style header
  image — retire them from the hero but keep the files; the underdrawing peek
  replaces the sketch's role conceptually.
- Respect the site design language (cream, ink blue, Newsreader/Plex Mono if/when
  the site adopts the shared DESIGN.md tokens). The hero itself is a painting —
  chrome around it stays minimal.
- Do not add a loading spinner anywhere near the hero. The paper-colored canvas IS
  the loading state; the first strokes arriving ARE the reveal.
- Keep `hero/sources/` PNGs out of the client bundle; they are pipeline inputs only.
