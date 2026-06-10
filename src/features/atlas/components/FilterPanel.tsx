"use client";

// Atlas filters + search, styled as a drafting card. Desktop: a fixed card
// over the map's top-left. Mobile: a bottom sheet behind a FILTERS button.

import { useId, useState } from "react";
import {
  AtlasFilters,
  BLOCS,
  CHOKEPOINTS,
  LAYERS_BY_MEGA,
  MEGA_LAYERS,
  searchSites,
  STATUSES,
  type Scenario,
} from "../map/sites";
import type { MegaLayer, Site } from "../types";

const BLOC_LABELS: Record<string, string> = {
  us: "U.S.",
  allied: "Allied",
  china: "China",
  neutral: "Neutral",
};

export interface FilterPanelProps {
  filters: AtlasFilters;
  onChange: (next: AtlasFilters) => void;
  megaCounts: Record<MegaLayer | "all", number>;
  shownCount: number;
  onPickSite: (site: Site) => void;
  scenario: Scenario;
  scenarioOn: boolean;
  onToggleScenario: () => void;
}

export default function FilterPanel({
  filters,
  onChange,
  megaCounts,
  shownCount,
  onPickSite,
  scenario,
  scenarioOn,
  onToggleScenario,
}: FilterPanelProps) {
  const [query, setQuery] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const searchId = useId();
  const results = searchSites(query);

  const isDefault =
    filters.mega === "all" &&
    filters.layer === "all" &&
    filters.bloc === "all" &&
    filters.chokepoint === "all" &&
    filters.status === "all";

  const layers =
    filters.mega === "all"
      ? MEGA_LAYERS.flatMap((m) => LAYERS_BY_MEGA[m])
      : LAYERS_BY_MEGA[filters.mega];

  const set = (patch: Partial<AtlasFilters>) =>
    onChange({ ...filters, ...patch });

  const panel = (
    <div className="atlas-filters" role="group" aria-label="Atlas filters">
      <div className="atlas-filters__search">
        <label className="atlas-mono" htmlFor={searchId}>
          Search
        </label>
        <input
          id={searchId}
          type="search"
          placeholder="Site or operator…"
          value={query}
          autoComplete="off"
          onChange={(e) => setQuery(e.target.value)}
        />
        {results.length > 0 && (
          <ul className="atlas-filters__results" role="listbox">
            {results.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => {
                    onPickSite(s);
                    setQuery("");
                    setSheetOpen(false);
                  }}
                >
                  <span className="atlas-filters__result-name">{s.name}</span>
                  <span className="atlas-mono atlas-filters__result-meta">
                    {s.operator}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="atlas-filters__tabs" role="tablist" aria-label="Mega layer">
        {(["all", ...MEGA_LAYERS] as const).map((mega) => (
          <button
            key={mega}
            type="button"
            role="tab"
            aria-selected={filters.mega === mega}
            className="atlas-mono atlas-filters__tab"
            onClick={() => set({ mega, layer: "all" })}
          >
            {mega === "all" ? "All" : mega}
            <span className="atlas-filters__count">{megaCounts[mega]}</span>
          </button>
        ))}
      </div>

      <FilterRow label="Layer">
        <select
          className="atlas-mono"
          value={filters.layer}
          aria-label="Layer"
          onChange={(e) => set({ layer: e.target.value })}
        >
          <option value="all">All layers</option>
          {layers.map((layer) => (
            <option key={layer} value={layer}>
              {layer}
            </option>
          ))}
        </select>
      </FilterRow>

      <FilterRow label="Bloc">
        <Chips
          value={filters.bloc}
          options={BLOCS.map((b) => [b, BLOC_LABELS[b]])}
          onChange={(bloc) => set({ bloc: bloc as AtlasFilters["bloc"] })}
        />
      </FilterRow>

      <FilterRow label="Chokepoint">
        <Chips
          value={filters.chokepoint}
          options={CHOKEPOINTS.map((c) => [c, c])}
          onChange={(chokepoint) =>
            set({ chokepoint: chokepoint as AtlasFilters["chokepoint"] })
          }
        />
      </FilterRow>

      <FilterRow label="Status">
        <Chips
          value={filters.status}
          options={STATUSES.map((s) => [s, s])}
          onChange={(status) => set({ status: status as AtlasFilters["status"] })}
        />
      </FilterRow>

      <FilterRow label="Scenario">
        <button
          type="button"
          className="atlas-mono atlas-filters__chip atlas-filters__chip--scenario"
          aria-pressed={scenarioOn}
          onClick={onToggleScenario}
        >
          {scenario.name}
        </button>
        {scenarioOn && (
          <p className="atlas-annotation atlas-filters__scenario-note">
            {scenario.note}
          </p>
        )}
      </FilterRow>

      <div className="atlas-filters__footer">
        <span className="atlas-mono">
          {scenarioOn ? "Scenario view — all 341 sites" : `${shownCount} sites shown`}
        </span>
        {!isDefault && (
          <button
            type="button"
            className="atlas-mono atlas-filters__clear"
            onClick={() =>
              onChange({
                mega: "all",
                layer: "all",
                bloc: "all",
                chokepoint: "all",
                status: "all",
              })
            }
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        className="atlas-mono atlas-filters__toggle"
        aria-expanded={sheetOpen}
        onClick={() => setSheetOpen((open) => !open)}
      >
        {sheetOpen ? "Close" : `Filters · ${shownCount}`}
      </button>
      <div
        className={`atlas-filters__holder${sheetOpen ? " atlas-filters__holder--open" : ""}`}
      >
        {panel}
      </div>
    </>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="atlas-filters__row">
      <span className="atlas-mono atlas-filters__row-label">{label}</span>
      {children}
    </div>
  );
}

function Chips({
  value,
  options,
  onChange,
}: {
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
}) {
  return (
    <div className="atlas-filters__chips">
      {options.map(([key, label]) => {
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            className="atlas-mono atlas-filters__chip"
            aria-pressed={active}
            onClick={() => onChange(active ? "all" : key)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
