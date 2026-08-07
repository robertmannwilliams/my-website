# The Grid — Spec Package

*An interactive atlas of how power works in North America. Companion piece to
The Physical AI Stack; same reader, same two-mode DNA, new machine.*

Drafted 2026-08-07 from Rob's brief + four direction decisions (structure: four acts,
space-then-time; interactivity: widget moments at key beats, not a standalone game;
live data: yes, via EIA API; design: paper-ink continuity with a night set piece).
This document is the flesh-out for review. At build kickoff it splits into the
standard root pair (GRID-DESIGN / GRID-PLAN or a `/grid` docs set — TBD) the way
`docs/aistack-spec-package.md` did.

---

## What this is

A scroll-driven, map-based story that teaches a smart non-technical reader — same
canonical reader as aistack: the PE investor who is not tech-forward — how electric
power actually works in the US (and Canada, where the wires cross). Story mode walks
four acts over one persistent traveling map; free mode hands over an atlas of every
significant power plant in America, the high-voltage wires between them, and — the
signature feature — the **live grid**: real current demand and fuel mix from the
EIA's public feed. Route: `/grid`, beside `/aistack`.

## The one idea

The grid is the largest machine ever built and it has no warehouse. Electricity is
made in the same instant it is used — supply and demand balanced second-by-second
across a continent, forever. Every confusing thing about power is downstream of that
fact: why prices go negative at noon, why Texas froze in 2021, why your bill has
twelve line items, why a data center waits five years for a plug. The story's job is
to make the reader *feel* real-time balance in Act 1, then let everything else fall
out of it.

For this reader specifically, it is also a story about money: merit-order dispatch,
marginal pricing, regulated rate-of-return vs. merchant risk. That is not a sidebar;
it is Act 2.

## Reader contract — what they walk away knowing

1. Electricity can't wait. Made and used in the same instant, no meaningful storage
   (yet), balance enforced every second.
2. The physical chain: generator → step-up transformer → high-voltage transmission →
   substation → distribution → meter. Voltage goes up to travel, down to be used.
3. There is no "US grid." Three separate AC machines — Eastern, Western, Texas —
   joined by a handful of small DC doors. Quebec is a fourth. Canada is wired deep
   into the story (Hydro-Québec → New England/NY; BC and Manitoba → the West and
   Midwest).
4. Who's driving: balancing authorities and ISOs/RTOs run an auction every five
   minutes; cheapest plants run first; **everyone gets paid the price of the most
   expensive plant needed**. A third of the country has no market at all — a
   monopoly utility and a state regulator set the price instead.
5. The daily dance: baseload, the morning ramp, the solar flood, the duck curve,
   the evening peak, batteries eating the peaker business.
6. Who decides: FERC owns the wholesale/interstate layer; fifty state PUCs own your
   bill. Rates are a political artifact.
7. What's changing: demand is growing for the first time in twenty years (data
   centers — direct cross-link to `/aistack`), ~2 TW of mostly-clean projects wait
   in interconnection queues, and the binding constraint is wires, not generation.

---

## Story mode — four acts, ~32 beats

Register: the aistack plain-spoken contract. Short declaratives, concrete nouns,
jargon defined inline in the same breath it appears, no rhetorical triplets. Copy
lengths per beat match aistack (~50–80 words).

### Act 1 — The Machine (9 beats, spatial)

Follow one watt from a real plant to a real outlet. Camera does the aistack
site-to-site traversal; the journey line accumulates.

- **1.1 — Cold open: the outlet.** A plate of a wall outlet at dusk. 120 volts,
  waiting. It has been waiting your whole life. Where does it come from? *(plate)*
- **1.2 — The rule.** Electricity cannot be stored in a wire. What you draw this
  second is being made this second, somewhere. The whole story is in that sentence;
  the rest is showing it. *(diagram: a balance scale, generation left, demand right)*
- **1.3 — The plant.** Camera lands on a specific combined-cycle gas plant in
  Pennsylvania (candidate: Lackawanna Energy Center, Jessup PA — 1.5 GW, inside
  PJM, which sets up Act 2). Fire boils nothing — it spins. A generator is a magnet
  turned inside coils of copper, nothing more. *(map + plate)*
