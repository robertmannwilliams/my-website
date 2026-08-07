"use client";

// Plant detail card — plain scaffolding (reskinned in Phase 4.5).
// Shows the honest structured EIA fields; hand-written hero blurbs
// arrive in Phase 3.

import type { PlantProps } from "../types";

const FUEL_LABEL: Record<string, string> = {
  nuclear: "Nuclear", gas: "Natural gas", coal: "Coal", oil: "Oil",
  hydro: "Hydro", wind: "Wind", solar: "Solar", storage: "Storage",
  geothermal: "Geothermal", biomass: "Biomass", other: "Other",
};

export default function DetailCard({
  plant,
  onClose,
}: {
  plant: PlantProps;
  onClose: () => void;
}) {
  const rows: Array<[string, string]> = [
    ["Operator", plant.op || "—"],
    ["Technology", plant.tech || "—"],
    [
      "Capacity",
      plant.status === "construction"
        ? `${Math.round(plant.mw).toLocaleString("en-US")} MW (under construction)`
        : `${Math.round(plant.mw).toLocaleString("en-US")} MW`,
    ],
    ...(plant.cmw && plant.status === "operating"
      ? [["Expanding", `+${Math.round(plant.cmw).toLocaleString("en-US")} MW under construction`] as [string, string]]
      : []),
    ["Online since", plant.yr != null ? String(plant.yr) : "—"],
    ["Market region", plant.iso === "none" ? "None (traditional utility)" : plant.iso],
    ["State", plant.st],
  ];

  return (
    <aside className="grid-detail" aria-label={`Details: ${plant.name}`}>
      <header>
        <h3>{plant.name}</h3>
        <span className="grid-detail-kicker">{FUEL_LABEL[plant.fuel] ?? plant.fuel}</span>
        <button type="button" onClick={onClose} aria-label="Close details">
          ×
        </button>
      </header>
      {plant.why && <p className="grid-detail-why">{plant.why}</p>}
      <dl>
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="grid-detail-src">
        {plant.ca ? "Manual entry · figures approximate" : "EIA-860M · June 2026"}
      </p>
    </aside>
  );
}
