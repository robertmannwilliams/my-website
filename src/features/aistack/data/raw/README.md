# AI Stack Map — Dataset v1

Interactive globe dataset mapping the physical AI supply chain across 14 layers.

## Files

| File | Contents |
|---|---|
| `sites.json` | **341 sites** — every pin on the globe, full detail per schema |
| `edges.json` | **2,279 supply-chain relationships** — all known links |
| `edges-critical.json` | **372 edges** — only monopoly relationships (use for "chokepoint mode") |
| `SCHEMA.md` | Field-level schema for sites and edges |
| `data/*.json` | Per-mega-layer source files (inputs, toolchain, silicon, systems, deployment) |

## Site counts by layer

| Mega-layer | Layer | Count |
|---|---|---|
| **Inputs (48)** | Raw materials | 21 |
|  | Chemicals | 14 |
|  | Wafers | 13 |
| **Toolchain (39)** | Equipment | 27 |
|  | EDA & IP | 12 |
| **Silicon (113)** | Design | 38 |
|  | Fabrication | 37 |
|  | Memory | 18 |
|  | Packaging | 20 |
| **Systems (31)** | Networking | 16 |
|  | Assembly | 15 |
| **Deployment (110)** | Datacenter | 81 |
|  | Power | 13 |
|  | Connectivity | 16 |
| **Total** | | **341** |

## Status distribution

| Status | Count |
|---|---|
| Operational | 296 |
| Under construction | 37 |
| Planned | 8 |

## Jurisdiction blocs

| Bloc | Count |
|---|---|
| Allied (TW, KR, JP, EU, UK, IL, IN, etc.) | 162 |
| United States | 122 |
| China | 39 |
| Neutral (Gulf, SEA, etc.) | 18 |

## Chokepoint severity (sites)

| Severity | Count |
|---|---|
| Monopoly (effectively one producer) | 48 |
| Duopoly (two producers) | 96 |
| Diversified (3+) | 40 |
| N/A (DCs, etc.) | 157 |

## Edge types

| Type | Count | Use |
|---|---|---|
| supplies_material | 1,078 | Raw materials, chemicals, wafers → fabs |
| supplies_equipment | 512 | WFE → fabs, EUV → leading edge |
| supplies_chips | 488 | Design → fab → packaging → assembly → DC |
| supplies_ip | 162 | EDA + Arm → designers |
| connects | 23 | Subsea cables + IXPs → DCs |
| supplies_power | 16 | Nuclear / hydro → DC campuses |

## Suggested UI modes

1. **Layer filter** — toggle any of the 14 layers on/off
2. **Chokepoint mode** — show only sites with severity = monopoly/duopoly
3. **Bloc filter** — US / Allied / China / Neutral
4. **Supply chain trace** — click a pin → highlight all incoming/outgoing edges
5. **Critical-path overlay** — render only `edges-critical.json`
6. **Status overlay** — color pins by operational / construction / planned

## Known limitations / editorial notes

- **Capacity figures** are best public estimates; some are undisclosed and left null
- **Datacenter GPU counts** are usually reported ranges, not official — confidence varies
- **China DCs** underrepresented relative to true scale; public data is thin
- **Edges are bidirectional supply relationships** but stored as directed (from → to = flow direction)
- **`jurisdiction_bloc`** reflects operating/majority ownership, not customer market
- Edge list mixes **programmatic rules** (e.g. "all WFE majors → all fabs") with **known specific deals**. You may want to prune or weight programmatic edges at render time.

## Implementation hints

- Use `sites.json` as the base pin layer (e.g. deck.gl ScatterplotLayer)
- Edge rendering: on a 3D globe, draw great-circle arcs (deck.gl ArcLayer or three-globe arcs). Render all 2,279 only on zoom-in or per selected pin — default view should be pins + critical edges only
- Color by `mega_layer` (5 hues) and vary shade by sub-layer for legibility
- Size pins by capacity or capex when available, fallback to uniform
