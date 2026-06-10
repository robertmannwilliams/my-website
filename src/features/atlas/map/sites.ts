// Client-side site data for atlas mode. The JSON is imported statically so it
// ships (code-split) with the lazy map chunk, per CLAUDE.md §Stack decisions.

import sitesJson from "@data/sites.json";
import type {
  ChokepointSeverity,
  JurisdictionBloc,
  MegaLayer,
  Site,
  SiteStatus,
} from "../types";

export const allSites = sitesJson as unknown as Site[];

export const siteById = new Map(allSites.map((s) => [s.id, s]));

export const MEGA_LAYERS: MegaLayer[] = [
  "Inputs",
  "Toolchain",
  "Silicon",
  "Systems",
  "Deployment",
];

export const BLOCS: JurisdictionBloc[] = ["us", "allied", "china", "neutral"];
export const CHOKEPOINTS: ChokepointSeverity[] = [
  "monopoly",
  "duopoly",
  "diversified",
];
export const STATUSES: SiteStatus[] = ["operational", "construction", "planned"];

/** Distinct `layer` values per mega layer, in data order. */
export const LAYERS_BY_MEGA: Record<MegaLayer, string[]> = (() => {
  const out = {} as Record<MegaLayer, string[]>;
  for (const mega of MEGA_LAYERS) out[mega] = [];
  for (const s of allSites) {
    const list = out[s.mega_layer];
    if (list && !list.includes(s.layer)) list.push(s.layer);
  }
  return out;
})();

export interface AtlasFilters {
  mega: MegaLayer | "all";
  layer: string | "all";
  bloc: JurisdictionBloc | "all";
  chokepoint: ChokepointSeverity | "all";
  status: SiteStatus | "all";
}

export const DEFAULT_FILTERS: AtlasFilters = {
  mega: "all",
  layer: "all",
  bloc: "all",
  chokepoint: "all",
  status: "all",
};

export function filterSites(sites: Site[], f: AtlasFilters): Site[] {
  return sites.filter(
    (s) =>
      (f.mega === "all" || s.mega_layer === f.mega) &&
      (f.layer === "all" || s.layer === f.layer) &&
      (f.bloc === "all" || s.jurisdiction_bloc === f.bloc) &&
      (f.chokepoint === "all" || s.chokepoint_severity === f.chokepoint) &&
      (f.status === "all" || s.status === f.status),
  );
}

/** Simple client-side search over name + operator. */
export function searchSites(query: string, limit = 8): Site[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const starts: Site[] = [];
  const contains: Site[] = [];
  for (const s of allSites) {
    const name = s.name.toLowerCase();
    const operator = s.operator.toLowerCase();
    if (name.startsWith(q) || operator.startsWith(q)) starts.push(s);
    else if (name.includes(q) || operator.includes(q)) contains.push(s);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
}

export function toFeatureCollection(sites: Site[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: sites.map((s) => ({
      type: "Feature",
      id: undefined,
      properties: {
        id: s.id,
        name: s.name,
        operator: s.operator,
        status: s.status,
        monopoly: s.chokepoint_severity === "monopoly",
        mega: s.mega_layer,
      },
      geometry: { type: "Point", coordinates: [s.lng, s.lat] },
    })),
  };
}
