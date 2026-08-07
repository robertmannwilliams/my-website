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

## Act 1

- 1.1 · outlet holds 120 V · US standard 120 V nominal · OK
- 1.3 · Lackawanna Energy Center, Jessup PA, ~1,500 MW gas, PJM ·
  data/plants.json eia-60357 (1,498.5 MW) · OK
- 1.4 · step-up to 345,000 V · 345 kV is a standard EHV class in PJM;
  generator output typically 13.8–24 kV · OK (illustrative but typical)
- 1.5 · "every circuit above 220,000 volts" on the sheet · matches the
  transmission layer filter (VOLTAGE >= 220) · OK
- 1.7 · pole transformer 7,200 V → 120/240 V · standard US distribution
  primary/secondary · OK
- 1.7 · most outages born in distribution · DOE/EIA reliability data —
  majority of customer outage-minutes originate in distribution · TO VERIFY
  a citable stat
- 1.8 · "very nearly the speed of light" · EM energy propagation in
  conductors is a large fraction of c · OK (phrase kept loose on purpose)
- 1.9 · Eastern Interconnection lockstep at 60 Hz · standard · OK

## Act 3

- 3.1 · three interconnections, electrically separate AC islands · NERC ·
  OK (map layer is a whole-state approximation, marked provisional)
- 3.2 · 1935 federal jurisdiction over interstate utilities → Texas
  isolation · Federal Power Act of 1935; standard ERCOT-history account ·
  OK — phrase "one regulatory dodge" is editorial, keep
- 3.3 · "a dozen-odd doors, combined capacity a rounding error" · E–W
  back-to-back ties ≈ 1.3 GW; ERCOT ties ≈ 1.2 GW vs 70–120 GW machine
  peaks · TO VERIFY totals + tie list (ties.json is hand-authored,
  city-level, provisional)
- 3.4 · Hydro-Québec HVDC into New England + NY · Phase II HVDC (Radisson–
  Sandy Pond/Ayer) ~2,000 MW; Châteauguay + CHPE to NY · TO VERIFY current
  line set (CHPE in service 2026?)
- 3.5 · Uri: ~20,000 MW tripped/shed; 4.5 M homes; frequency below 59.4 Hz;
  minutes from months-long collapse; 246 deaths · FERC/NERC Nov 2021 final
  report (load shed max ~20 GW; ~4.5 M customers); TX DSHS final death
  count 246; the "minutes / 59.4 Hz for ~4 min" detail · STRICTEST CHECK —
  verify every figure against the FERC/NERC report before launch
- 3.6 · blackout = frequency collapse + load shedding as defense · standard
  power-systems account · OK
- 3.7 · FERC wholesale/interstate vs 50 state commissions retail · Federal
  Power Act split · OK
- 3.8 · "roughly half the bill is delivery" · EIA residential price
  components: generation ≈ 55–60%, T&D ≈ 40–45% · BORDERLINE ("roughly
  half" leans generous) — TO VERIFY latest split
- 3.8 · "bill climbs → usually the wires" · recent rate growth driven by
  T&D investment (EIA/RMI analyses) · TO VERIFY

## Act 4

- 4.1 · flat demand ~2005–2022, bend ~2023, data centers/factories/EVs ·
  EIA annual retail sales + recent EIA/NERC growth outlooks · OK, TO VERIFY
  bend year phrasing
- 4.2 · ">2 TW in queues, more than the existing fleet, mostly clean" ·
  LBNL "Queued Up" (~2.6 TW active at end-2023; fleet ≈ 1.3 TW) · TO VERIFY
  latest edition's number
- 4.3 · major transmission takes 10+ years, mostly permitting · DOE/ACEG
  transmission studies · OK (typical-case claim)
- 4.4 · auctions every five minutes; "few thousand humming plants" ·
  matches 2.4; 4,682 operating plants ≥25 MW in this dataset · OK

## Widget data (illustrative, labeled as such in-widget)

- dispatch-stack · stylized one-region stack (wind 8 GW @$0, solar +15 GW
  @$0 toggle, nuclear 10 @$2, hydro 6 @$8, coal 12 @$28, gas CC 25 @$40,
  peakers 10 @$160, oil 4 @$250) · magnitudes echo typical marginal-cost
  ordering (EIA/Lazard) · ILLUSTRATIVE — not a real region
- duck-curve · stylized CAISO-shape day (demand 18–34 GW band, solar bell
  peaking ~14 GW) · shape per CAISO duck-curve charts · ILLUSTRATIVE
- hold-60 · dial band 59.7–60.3 Hz; battery instant, peaker ~10 s spin-up ·
  response-time orders of magnitude per NREL/ISO primers · ILLUSTRATIVE
