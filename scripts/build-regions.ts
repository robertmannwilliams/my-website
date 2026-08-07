/**
 * build-regions.ts — market-region + regulatory layers for the grid atlas
 * (GRID-PLAN Phase 1).
 *
 * Output 1: public/grid-data/regions.json — the seven ISO/RTO footprints
 * (CAISO, ERCOT, ISO-NE, MISO, NYISO, PJM, SPP), simplified polygons.
 * Source: NRDC's public ArcGIS mirror of the retired HIFLD "Independent
 * System Operator" layer (FERC 714 / EIA derived, 2017 vintage). Boundaries
 * are approximations and PROVISIONAL — good enough for a regional wash;
 * revisit in Phase 5 if a fresher public source appears.
 *
 * Output 2: public/grid-data/regulatory.json — states colored by retail
 * electricity restructuring status: choice | limited | traditional.
 * Geometry from us-atlas (Census); classification per EIA/NREL restructuring
 * summaries, PROVISIONAL until the Phase 5 facts audit.
 *
 * Run: npm run build:regions
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import * as topojson from "topojson-client";
import type { Topology } from "topojson-specification";

const require = createRequire(import.meta.url);

const ISO_SERVICE =
  "https://services2.arcgis.com/OmhjjQKPQ4s7vrAK/arcgis/rest/services/Independent_System_Operators/FeatureServer/0/query";
const REGIONS_OUT = path.join(process.cwd(), "public", "grid-data", "regions.json");
const REGULATORY_OUT = path.join(process.cwd(), "public", "grid-data", "regulatory.json");

/** Retail electricity restructuring status by state (postal code).
 *  choice: active retail choice for most customer classes.
 *  limited: suspended, capped, or large-customers-only.
 *  Everything else: traditional vertically-integrated regulation. */
const RETAIL_CHOICE = new Set([
  "CT", "DE", "DC", "IL", "ME", "MD", "MA", "NH", "NJ", "NY", "OH", "PA", "RI", "TX",
]);
const RETAIL_LIMITED = new Set(["CA", "MI", "NV", "OR", "MT", "VA", "GA"]);

// us-atlas indexes states by FIPS; map to postal for the status lookup.
const FIPS_TO_POSTAL: Record<string, string> = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO",
  "09": "CT", "10": "DE", "11": "DC", "12": "FL", "13": "GA", "15": "HI",
  "16": "ID", "17": "IL", "18": "IN", "19": "IA", "20": "KS", "21": "KY",
  "22": "LA", "23": "ME", "24": "MD", "25": "MA", "26": "MI", "27": "MN",
  "28": "MS", "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
  "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND", "39": "OH",
  "40": "OK", "41": "OR", "42": "PA", "44": "RI", "45": "SC", "46": "SD",
  "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA",
  "54": "WV", "55": "WI", "56": "WY",
};

async function buildRegions() {
  const params = new URLSearchParams({
    where: "1=1",
    outFields: "NAME,LABEL",
    outSR: "4326",
    f: "geojson",
  });
  const res = await fetch(`${ISO_SERVICE}?${params}`);
  if (!res.ok) throw new Error(`ISO query failed: ${res.status}`);
  const fc = (await res.json()) as GeoJSON.FeatureCollection;
  if (fc.features.length !== 7) {
    throw new Error(`SANITY CHECK FAILED: expected 7 ISO polygons, got ${fc.features.length}`);
  }

  const raw = path.join(os.tmpdir(), "iso-regions-raw.json");
  fs.writeFileSync(raw, JSON.stringify(fc));
  console.log(`regions raw: ${Math.round(fs.statSync(raw).size / 1024)} KB, simplifying…`);
  execFileSync(
    "npx",
    ["-y", "mapshaper", raw, "-simplify", "8%", "keep-shapes",
     "-o", REGIONS_OUT, "precision=0.001", "format=geojson"],
    { stdio: "inherit" },
  );

  const out = JSON.parse(fs.readFileSync(REGIONS_OUT, "utf8"));
  out.meta = {
    source: "HIFLD Independent System Operator layer (NRDC public ArcGIS mirror)",
    service_url: ISO_SERVICE,
    vintage: "2017 (FERC 714 / EIA derived)",
    note: "Boundary approximations, simplified for display. PROVISIONAL — revisit in Phase 5.",
    generated: new Date().toISOString().slice(0, 10),
  };
  fs.writeFileSync(REGIONS_OUT, JSON.stringify(out));
  console.log(`wrote ${REGIONS_OUT}: ${out.features.length} regions, ${Math.round(fs.statSync(REGIONS_OUT).size / 1024)} KB`);
}

