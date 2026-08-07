"use client";

// Atlas controls — plain scaffolding UI (visual language is provisional;
// chrome gets replaced in the Phase 4.5 reskin). Fuel chips, three selects,
// layer toggles, search with a small result list, and a shown-count line.

import { useMemo, useRef, useState } from "react";
import type {
  AtlasFilters,
  FuelFamily,
  LayerVisibility,
  PlantProps,
} from "../types";

const FUELS: Array<{ key: FuelFamily; label: string }> = [
  { key: "gas", label: "Gas" },
  { key: "coal", label: "Coal" },
  { key: "nuclear", label: "Nuclear" },
  { key: "hydro", label: "Hydro" },
  { key: "wind", label: "Wind" },
  { key: "solar", label: "Solar" },
  { key: "storage", label: "Storage" },
  { key: "oil", label: "Oil" },
  { key: "geothermal", label: "Geo" },
  { key: "biomass", label: "Biomass" },
  { key: "other", label: "Other" },
];

const REGIONS = ["CAISO", "ERCOT", "ISO-NE", "MISO", "NYISO", "PJM", "SPP", "none"] as const;

interface Props {
  filters: AtlasFilters;
  onFilters: (f: AtlasFilters) => void;
  vis: LayerVisibility;
  onVis: (v: LayerVisibility) => void;
  plantIndex: PlantProps[];
  onPickPlant: (p: PlantProps) => void;
  shownCount: number | null;
  disabled: boolean;
}

export default function AtlasControls({
  filters, onFilters, vis, onVis, plantIndex, onPickPlant, shownCount, disabled,
}: Props) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const out: PlantProps[] = [];
    for (const p of plantIndex) {
      if (p.name.toLowerCase().includes(q) || p.op.toLowerCase().includes(q)) {
        out.push(p);
        if (out.length >= 8) break;
      }
    }
    return out;
  }, [query, plantIndex]);

  const toggleFuel = (fuel: FuelFamily) => {
    const fuels = new Set(filters.fuels);
    if (fuels.has(fuel)) fuels.delete(fuel);
    else fuels.add(fuel);
    onFilters({ ...filters, fuels });
  };

  const anyFilter =
    filters.fuels.size > 0 ||
    filters.status !== "all" ||
    filters.band !== "all" ||
    filters.era !== "all" ||
    filters.region !== "all";

  return (
    <div className="grid-controls" aria-label="Atlas filters" data-disabled={disabled || undefined}>
      <div className="grid-controls-row">
        <div className="grid-search">
          <input
            ref={searchRef}
            type="search"
            placeholder="Search plant or operator…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={disabled}
            aria-label="Search plants"
          />
          {results.length > 0 && (
            <ul className="grid-search-results" role="listbox">
              {results.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPickPlant(p);
                      setQuery("");
                      searchRef.current?.blur();
                    }}
                  >
                    {p.name}
                    <span> — {p.st} · {p.fuel} · {Math.round(p.mw).toLocaleString("en-US")} MW</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <select
          value={filters.status}
          disabled={disabled}
          aria-label="Status"
          onChange={(e) =>
            onFilters({ ...filters, status: e.target.value as AtlasFilters["status"] })
          }
        >
          <option value="all">Any status</option>
          <option value="operating">Operating</option>
          <option value="construction">Under construction</option>
        </select>

        <select
          value={filters.band}
          disabled={disabled}
          aria-label="Capacity"
          onChange={(e) =>
            onFilters({ ...filters, band: e.target.value as AtlasFilters["band"] })
          }
        >
          <option value="all">Any size</option>
          <option value="s">Under 250 MW</option>
          <option value="m">250–1,000 MW</option>
          <option value="l">Over 1,000 MW</option>
        </select>

        <select
          value={filters.era}
          disabled={disabled}
          aria-label="Online era"
          onChange={(e) =>
            onFilters({ ...filters, era: e.target.value as AtlasFilters["era"] })
          }
        >
          <option value="all">Any era</option>
          <option value="pre1970">Before 1970</option>
          <option value="1970s">1970–1999</option>
          <option value="2000s">2000–2014</option>
          <option value="recent">2015–now</option>
        </select>

        <select
          value={filters.region}
          disabled={disabled}
          aria-label="Market region"
          onChange={(e) =>
            onFilters({ ...filters, region: e.target.value as AtlasFilters["region"] })
          }
        >
          <option value="all">Any region</option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>
              {r === "none" ? "No market (trad.)" : r}
            </option>
          ))}
        </select>
      </div>

      <div className="grid-controls-row">
        <div className="grid-fuel-chips" role="group" aria-label="Fuel filter">
          {FUELS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              aria-pressed={filters.fuels.has(key)}
              disabled={disabled}
              onClick={() => toggleFuel(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid-layer-toggles" role="group" aria-label="Map layers">
          {(
            [
              ["wires", "Wires"],
              ["regions", "Regions"],
              ["regulation", "Regulation"],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={vis[key]}
                disabled={disabled}
                onChange={(e) => onVis({ ...vis, [key]: e.target.checked })}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="grid-controls-status">
        {shownCount == null
          ? "Loading the fleet…"
          : `${shownCount.toLocaleString("en-US")} plants shown`}
        {anyFilter && (
          <button
            type="button"
            className="grid-clear"
            onClick={() =>
              onFilters({ fuels: new Set(), status: "all", band: "all", era: "all", region: "all" })
            }
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