- **1.4 — The voltage trick.** To travel far, push the voltage up — 345,000 volts —
  so the current, and the heat it wastes, stays low. The switchyard is the plant's
  on-ramp. *(plate: step-up transformer)*
- **1.5 — Transmission.** Steel towers marching over ridgelines. The camera traverses
  an actual line path (HIFLD geometry) toward the city. This is the interstate
  system of power; it moves bulk, not addresses. *(map traverse)*
- **1.6 — The substation.** Voltage steps back down, neighborhood by neighborhood.
  The fenced yard of gray hardware you drive past and never see. *(map + plate)*
- **1.7 — The last mile.** Wooden poles, the gray can transformer outside the
  window: 7,200 volts becomes 120/240 at the wall. Distribution is where most
  outages actually happen — a branch, a squirrel, not a crisis. *(plate)*
- **1.8 — Arrival.** The outlet again. The trip: ~300 miles, effectively at the
  speed of light, through equipment owned by four different companies. And nothing
  along the way stored anything. *(map: full Act-1 journey line)*
- **1.9 — The reveal (act hinge).** Zoom out. Every wire east of the Rockies is
  electrically one machine — the largest ever built — spinning in lockstep at
  60 cycles a second. No warehouse, no buffer. Someone has to balance it. Every
  second. Who? *(map: Eastern Interconnection washes in)*

### Act 2 — The Choreography (10 beats, temporal — one day, chasing the sun)

The market mechanics act. Taught by watching a day unfold, not by defining terms.
Contains both widgets and the **night set piece**.

- **2.1 — The control room.** Balancing authorities: ~100 organizations whose job
  is the balance from 1.9. The big ones run markets — PJM, MISO, ERCOT, CAISO —
  and their footprints wash onto the map like survey districts. *(map: ISO regions)*
- **2.2 — 4 a.m., Pennsylvania.** Nuclear hums. Baseload: plants that run flat-out
  always, because they're cheap to run and slow to move. The country sleeps; the
  machine doesn't. *(map: Susquehanna)*
- **2.3 — 6 a.m., the ramp.** The Eastern seaboard wakes up time zone by time zone.
  Every coffee maker is 1,000 watts; forty million of them is forty nuclear plants'
  worth of new demand before 9 a.m. Someone has to turn things on — in order.
- **2.4 — The auction. WIDGET: the dispatch stack.** Every five minutes, the ISO
  runs an auction: plants bid, cheapest run first ("merit order"). The reader drags
  the demand line up through a morning and watches plants light cheapest-first —
  nuclear, wind, gas, then the expensive stuff — and the price jump to whatever the
  last plant needed costs. *(interactive)*
- **2.5 — The price everyone gets.** Marginal pricing: every running plant gets
  paid what the *most expensive needed plant* bid — the cheap nuclear plant earns
  the gas peaker's price. Sounds broken; it's the incentive doing the work. One
  paragraph, no apologetics.
- **2.6 — Noon, California.** Camera flies west with the sun. Solar floods the
  market; the duck curve (defined in one clause: net demand sags at midday, then
  cliffs upward at sunset); prices touch zero, sometimes negative — plants *paying*
  to stay on. *(map + small duck-curve chart, scrubbable time-of-day slider)*
- **2.7 — Sunset. THE NIGHT SET PIECE BEGINS.** Solar dies exactly as everyone
  comes home. The paper map dims to night — city lights, transmission lines
  faintly glowing (the one licensed glow in the piece; see Design). Peakers fire:
  expensive, fast, built to run 100 hours a year. Price spikes 10×. *(map: night)*
- **2.8 — WIDGET: hold 60 Hz.** The evening ramp, playable once: demand climbs,
  a frequency dial drifts low, the reader fires a battery — then a peaker — to hold
  60.00. Then the reveal: a computer in the ISO control room does this every four
  seconds, forever. *(interactive, night map behind)*
- **2.9 — The batteries.** What changed in the last five years: on many California
  evenings, batteries are now the largest source on the grid — charged free at
  noon, sold dear at seven. The duck curve built the battery business, and the
  battery is eating the peaker's dinner. *(night map: CA battery fleet pins)*
- **2.10 — Midnight, West Texas.** Wind at scale; power nearly free; the day
  closes where the machine never sleeps. Hold on the dark map a beat — it carries
  straight into Act 3. *(night map)*

