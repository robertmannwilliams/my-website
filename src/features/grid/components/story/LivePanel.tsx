"use client";

// Beat 4.4 — the machine's pulse. Fetches /api/grid/live (EIA proxy with a
// baked snapshot fallback) and renders demand + fuel mix. Never a spinner,
// never an error: nothing renders until data arrives, and data always
// arrives (the API guarantees the snapshot). Plain chrome per the freeze.

import { useEffect, useState } from "react";

interface LiveData {
  live: boolean;
  as_of: string;
  demand_gw: number;
  mix: Array<{ fuel: string; gw: number }>;
}

const FUEL_LABEL: Record<string, string> = {
  gas: "Natural gas",
  nuclear: "Nuclear",
  coal: "Coal",
  solar: "Solar",
  wind: "Wind",
  hydro: "Hydro",
  battery: "Batteries",
  oil: "Oil",
  other: "Other",
};

function fmtPeriod(p: string): string {
  // EIA periods look like "2026-08-07T18"; keep it plain.
  const m = p.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})$/);
  return m ? `${m[1]}, ${m[2]}:00 UTC` : p;
}

export default function LivePanel() {
  const [data, setData] = useState<LiveData | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/grid/live")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d) setData(d as LiveData);
      })
      .catch(() => {
        // Leave the panel unrendered — the copy stands alone.
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!data) return null;
  const max = Math.max(...data.mix.map((m) => m.gw));

  return (
    <div className="grid-widget grid-live" data-live={data.live || undefined}>
      <div className="grid-widget-readouts">
        <span>
          LOWER-48 DEMAND <strong>{Math.round(data.demand_gw)} GW</strong>
        </span>
        <span className="grid-live-badge">
          {data.live ? "LIVE · EIA HOURLY" : "REPRESENTATIVE SNAPSHOT"}
        </span>
      </div>
      <div className="grid-live-mix">
        {data.mix.map((m) => (
          <div key={m.fuel} className="grid-live-row">
            <span className="grid-live-fuel">{FUEL_LABEL[m.fuel] ?? m.fuel}</span>
            <span className="grid-live-bar">
              <span style={{ width: `${Math.max(2, (m.gw / max) * 100)}%` }} />
            </span>
            <span className="grid-live-gw">{Math.round(m.gw)}</span>
          </div>
        ))}
      </div>
      <p className="grid-widget-note">
        {data.live
          ? `Generation by fuel, gigawatts, ${fmtPeriod(data.as_of)} — the EIA feed runs an hour or two behind the machine itself.`
          : `Stylized ${data.as_of} — the live feed plugs in with the EIA data hookup (Phase 4).`}
      </p>
    </div>
  );
}
