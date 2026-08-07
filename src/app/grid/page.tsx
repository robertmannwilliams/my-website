import { plantsMeta, summarizeByFamily, totals } from "@/features/grid/lib/plants";
import type { FuelFamily } from "@/features/grid/types";

const FAMILY_LABEL: Record<FuelFamily, string> = {
  nuclear: "Nuclear",
  gas: "Natural gas",
  coal: "Coal",
  oil: "Oil",
  hydro: "Hydro",
  wind: "Wind",
  solar: "Solar",
  storage: "Storage",
  geothermal: "Geothermal",
  biomass: "Biomass",
  other: "Other",
};

const FAMILY_WASH: Record<FuelFamily, string> = {
  nuclear: "var(--fuel-nuclear)",
  gas: "var(--fuel-gas)",
  coal: "var(--fuel-coal)",
  oil: "var(--fuel-oil)",
  hydro: "var(--fuel-clean)",
  wind: "var(--fuel-clean)",
  solar: "var(--fuel-clean)",
  geothermal: "var(--fuel-clean)",
  storage: "var(--fuel-storage)",
  biomass: "var(--fuel-other)",
  other: "var(--fuel-other)",
};

export default function GridPage() {
  const t = totals();
  const families = summarizeByFamily();

  return (
    <main className="grid-sheet">
      <div className="grid-titleblock" role="presentation">
        <div>
          <span className="label">Project</span>
          The Largest Machine
        </div>
        <div>
          <span className="label">Sheet</span>0
        </div>
        <div>
          <span className="label">Scale</span>60 Hz
        </div>
      </div>

      <h1>The Largest Machine</h1>
      <p className="grid-deck">
        How power works in North America, drawn as an atlas. Survey in progress.
      </p>

      <div className="grid-note">
        <p>
          Every outlet in America is wired to a machine that spans the
          continent, runs without pause, and stores almost nothing. What you
          draw from the wall this second is being made this second, somewhere.
          This page will walk through how that works — where power is made, how
          it travels, who keeps it in balance every few seconds, and what it
          costs — and then hand you the map.
        </p>
        <p>
          The field data is in. {t.operating.toLocaleString("en-US")} generating
          plants of 25 megawatts or larger, {Math.round(t.operatingGw).toLocaleString("en-US")}{" "}
          gigawatts of capacity, counted from the federal inventory. Another{" "}
          {Math.round(t.constructionGw)} gigawatts are under construction right
          now. The map comes next.
        </p>
      </div>

      <table className="grid-ledger">
        <caption>Fig. 1 — The operating fleet, by fuel.</caption>
        <thead>
          <tr>
            <th>Fuel</th>
            <th className="num">Plants</th>
            <th className="num">Gigawatts</th>
          </tr>
        </thead>
        <tbody>
          {families.map((f) => (
            <tr key={f.fuel}>
              <td>
                <span
                  className="grid-swatch"
                  style={{
                    background: `color-mix(in srgb, ${FAMILY_WASH[f.fuel]} 32%, var(--paper))`,
                  }}
                />
                {FAMILY_LABEL[f.fuel]}
              </td>
              <td className="num">{f.plants.toLocaleString("en-US")}</td>
              <td className="num">{Math.round(f.gw).toLocaleString("en-US")}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="grid-colophon">
        SOURCE: {plantsMeta.source}, {plantsMeta.vintage} · plants ≥{" "}
        {plantsMeta.threshold_mw} MW · surveyed {plantsMeta.generated}
        <br />
        Volume I: <a href="/aistack">The Physical AI Stack</a>
      </div>
    </main>
  );
}
