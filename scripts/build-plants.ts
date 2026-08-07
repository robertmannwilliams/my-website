/**
 * build-plants.ts — EIA-860M → data/plants.json
 *
 * Downloads (or reads via --input) the EIA-860M monthly generator inventory,
 * aggregates generators to plants, and writes the grid atlas dataset.
 * Spec: docs/grid-spec-package.md §Data plan. Run: npm run build:plants
 *
 * Inclusion rules (v1, per GRID-PLAN Phase 0):
 * - Operating sheet: statuses OP, SB, OA. Excluded: OS (out of service, not
 *   expected back).
 * - Planned sheet: statuses U, V, TS only ("construction"). Excluded: P, L, T
 *   (not under construction).
 * - Puerto Rico sheets excluded (separate isolated grid; revisit post-v1).
 * - Threshold: total plant capacity (operating + construction) >= 25 MW.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import xlsx from "xlsx";

const VINTAGE = "June 2026";
const SOURCE_URL =
  "https://www.eia.gov/electricity/data/eia860m/xls/june_generator2026.xlsx";
const THRESHOLD_MW = 25;
const OUT_PATH = path.join(process.cwd(), "data", "plants.json");
const GEO_PATH = path.join(process.cwd(), "public", "grid-data", "plants.geo.json");

type FuelFamily =
  | "nuclear" | "gas" | "coal" | "oil" | "hydro" | "wind" | "solar"
  | "storage" | "geothermal" | "biomass" | "other";

interface Plant {
  id: string;
  name: string;
  operator: string;
  state: string;
  county: string | null;
  lat: number;
  lng: number;
  ba: string | null;
  fuel: FuelFamily;
  technology: string;
  capacity_mw: number;
  construction_mw?: number;
  online_year: number | null;
  units: number;
  status: "operating" | "construction";
}

/** Order matters: storage checks must precede gas/hydro substring matches. */
function fuelFamily(technology: string): FuelFamily {
  const t = technology.trim();
  if (t.includes("Pumped Storage") || t.includes("Compressed Air")) return "storage";
  if (t.includes("Batteries") || t.includes("Flywheels")) return "storage";
  if (t.includes("Nuclear")) return "nuclear";
  if (t.includes("Coal") || t.includes("Petroleum Coke")) return "coal";
  if (t.includes("Petroleum Liquids")) return "oil";
  if (t.includes("Natural Gas") || t.includes("Other Gases")) return "gas";
  if (t.includes("Hydroelectric")) return "hydro";
  if (t.includes("Wind")) return "wind";
  if (t.includes("Solar")) return "solar";
  if (t.includes("Geothermal")) return "geothermal";
  if (
    t.includes("Biomass") || t.includes("Wood") || t.includes("Landfill Gas") ||
    t.includes("Municipal Solid Waste") || t.includes("Other Waste")
  ) return "biomass";
  return "other";
}

function statusCode(raw: unknown): string {
  const m = String(raw ?? "").match(/^\((\w+)\)/);
  return m ? m[1] : "";
}

interface Unit {
  plantId: number;
  plantName: string;
  entity: string;
  state: string;
  county: string | null;
  ba: string | null;
  lat: number | null;
  lng: number | null;
  capacity: number;
  technology: string;
  year: number | null;
  phase: "operating" | "construction";
}

function readSheet(
  wb: xlsx.WorkBook,
  sheetName: string,
  yearCol: string,
  keepStatuses: Set<string>,
  phase: Unit["phase"],
): Unit[] {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) throw new Error(`Sheet "${sheetName}" missing from workbook`);
  const rows: unknown[][] = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: true });
  const header = rows[2] as string[];
  const col = (name: string) => {
    const i = header.indexOf(name);
    if (i === -1) throw new Error(`Column "${name}" missing in ${sheetName} — EIA changed the layout; update this script.`);
    return i;
  };
  const c = {
    plantId: col("Plant ID"), plantName: col("Plant Name"), entity: col("Entity Name"),
    state: col("Plant State"), county: col("County"), ba: col("Balancing Authority Code"),
    lat: col("Latitude"), lng: col("Longitude"), cap: col("Nameplate Capacity (MW)"),
    tech: col("Technology"), status: col("Status"), year: col(yearCol),
  };
  const units: Unit[] = [];
  for (let i = 3; i < rows.length; i++) {
    const r = rows[i];
    if (!r || typeof r[c.plantId] !== "number") continue; // trailing notes rows
    if (!keepStatuses.has(statusCode(r[c.status]))) continue;
    const num = (v: unknown): number | null =>
      typeof v === "number" && Number.isFinite(v) ? v : null;
    units.push({
      plantId: r[c.plantId] as number,
      plantName: String(r[c.plantName] ?? "").trim(),
      entity: String(r[c.entity] ?? "").trim(),
      state: String(r[c.state] ?? "").trim(),
      county: String(r[c.county] ?? "").trim() || null,
      ba: String(r[c.ba] ?? "").trim() || null,
      lat: num(r[c.lat]),
      lng: num(r[c.lng]),
      capacity: num(r[c.cap]) ?? 0,
      technology: String(r[c.tech] ?? "").trim(),
      year: num(r[c.year]),
      phase,
    });
  }
  return units;
}

