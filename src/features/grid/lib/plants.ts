import plantsJson from "@data/plants.json";
import type { FuelFamily, Plant, PlantsFile } from "../types";

const file = plantsJson as PlantsFile;

export const plantsMeta = file.meta;
export const plants: Plant[] = file.plants;

export interface FamilySummary {
  fuel: FuelFamily;
  plants: number;
  gw: number;
}

/** Operating capacity by fuel family, largest first. */
export function summarizeByFamily(): FamilySummary[] {
  const acc = new Map<FuelFamily, FamilySummary>();
  for (const p of plants) {
    if (p.status !== "operating") continue;
    const e = acc.get(p.fuel) ?? { fuel: p.fuel, plants: 0, gw: 0 };
    e.plants += 1;
    e.gw += p.capacity_mw / 1000;
    acc.set(p.fuel, e);
  }
  return [...acc.values()].sort((a, b) => b.gw - a.gw);
}

export function totals() {
  let operating = 0;
  let constructionMw = 0;
  let operatingGw = 0;
  for (const p of plants) {
    if (p.status === "operating") {
      operating += 1;
      operatingGw += p.capacity_mw / 1000;
    }
    // Construction-only plants carry 0 in capacity_mw; all under-construction
    // MW (theirs and expansions at operating plants) lives in construction_mw.
    constructionMw += p.construction_mw ?? 0;
  }
  return {
    plants: plants.length,
    operating,
    operatingGw,
    constructionGw: constructionMw / 1000,
  };
}
