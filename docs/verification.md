# Claim verification — The Physical AI Stack

*Pass run 2026-06-10 against the rewritten copy (Phase 3.5). Method: every
hero claim checked against the site's listed `sources` URLs, corroborated by
web search where those were thin. 29 claim clusters: **26 confirmed, 3 fixed
in copy** (marked ⟶ FIXED below). Items marked JUDGMENT are editorial calls,
left as written with reasoning. Rob: spot-check anything here against the
cited links; the per-claim verdicts below are the audit trail.*

## Fixed in copy (2026-06-10)

1. **EUV shipping containers** — copy said "thirteen containers"; the
   canonical ASML/Intel/CNBC figure is **40 freight containers / 20 trucks /
   3 Boeing 747s**. ⟶ FIXED to "forty freight containers — about three jumbo
   jets' worth." (cnbc.com/2022/03/23/inside-asml…, Intel newsroom PDF)
2. **Zeiss mirror flatness** — copy said bump "a few millimeters" at
   country-scale; Zeiss says **0.1 mm at Germany-scale**, ASML's variant says
   ~1 mm. ⟶ FIXED to "stretched to the size of Germany itself… less than a
   millimeter." (zeiss.com semiconductor-manufacturing-technology, asml.com
   lenses-and-mirrors)
3. **CUDA age** — "fifteen years and counting" undersold it; CUDA shipped
   2007, ~19 years by mid-2026. ⟶ FIXED to "nearly two decades."
4. *(belt-and-braces, same pass)* **Wafer share** "about ninety percent" sat
   at the top of the source range (current best: ~82% revenue / ~85% of
   300mm among the top five). ⟶ SOFTENED to "more than eighty percent."
   **Model file size** "a couple of terabytes" is unpublishable-by-labs
   estimate territory (open frontier weights ~0.8–2 TB). ⟶ HEDGED to "likely
   a terabyte or two."

## Confirmed (selected, with the strongest source)

- **Spruce Pine**: two operators (Sibelco, The Quartz Corp), 70–90% of world
  ultra-high-purity quartz for CZ crucibles; Helene flooded Sept 2024, ~2-week
  shutdown, industry-wide alarm. (construction-physics.com, npr.org)
- **Eleven nines polysilicon**: Tokuyama states 99.999999999% verbatim;
  Wacker's new line exceeds twelve nines; NIST: Hemlock "one of just five
  companies in the world" at leading-edge purity, plants in DE/US/JP. ✓
- **EUV physics**: TRUMPF confirms 50,000 tin droplets/second → plasma;
  cost ~$150–250M (High-NA ~$350–380M) = "a few hundred million." ✓
- **ASML sole supplier**: Nikon/Canon exited EUV; China prototype ~2025 not
  production-ready before 2028–2030 (CSET) = "a decade or more." ✓
- **Fabs**: $20B+ leading-edge (Fab 18 ≈ $20B); ISO 1–5 cleanroom vs OR ≈
  ISO 7 = "thousands of times cleaner"; ~3 months, FOUP-robot handled. ✓
- **TSMC**: ~90% of most-advanced chips, all top NVIDIA + Apple processors;
  west-coast fab cluster; strait ~81–110 miles. ✓
- **Arizona**: N4 volume production since Q4 2024, $6.6B CHIPS award, ~3–5
  years behind Taiwan nodes, wafer premium <10% (TechInsights) = "costs
  more"; expanding, fully booked. ✓
- **HBM**: exactly three suppliers (SK Hynix ~50–62%, Samsung, Micron);
  Korean corridor south of Seoul; sold out through 2026, orders into
  2027–28. ✓
- **Packaging**: reticle limit 858 mm² ("matchbook" fair); CoWoS ≈ TSMC
  near-100% for AI chips, all Taiwan facilities; the 2024–26 binding
  constraint alternated CoWoS/HBM — "often the part the world ran out of
  first" holds. US packaging (Amkor Peoria) starts ~2028. ✓
- **"Printed on Taiwan and bonded on Taiwan"**: Arizona-made dies currently
  return to Taiwan for packaging. ✓
- **NVL72**: 72 GPUs + 36 CPUs, fully liquid-cooled, ~1.36 t ≈ "a car." ✓
- **Memphis**: former Electrolux plant, 122 days ("about four months"),
  on-site gas turbines per Memphis Chamber. ✓
- **Stargate**: $500B program, sites in TX (Abilene/Shackelford/Milam), NM
  (Doña Ana), WI (Port Washington), MI (Saline) — state list matches; small
  OH site omitted but sentence isn't exhaustive. ✓
- **Apollo comparison**: Apollo ≈ $190–310B in today's dollars; big-four
  hyperscaler capex ~$388B (2025) → ~$600B+ planned (2026). ✓
- **Loudoun**: largest concentration on Earth; Dominion quotes 4–7 year
  hookups for >100MW = "five years or more." ✓
- **Gigawatt campus**: typical US reactor ≈ 1 GW; Abilene 1.2 GW, Doña Ana
  2.2 GW. ✓
- **Three Mile Island**: closed 2019 (economics); Crane Clean Energy Center
  restart targeted H2 2027 (FERC waiver June 2026); Microsoft 20-year
  835 MW PPA for the full output. "Is being restarted" accurate as of
  publication — **revisit wording after startup (2027)**. ✓
- **GPU cores**: B200 = 20,480 CUDA cores ("twenty thousand simple
  workers"); H100 = 16,896. ✓
- **NVIDIA**: founded 1993, GeForce 256 1999 → "two decades for gamers";
  world #1 by market cap (~$5T) mid-2026. ✓
- **Campus GPU counts**: Colossus ~555k GPUs (Jan 2026), Abilene building to
  450k+ GB200s = "hundreds of thousands." ✓
- **Inference economics**: inference ≈ two-thirds of AI compute in 2026
  (Deloitte), majority of AI-IaaS spend (Gartner). ✓

## Editorial judgments (left as written, with reasoning)

- **"Two seconds"** — measured chat TTFT ~0.6–4s; a short answer completes
  in seconds. Fair lived-experience shorthand.
- **"The largest calculation humans perform"** — frontier runs at 1e26–1e27
  FLOP exceed any single scientific computation by orders of magnitude;
  only aggregate Bitcoin hashing rivals it and isn't one calculation.
- **"Most expensive object per pound ever made"** — rhetorical; hedged with
  "may be" in copy.
- **"Nearly all of the world's ultra-pure quartz"** — top of the 70–90%
  range but the standard formulation for the ultra-high-purity grade.

## Residual risk register

- Statuses drift (TMI startup, Arizona fab 2 ramp, Stargate sites) — the
  data snapshot is dated in the methodology page; re-run this pass at any
  major refresh.
- sites.json field values (capacity, capex per site) were NOT individually
  re-verified in this pass — story copy was the target. Atlas detail-panel
  numbers inherit source links per site for reader verification.
