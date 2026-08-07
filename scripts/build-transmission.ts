/**
 * build-transmission.ts — HIFLD Electric Power Transmission Lines →
 * data/transmission.json (GRID-PLAN Phase 1).
 *
 * Pulls lines with VOLTAGE >= 220 kV from the HIFLD ArcGIS service
 * (paginated GeoJSON), keeps a minimal property set, then simplifies with
 * mapshaper to keep the client payload sane. The style draws >=500 kV
 * heavier per GRID-DESIGN; VOLT_CLASS carries that split.
 *
 * Run: npm run build:transmission  (requires network; mapshaper via npx)
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SERVICE =
  "https://services1.arcgis.com/Hp6G80Pky0om7QvQ/arcgis/rest/services/Electric_Power_Transmission_Lines/FeatureServer/0/query";
const WHERE = "VOLTAGE >= 220";
const PAGE = 2000;
const OUT_PATH = path.join(process.cwd(), "public", "grid-data", "transmission.json");
const SIMPLIFY = "12%";

async function fetchPage(offset: number): Promise<GeoJSON.FeatureCollection> {
  const params = new URLSearchParams({
    where: WHERE,
    outFields: "ID,TYPE,STATUS,OWNER,VOLTAGE,VOLT_CLASS",
    outSR: "4326",
    f: "geojson",
    resultOffset: String(offset),
    resultRecordCount: String(PAGE),
  });
  const res = await fetch(`${SERVICE}?${params}`);
  if (!res.ok) throw new Error(`query failed at offset ${offset}: ${res.status}`);
  return (await res.json()) as GeoJSON.FeatureCollection;
}

async function main() {
  const features: GeoJSON.Feature[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const page = await fetchPage(offset);
    if (!page.features?.length) break;
    features.push(...page.features);
    console.log(`fetched ${features.length} features…`);
    if (page.features.length < PAGE) break;
  }
  if (features.length < 8000 || features.length > 20000) {
    throw new Error(`SANITY CHECK FAILED: implausible >=220kV line count ${features.length}`);
  }

  const raw = path.join(os.tmpdir(), "hifld-transmission-raw.json");
  fs.writeFileSync(
    raw,
    JSON.stringify({ type: "FeatureCollection", features }),
  );
  console.log(`raw: ${Math.round(fs.statSync(raw).size / 1024 / 1024)} MB, simplifying…`);

  execFileSync(
    "npx",
    [
      "-y", "mapshaper", raw,
      "-simplify", SIMPLIFY, "keep-shapes",
      "-o", OUT_PATH, "precision=0.0001", "format=geojson",
    ],
    { stdio: "inherit" },
  );

  // Prepend provenance via a foreign member (valid GeoJSON, ignored by Mapbox).
  const fc = JSON.parse(fs.readFileSync(OUT_PATH, "utf8"));
  fc.meta = {
    source: "HIFLD Open Data, Electric Power Transmission Lines",
    service_url: SERVICE,
    filter: WHERE,
    note: "Service data snapshot dated 2023 by HIFLD; geometry simplified (visvalingam, keep-shapes) for display at <=z11.",
    generated: new Date().toISOString().slice(0, 10),
    features: fc.features.length,
  };
  fs.writeFileSync(OUT_PATH, JSON.stringify(fc));
  console.log(
    `wrote ${OUT_PATH}: ${fc.features.length} lines, ${Math.round(fs.statSync(OUT_PATH).size / 1024)} KB`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
