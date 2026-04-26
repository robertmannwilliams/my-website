# AI Stack Map — Data Schema (v1)

## sites.json
Each site is an object in an array. Fields:

```jsonc
{
  "id": "tsmc-fab18-p8",                      // stable slug
  "name": "TSMC Fab 18 — Phase 8",            // display name
  "operator": "TSMC",                          // company running the site
  "parent_company": "TSMC",                    // ultimate parent (if different)
  "layer": "Fabrication",                      // one of the 14 layers
  "mega_layer": "Silicon",                     // Inputs | Toolchain | Silicon | Systems | Deployment
  "sub_type": "Leading-edge logic foundry",    // finer-grained category
  "city": "Tainan",
  "country": "Taiwan",
  "region": "East Asia",                       // for regional rollups
  "lat": 23.0478,
  "lng": 120.2736,
  "status": "operational",                     // operational | construction | planned | decommissioning
  "year_online": 2024,
  "why_it_matters": "One-line chokepoint narrative.",
  "capacity": {
    "metric": "wafer_starts_per_month",
    "value": 100000,
    "unit": "wpm",
    "notes": "N3/N2 class; includes phase 8 expansion"
  },
  "process_or_product": ["N3", "N2"],          // nodes / products / materials
  "capex_usd_b": 20,
  "employees": 8000,
  "key_customers": ["NVIDIA", "Apple", "AMD"],
  "ownership": "Public (TWSE: 2330)",
  "jurisdiction_bloc": "allied",               // us | allied | china | neutral
  "tags": ["ai_critical", "chokepoint", "euv", "chips_act_tw"],
  "chokepoint_severity": "monopoly",           // monopoly | duopoly | diversified | na
  "confidence": "high",                         // high | medium | low
  "sources": [
    "https://www.tsmc.com/...",
    "https://www.reuters.com/..."
  ]
}
```

## edges.json
Directed supply relationships between sites.

```jsonc
{
  "from": "asml-veldhoven-hq",
  "to": "tsmc-fab18-p8",
  "type": "supplies_equipment",               // supplies_equipment | supplies_material | supplies_ip | supplies_chips | supplies_power | connects
  "product": "EUV lithography (NXE/EXE)",
  "criticality": "monopoly",                  // monopoly | duopoly | diversified
  "confidence": "high"
}
```

## Layer → Mega-layer mapping

| Mega-layer | Layers |
|---|---|
| Inputs | Raw materials, Chemicals, Wafers |
| Toolchain | Equipment, EDA & IP |
| Silicon | Design, Fabrication, Memory, Packaging |
| Systems | Networking, Assembly |
| Deployment | Datacenter, Power, Connectivity |

## Target counts (v1, ~340 pins)

- Inputs: Raw 22 · Chemicals 18 · Wafers 10 → 50
- Toolchain: Equipment 22 · EDA & IP 10 → 32
- Silicon: Design 28 · Fab 45 · Memory 18 · Packaging 22 → 113
- Systems: Networking 18 · Assembly 12 → 30
- Deployment: Datacenter 70 · Power 22 · Connectivity 18 → 110

Total: ~335 pins.