### Act 3 — The Fault Lines (8 beats)

The map stays dark through 3.5, then returns to paper daylight at 3.6.

- **3.1 — There is no US grid.** Full-continent frame: three machines — Eastern,
  Western, Texas — each internally in lockstep, each electrically deaf to the
  others. *(night map: three interconnections as separate glowing islands)*
- **3.2 — Why Texas is an island.** 1935: stay inside the state line, stay outside
  federal jurisdiction. One regulatory dodge, ninety years of consequences.
- **3.3 — The doors.** A handful of small DC ties — the only places power can cross
  between the machines, and only a trickle. *(map: the DC ties, drawn as gates)*
- **3.4 — The fourth machine.** Hydro-Québec: its own interconnection, a province
  of dammed rivers, and high-voltage DC lines running south — on winter mornings,
  New England runs partly on Canadian water. BC and Manitoba play the same role
  out west. *(map: interchange arrows south)*
- **3.5 — Winter Storm Uri, February 2021 — SIGNATURE MOMENT.** The mapped
  sequence: cold snaps Texas → gas wells and plants freeze → demand spikes to a
  winter record → 20 GW short → minutes from frequency collapse, ERCOT sheds load.
  On the night map, the Texas glow *flickers and goes dark* — the piece's single
  gavel strike, the grid equivalent of aistack's red stamp. It could not borrow
  power. Because island. Because 1935. *(night map, the blackout animation)*
- **3.6 — What a blackout is.** Not "running out." Frequency collapse: the machine
  tearing itself apart, and operators cutting you off to save it. 4½ minutes from
  the Texas grid being gone for months. Daylight returns to the map here —
  deliberately, like the power coming back. *(map: back to paper)*
- **3.7 — Who decides.** FERC owns wholesale and interstate; fifty state PUCs own
  retail — your bill. Map wash: market states vs. the vertically-integrated third
  of the country where one monopoly utility does everything and a regulator sets
  its allowed profit. Neither model is the obvious winner; say so plainly.
  *(map: regulatory wash)*
- **3.8 — Your bill, decoded.** The stacked bar: generation / transmission /
  distribution — the same three acts of the physical chain from Act 1, priced.
  About half the bill is wires, not power. *(diagram)*

### Act 4 — The Handover (5 beats)

- **4.1 — The line bends.** Twenty years of flat US demand, then ~2023: up. Data
  centers, new factories, EVs. One chart, one sentence of cross-link: the machines
  from [the last story](/aistack) all plug into this one. *(chart)*
- **4.2 — The queue.** ~2 terawatts of proposed projects — more than the entire
  existing fleet — waiting years in interconnection queues, most of it solar,
  batteries, and wind. The bottleneck is not building the plant; it's permission
  to plug in. *(map: queue density wash)*
- **4.3 — The wires problem.** A big transmission line takes 10+ years, most of it
  permitting. The grid's next decade is decided by paperwork and rights-of-way,
  not physics. *(map: planned-line dashes)*
- **4.4 — The machine, right now. LIVE BEAT.** The live EIA panel: current national
  demand, the fuel mix at this hour, and the reader's own region if resolvable.
  "Everything you just read is happening — right now, at this scale." *(live data)*
- **4.5 — The handover.** The story map exhales into the full atlas — filters
  appear, every plant inks in, the pen changes hands. Same transition grammar as
  aistack's finale. *(atlas handoff)*

---

## The widgets (build-scoped, self-teaching, skippable)

Three interactive moments plus one scrubber. Each is a bounded component that
teaches one concept through 20–60 seconds of play, works with taps on a phone,
never blocks the scroll (the story reads fine if the reader ignores them), and has
a reduced-motion/static fallback showing the end-state with a caption.

1. **Dispatch stack (2.4).** Supply curve as a row of plant blocks sorted by bid
   (nuclear/wind ~$0 → coal/gas mid → peakers high). Reader drags the demand line;
   blocks light in merit order; a price readout jumps to the marginal block. One
   optional toggle: "add solar" — the stack re-sorts and midday price collapses,
   quietly pre-teaching 2.6.