function buildRegulatory() {
  const topo = require("us-atlas/states-10m.json") as Topology;
  const states = topojson.feature(
    topo,
    topo.objects.states,
  ) as unknown as GeoJSON.FeatureCollection;

  const features = states.features
    .map((f) => {
      const postal = FIPS_TO_POSTAL[String(f.id)];
      if (!postal) return null; // territories
      const status = RETAIL_CHOICE.has(postal)
        ? "choice"
        : RETAIL_LIMITED.has(postal)
          ? "limited"
          : "traditional";
      return {
        type: "Feature" as const,
        properties: { state: postal, status },
        geometry: f.geometry,
      };
    })
    .filter((f) => f !== null);

  if (features.length !== 51) {
    throw new Error(`SANITY CHECK FAILED: expected 51 states+DC, got ${features.length}`);
  }

  const out = {
    type: "FeatureCollection" as const,
    meta: {
      source: "Geometry: us-atlas (US Census). Classification: EIA/NREL retail restructuring summaries.",
      note: "Retail-choice status is PROVISIONAL until the Phase 5 facts audit.",
      generated: new Date().toISOString().slice(0, 10),
    },
    features,
  };
  fs.writeFileSync(REGULATORY_OUT, JSON.stringify(out));
  console.log(`wrote ${REGULATORY_OUT}: ${features.length} states, ${Math.round(fs.statSync(REGULATORY_OUT).size / 1024)} KB`);
}

/** The three interconnections, approximated by whole states (the real
 *  boundaries cut through MT/NM/SD/TX — fine at continental zoom, marked
 *  PROVISIONAL). AK and HI belong to none of them. */
const WESTERN = new Set(["WA", "OR", "CA", "NV", "ID", "UT", "AZ", "CO", "WY", "MT", "NM"]);
const INTERCON_OUT = path.join(process.cwd(), "public", "grid-data", "interconnections.json");

function buildInterconnections() {
  const topo = require("us-atlas/states-10m.json") as Topology;
  const geoms = (topo.objects.states as { geometries: Array<{ id?: unknown }> }).geometries;
  const group = (pred: (postal: string) => boolean) =>
    topojson.merge(
      topo as never,
      geoms.filter((g) => {
        const postal = FIPS_TO_POSTAL[String(g.id)];
        return postal != null && postal !== "AK" && postal !== "HI" && pred(postal);
      }) as never[],
    );
  const features = [
    { name: "Eastern Interconnection", label: "EASTERN", pred: (p: string) => p !== "TX" && !WESTERN.has(p) },
    { name: "Western Interconnection", label: "WESTERN", pred: (p: string) => WESTERN.has(p) },
    { name: "ERCOT (Texas) Interconnection", label: "TEXAS", pred: (p: string) => p === "TX" },
  ].map(({ name, label, pred }) => ({
    type: "Feature" as const,
    properties: { name, LABEL: label },
    geometry: group(pred),
  }));
  const out = {
    type: "FeatureCollection" as const,
    meta: {
      source: "Derived: us-atlas states dissolved into interconnection groups",
      note: "Whole-state approximation (real boundaries split MT/NM/SD/TX). PROVISIONAL — display at continental zoom only.",
      generated: new Date().toISOString().slice(0, 10),
    },
    features,
  };
  fs.writeFileSync(INTERCON_OUT, JSON.stringify(out));
  console.log(`wrote ${INTERCON_OUT}: ${features.length} interconnections, ${Math.round(fs.statSync(INTERCON_OUT).size / 1024)} KB`);
}

async function main() {
  await buildRegions();
  buildRegulatory();
  buildInterconnections();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
