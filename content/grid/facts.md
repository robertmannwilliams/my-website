# Facts ledger — The Largest Machine

Every number or checkable claim in story copy gets a line here AS IT IS
WRITTEN (GRID-PLAN discipline; audited in Phase 5). Format:
`beat · claim · source · status`.

## Act 2

- 2.1 · "several dozen balancing authorities" · EIA Hourly Grid Monitor lists
  ~65–70 active US balancing authorities · TO VERIFY exact count at audit
- 2.2 · Susquehanna ≈ 2,500 MW (2,532), online 1983, PA, nuclear ·
  data/plants.json eia-6103 (EIA-860M June 2026) · OK
- 2.2 · "running flat out most hours" · US nuclear fleet capacity factor >90%
  (EIA) · TO VERIFY current-year figure
- 2.3 · coffee maker ≈ 1,000 W · typical drip machine rating 900–1,200 W ·
  OK (illustrative)
- 2.3 · "forty million coffee makers = 40 GW = sixteen Susquehannas" ·
  40M × 1 kW = 40 GW; 40 / 2.532 ≈ 15.8 · OK (caught and corrected in
  drafting — first version said "forty Susquehannas"). Eastern morning ramp
  is tens of GW (EIA hourly data) · OK
- 2.4 · five-minute real-time dispatch auctions · PJM/MISO/CAISO/ERCOT market
  design docs · OK
- 2.5 · uniform clearing price = marginal unit's offer · standard LMP market
  design (FERC/ISO primers) · OK
- 2.6 · Solar Star ≈ 597 MW combined, "as much as a nuclear reactor" · eia-58388
  (318 MW) + eia-58389 (279 MW); typical reactor 600–1,100 MW — phrase "as much
  power as a nuclear reactor" is at the generous edge (small reactor) ·
  BORDERLINE — soften or keep, decide at audit
- 2.6 · rooftop solar >> Solar Star: CA behind-the-meter solar ~15+ GW vs
  0.6 GW · CEC/CAISO BTM estimates · TO VERIFY figure
- 2.6 · midday prices at zero/negative · CAISO negative-price intervals,
  well documented · OK
- 2.7 · peakers run "a few hundred hours a year" · typical CT capacity factors
  <10% (EIA) · OK
- 2.8 · 60 Hz lockstep; "half a percent" drift → protective action · 59.7 Hz
  ≈ 0.5% low; UFLS relays begin around 59.3–59.7 Hz in ERCOT/Eastern schemes ·
  TO VERIFY exact thresholds; copy says "hardware starts protecting itself" —
  deliberately unspecific
- 2.8 · "every four seconds" · AGC (automatic generation control) cycles every
  2–6 s, commonly cited 4 s · OK
- 2.9 · Menifee Power Bank 680 MW, 2024, near LA · data/plants.json eia-66494 ·
  OK ("outside Los Angeles": Menifee, Riverside County, ~120 km — acceptable)
- 2.9 · batteries briefly biggest source on CA evenings · CAISO supply data,
  first observed 2024, now routine on spring/summer evenings · TO VERIFY a
  citable instance
- 2.10 · Horse Hollow wind, West TX (735 MW) · data/plants.json eia-56291 · OK
- 2.10 · "cheapest hours in America" (West TX night wind, frequent
  negative/near-zero LMPs) · ERCOT West hub historical LMPs · TO VERIFY

## Widget data (illustrative, labeled as such in-widget)

- dispatch-stack · stylized one-region stack (wind 8 GW @$0, solar +15 GW
  @$0 toggle, nuclear 10 @$2, hydro 6 @$8, coal 12 @$28, gas CC 25 @$40,
  peakers 10 @$160, oil 4 @$250) · magnitudes echo typical marginal-cost
  ordering (EIA/Lazard) · ILLUSTRATIVE — not a real region
- duck-curve · stylized CAISO-shape day (demand 18–34 GW band, solar bell
  peaking ~14 GW) · shape per CAISO duck-curve charts · ILLUSTRATIVE
- hold-60 · dial band 59.7–60.3 Hz; battery instant, peaker ~10 s spin-up ·
  response-time orders of magnitude per NREL/ISO primers · ILLUSTRATIVE