2. **Hold 60 Hz (2.8).** A drafting-instrument frequency dial, a rising demand
   trace, two buttons: BATTERY (instant, small) and PEAKER (10-second spin-up,
   big). Let the dial drift; let the reader fail once safely (dial hits 59.9 and
   a red annotation notes "at 59.4, machines start disconnecting to save
   themselves"). Then the four-second-computer reveal.
3. **Duck-curve scrubber (2.6).** Time-of-day slider over a net-load chart tied to
   the map's sun position; midday sag, evening cliff. Smallest of the three —
   possibly just a scrubbable chart, not a "game."
4. **Live grid panel (4.4 + atlas).** Not a game — the payoff. Current demand +
   fuel-mix donut/stack per EIA region, national by default, reader's region when
   locatable (IP-region guess with a manual picker; no permission prompts).

## Atlas mode

Everything aistack's atlas learned, applied to richer data:

- **Pins:** US power plants from EIA-860. Full set is ~12,000 ≥1 MW; recommend
  shipping **≥25 MW (~5,000 plants)** for legibility, with the threshold revisited
  after clustering perf testing. Pin wash by fuel family (see Design). Size scales
  subtly with capacity_mw (three steps, not continuous).
- **Lines:** HIFLD transmission ≥230 kV, geometry-simplified at build time to keep
  the tile weight sane. Faint by default; a filter lifts them.
- **Regions:** ISO/RTO boundary layer, toggleable; regulatory wash (market vs.
  vertically integrated) as a second toggle.
- **Live overlay:** per-BA current demand as a small mono readout on region hover;
  the live panel docks in atlas mode too.
- **Filters:** fuel family (primary tabs), capacity band, ISO/region, online era
  (pre-1970 / 1970–2000 / 2000–2015 / post-2015 — the eras tell the policy story),
  status (operating / retired iff we include them / under construction).
- **Detail panel:** name, operator, fuel + technology, capacity, online year, BA,
  and a one-line "why it matters" **only for ~40–60 hand-written hero sites**
  (Palo Verde, Grand Coulee, W.A. Parish, Vogtle, the Uri cast, Robert Moses,
  Hydro-Québec's Manic-5, etc.). Do not generate 5,000 AI blurbs; the aistack
  verification lesson says hand-write the few that matter and show honest
  structured data for the rest.
- **Canada at v1:** story beats + interchange arrows + the hero Canadian sites
  as manual additions. Full Canadian plant coverage is a fast-follow, not a
  launch blocker (no single EIA-860 equivalent; per-province wrangling).

## Design direction

Full GRID-DESIGN.md comes at kickoff; the direction, per Rob's call:

- **Paper-ink continuity.** Same tokens, same Newsreader/Plex Mono pairing, same
  drafting-card grammar, same figure-caption convention. The two pieces read as
  volumes of one atlas series. Fuel-family washes reuse the existing palette
  before adding anything: nuclear = ink, gas = ochre, coal = a warm gray-brown
  (one new token, needs Rob sign-off), hydro/wind/solar/battery = teal family
  variants, oil/peakers = red family. Exact assignments at kickoff.
- **The night set piece (2.7 → 3.5).** The one licensed exception to the aistack
  never-list's no-glow rule, because here the medium is the message: power is
  visible at night. Entering 2.7 the paper wash inverts to a deep ink-navy sheet;
  city-light stipple; transmission lines carry a faint glow. It must still read
  as *printed* — a night-plate from the same atlas (think blueprint / cyanotype),
  not a NASA composite or a video game. Daylight returns at 3.6 as narrative
  punctuation. Light mode only still holds for the site; the night sheet is a
  story event, not a theme.
- **Signature moment budget: one.** Aistack spends its boldness on the red stamp;
  this piece spends it on the Uri blackout flicker (3.5). No other alarm-red
  moments, no second dark sequence.
- **Motion:** aistack rules carry over wholesale — slow flyTo, stroke draw-on,
  wash blooms, `prefers-reduced-motion` everywhere, camera never past ~z11.

## Data plan

| Need | Source | Notes |
|---|---|---|
| Plants | **EIA-860 / EIA-860M** | Official, free, updated monthly. Lat/lng, fuel, capacity, operator, online year, BA. Build-time script → `data/plants.json` mirroring the sites.json discipline. |
| Live demand & mix | **EIA v2 API** (Hourly Grid Monitor) | Free API key. Demand, net generation by fuel, interchange, per BA, ~1–2h lag. |
| Transmission | **HIFLD** open GIS | Lines ≥69 kV available; ship ≥230 kV simplified GeoJSON. |
| ISO/RTO boundaries | Public shapefiles (EIA/HIFLD) | Static GeoJSON layer. |
| Queue data (4.2) | **LBNL "Queued Up"** annual report | Aggregate numbers for the beat; not per-project pins at v1. |
| Uri sequence (3.5) | ERCOT/FERC-NERC final report | Hand-checked numbers; this beat gets the strictest verification. |
| Canada hero sites | Manual entries | Hydro-Québec, IESO, AESO public data. |

**The one backend departure:** aistack is statically pure; the live feature wants a
single Next.js API route (`/api/grid/live`) proxying the EIA API with the key
server-side (`EIA_API_KEY`, gitignored + Vercel env) and responses cached
(revalidate ~10 min — well under any rate limit, fresh enough for a 1–2h-lagged
feed). Failure mode: the panel degrades to a labeled recent snapshot baked at
build time — the story must never show a spinner or an error state.

**Verification discipline (aistack Phase 6 lesson, applied from day one):** every
number in story copy gets a source line in a `content/grid/facts.md` ledger *as it
is written*, not retro-fitted. Hero-site claims hand-checked. EIA-860-derived
fields are trusted as official but spot-checked for the hero sites.

## Architecture & reuse

- Route `/grid` in the App Router beside `/aistack`; feature code under
  `src/features/grid/`, mirroring `src/features/atlas/`.
- **Reused with light generalization:** beat engine (IntersectionObserver hook,
  beat-kind rendering, sticky map + copy column), chapter/beat content pipeline
  (gray-matter, per-beat copy split, loud build-time validation now pointed at
  `plants.json`), camera choreography + journey line, drafting-card UI grammar,
  pin/cluster machinery.
- **New builds:** night style variant (second Mapbox style or runtime layer-paint
  swap — decide in the map spike, the day/night crossfade is the risky bit), the
  three widgets, the live API route + panel, transmission-line layer, fuel-family
  pin system.
- **New beat kinds:** `widget` (names a registered component) and `live`. Content
  schema otherwise identical to aistack's.
- Same session protocol, same commit/preview rhythm, mobile as first review
  surface.

## Build phases (sketch — full PLAN at kickoff)

- **Phase 0 — Data + scaffold.** EIA-860 → `plants.json` pipeline; HIFLD line
  simplification; route scaffold; content pipeline generalized; EIA API key
  working locally + on Vercel.
- **Phase 1 — Map spike.** Extend the paper style with fuel-washed pins and the
  transmission layer; **prove the night set piece** (the day/night transition is
  the highest design risk in the piece — front-load it). Atlas mode shippable.
- **Phase 2 — Vertical slice: Act 2.** The design proof, because it contains both
  widgets, the night transition, and the temporal camera. Rob signs off before
  replication.
- **Phase 3 — All acts.** Copy authored to the register contract, facts ledger
  alongside; Uri sequence; diagrams.
- **Phase 4 — Live layer.** API route, panel, atlas overlay, degraded fallback.
- **Phase 5 — Verification + polish.** Facts ledger audit, reduced-motion pass,
  perf pass on 5,000 pins + line layer, phone QA.

## Open questions for Rob

1. **Title.** Working candidates: *The Grid* (plain, confident), *The Largest
   Machine* (the hook is in the name), *How Power Works*. Current lean: **The
   Largest Machine**, with "an interactive atlas of the North American grid" as
   the deck.
2. **Plant threshold:** ≥25 MW (~5,000 pins, richer) vs. ≥50 MW (~3,500, calmer).
   Recommend deciding on a real device in Phase 1, not now.
3. **Retired plants** in the atlas (the coal fleet's ghost is a real story) or
   operating-only at launch? Lean: operating + under-construction at v1.
4. **One new palette token** (coal's gray-brown) needs sign-off under the
   no-new-hex rule.
5. Confirm the night set piece is worth the style-fork cost before Phase 1 spikes
   it — it's the piece's biggest new design risk and its best set piece.