async function loadWorkbook(): Promise<xlsx.WorkBook> {
  const argIdx = process.argv.indexOf("--input");
  if (argIdx !== -1) {
    const p = process.argv[argIdx + 1];
    if (!p || !fs.existsSync(p)) throw new Error(`--input path not found: ${p}`);
    console.log(`reading ${p}`);
    return xlsx.readFile(p);
  }
  const cache = path.join(os.tmpdir(), `eia860m-${VINTAGE.replace(/\s/g, "").toLowerCase()}.xlsx`);
  if (!fs.existsSync(cache)) {
    console.log(`downloading ${SOURCE_URL}`);
    const res = await fetch(SOURCE_URL, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) throw new Error(`download failed: ${res.status} ${res.statusText}`);
    fs.writeFileSync(cache, Buffer.from(await res.arrayBuffer()));
  } else {
    console.log(`using cached ${cache}`);
  }
  return xlsx.readFile(cache);
}

async function main() {
  const wb = await loadWorkbook();
  const operating = readSheet(
    wb, "Operating", "Operating Year", new Set(["OP", "SB", "OA"]), "operating",
  );
  const construction = readSheet(
    wb, "Planned", "Planned Operation Year", new Set(["U", "V", "TS"]), "construction",
  );
  console.log(`units kept: ${operating.length} operating, ${construction.length} under construction`);

  // Aggregate to plants
  const byPlant = new Map<number, Unit[]>();
  for (const u of [...operating, ...construction]) {
    const arr = byPlant.get(u.plantId) ?? [];
    arr.push(u);
    byPlant.set(u.plantId, arr);
  }

  const plants: Plant[] = [];
  let droppedNoCoords = 0;
  let droppedBelowThreshold = 0;

  for (const [plantId, units] of byPlant) {
    const opMw = units.filter((u) => u.phase === "operating")
      .reduce((s, u) => s + u.capacity, 0);
    const conMw = units.filter((u) => u.phase === "construction")
      .reduce((s, u) => s + u.capacity, 0);
    if (opMw + conMw < THRESHOLD_MW) { droppedBelowThreshold++; continue; }

    const located = units.find((u) => u.lat != null && u.lng != null);
    if (!located) { droppedNoCoords++; continue; }

    // Dominant fuel family and technology by summed capacity
    const famMw = new Map<FuelFamily, number>();
    const techMw = new Map<string, number>();
    for (const u of units) {
      const f = fuelFamily(u.technology);
      famMw.set(f, (famMw.get(f) ?? 0) + u.capacity);
      techMw.set(u.technology, (techMw.get(u.technology) ?? 0) + u.capacity);
    }
    const top = <K,>(m: Map<K, number>): K =>
      [...m.entries()].sort((a, b) => b[1] - a[1])[0][0];

    const status: Plant["status"] = opMw > 0 ? "operating" : "construction";
    const relevantYears = units
      .filter((u) => u.phase === (status === "operating" ? "operating" : "construction"))
      .map((u) => u.year)
      .filter((y): y is number => y != null);
    const biggest = [...units].sort((a, b) => b.capacity - a.capacity)[0];

    const plant: Plant = {
      id: `eia-${plantId}`,
      name: biggest.plantName,
      operator: biggest.entity,
      state: biggest.state,
      county: biggest.county,
      lat: Math.round(located.lat! * 1e4) / 1e4,
      lng: Math.round(located.lng! * 1e4) / 1e4,
      ba: biggest.ba,
      fuel: top(famMw),
      technology: top(techMw),
      capacity_mw: Math.round(opMw * 10) / 10,
      online_year: relevantYears.length ? Math.min(...relevantYears) : null,
      units: units.length,
      status,
    };
    if (conMw > 0) plant.construction_mw = Math.round(conMw * 10) / 10;
    plants.push(plant);
  }

  plants.sort((a, b) => (b.capacity_mw + (b.construction_mw ?? 0)) - (a.capacity_mw + (a.construction_mw ?? 0)));

  // ---- Sanity assertions (fail loudly; GRID-PLAN Phase 0) ----
  const fail = (msg: string) => { throw new Error(`SANITY CHECK FAILED: ${msg}`); };
  const paloVerde = plants.find((p) => p.name === "Palo Verde" && p.fuel === "nuclear");
  if (!paloVerde || paloVerde.state !== "AZ" || paloVerde.capacity_mw < 3800 || paloVerde.capacity_mw > 4500) {
    fail(`Palo Verde looks wrong: ${JSON.stringify(paloVerde)}`);
  }
  const coulee = plants.find((p) => p.name.includes("Grand Coulee"));
  if (!coulee || coulee.fuel !== "hydro" || coulee.state !== "WA" || coulee.capacity_mw < 6000 || coulee.capacity_mw > 7500) {
    fail(`Grand Coulee looks wrong: ${JSON.stringify(coulee)}`);
  }
  if (plants.length < 3000 || plants.length > 9000) fail(`implausible plant count: ${plants.length}`);
  const totalGw = plants.reduce((s, p) => s + p.capacity_mw, 0) / 1000;
  if (totalGw < 1000 || totalGw > 1700) fail(`implausible total operating capacity: ${totalGw.toFixed(0)} GW`);

  // ---- Summary ----
  const famSummary = new Map<FuelFamily, { n: number; gw: number }>();
  for (const p of plants) {
    const e = famSummary.get(p.fuel) ?? { n: 0, gw: 0 };
    e.n += 1;
    e.gw += p.capacity_mw / 1000;
    famSummary.set(p.fuel, e);
  }
  console.log(`\nplants: ${plants.length}  (dropped: ${droppedBelowThreshold} below ${THRESHOLD_MW} MW, ${droppedNoCoords} without coordinates)`);
  console.log(`operating capacity: ${totalGw.toFixed(0)} GW`);
  for (const [fam, e] of [...famSummary.entries()].sort((a, b) => b[1].gw - a[1].gw)) {
    console.log(`  ${fam.padEnd(11)} ${String(e.n).padStart(5)} plants  ${e.gw.toFixed(0).padStart(5)} GW`);
  }

  const out = {
    meta: {
      title: "US power plants (grid atlas dataset)",
      source: "EIA-860M, Preliminary Monthly Electric Generator Inventory",
      source_url: SOURCE_URL,
      vintage: VINTAGE,
      generated: new Date().toISOString().slice(0, 10),
      threshold_mw: THRESHOLD_MW,
      notes:
        "Generators aggregated to plants. Operating = OP/SB/OA units; construction = U/V/TS units from the Planned sheet. Excluded: OS units, planned-not-under-construction (P/L/T), Puerto Rico sheets. fuel = dominant family by nameplate MW; coordinates rounded to 4 decimals (EIA precision is plant-gate at best).",
      counts: { plants: plants.length, operating_gw: Math.round(totalGw) },
    },
    plants,
  };
  fs.writeFileSync(OUT_PATH, JSON.stringify(out));
  const kb = Math.round(fs.statSync(OUT_PATH).size / 1024);
  console.log(`\nwrote ${OUT_PATH} (${kb} KB)`);

  // Client-fetched GeoJSON for the map (minimal properties; served static).
  const geo = {
    type: "FeatureCollection" as const,
    features: plants.map((p) => ({
      type: "Feature" as const,
      properties: {
        id: p.id,
        name: p.name,
        fuel: p.fuel,
        status: p.status,
        mw: p.capacity_mw || p.construction_mw || 0,
      },
      geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
    })),
  };
  fs.mkdirSync(path.dirname(GEO_PATH), { recursive: true });
  fs.writeFileSync(GEO_PATH, JSON.stringify(geo));
  console.log(`wrote ${GEO_PATH} (${Math.round(fs.statSync(GEO_PATH).size / 1024)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
