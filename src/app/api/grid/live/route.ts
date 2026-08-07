// /api/grid/live — the machine's pulse (GRID-PLAN Phase 4).
// Proxies the EIA Hourly Grid Monitor (v2 API) with the key server-side.
// Degrades to the baked representative snapshot whenever the key is absent
// or the feed misbehaves — the panel never shows a spinner or an error
// (GRID-DESIGN). Upstream responses cache ~10 min; the feed itself lags
// real time by an hour or two.

import { NextResponse } from "next/server";
import snapshot from "@data/live-snapshot.json";

const EIA = "https://api.eia.gov/v2/electricity/rto";

const FUEL_CODES: Record<string, string> = {
  NG: "gas",
  NUC: "nuclear",
  COL: "coal",
  SUN: "solar",
  SNB: "solar", // solar with integrated battery
  WND: "wind",
  WNB: "wind",
  WAT: "hydro",
  OIL: "oil",
  BAT: "battery",
  PS: "battery",
  GEO: "geothermal",
  OTH: "other",
};

interface EiaRow {
  period: string;
  value: number | string;
  fueltype?: string;
  "type-name"?: string;
}

async function eia(path: string, params: Record<string, string>, key: string) {
  const search = new URLSearchParams({
    api_key: key,
    frequency: "hourly",
    "data[0]": "value",
    "sort[0][column]": "period",
    "sort[0][direction]": "desc",
    ...params,
  });
  const res = await fetch(`${EIA}${path}?${search}`, {
    next: { revalidate: 600 },
  });
  if (!res.ok) throw new Error(`EIA ${path}: ${res.status}`);
  const json = (await res.json()) as { response?: { data?: EiaRow[] } };
  const rows = json.response?.data;
  if (!rows?.length) throw new Error(`EIA ${path}: empty`);
  return rows;
}

function snapshotResponse() {
  return NextResponse.json(
    { live: false, as_of: snapshot.as_of, demand_gw: snapshot.demand_gw, mix: snapshot.mix },
    { headers: { "Cache-Control": "s-maxage=600, stale-while-revalidate=3600" } },
  );
}

export async function GET() {
  const key = process.env.EIA_API_KEY;
  if (!key) return snapshotResponse();

  try {
    // The two EIA series lag differently (demand is near-real-time; the
    // fuel mix trails by hours). Anchor everything on the newest COMPLETE
    // mix period, then fetch demand for that same hour — never mix hours.
    const mixRows = await eia("/fuel-type-data/data/", {
      "facets[respondent][]": "US48",
      length: "48",
    }, key);
    const periods = [...new Set(mixRows.map((r) => r.period))].sort().reverse();
    const totalFor = (p: string) =>
      mixRows.filter((r) => r.period === p)
        .reduce((s, r) => s + Number(r.value), 0);
    let chosen = periods[0];
    if (periods[1] && totalFor(periods[0]) < 0.8 * totalFor(periods[1])) {
      chosen = periods[1]; // newest hour still mid-publish
    }

    const demandRows = await eia("/region-data/data/", {
      "facets[respondent][]": "US48",
      "facets[type][]": "D",
      start: chosen,
      end: chosen,
      length: "1",
    }, key);
    const demand = demandRows[0];
    const mix = mixRows
      .filter((r) => r.period === chosen)
      .map((r) => ({
        fuel: FUEL_CODES[r.fueltype ?? ""] ?? "other",
        gw: Math.round(Number(r.value) / 100) / 10,
      }))
      .reduce<Array<{ fuel: string; gw: number }>>((acc, r) => {
        const hit = acc.find((a) => a.fuel === r.fuel);
        if (hit) hit.gw = Math.round((hit.gw + r.gw) * 10) / 10;
        else acc.push(r);
        return acc;
      }, [])
      .filter((r) => r.gw >= 0.3)
      .sort((a, b) => b.gw - a.gw);

    return NextResponse.json(
      {
        live: true,
        as_of: demand.period,
        demand_gw: Math.round(Number(demand.value) / 100) / 10,
        mix,
      },
      { headers: { "Cache-Control": "s-maxage=600, stale-while-revalidate=3600" } },
    );
  } catch (err) {
    console.error("[grid live]", err);
    return snapshotResponse();
  }
}
