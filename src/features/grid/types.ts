export type FuelFamily =
  | "nuclear"
  | "gas"
  | "coal"
  | "oil"
  | "hydro"
  | "wind"
  | "solar"
  | "storage"
  | "geothermal"
  | "biomass"
  | "other";

export interface Plant {
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
  /** "ca" marks the hand-authored Canadian hero records. */
  country: "us" | "ca";
}

/** Terse feature properties in public/grid-data/plants.geo.json. */
export interface PlantProps {
  id: string;
  name: string;
  fuel: FuelFamily;
  status: "operating" | "construction";
  mw: number;
  op: string;
  tech: string;
  yr: number | null;
  iso: string;
  st: string;
  cmw?: number;
  /** Hand-written hero blurb (why_it_matters). */
  why?: string;
  hero?: 1;
  /** Manual Canadian record. */
  ca?: 1;
}

export type MarketRegion =
  | "CAISO" | "ERCOT" | "ISO-NE" | "MISO" | "NYISO" | "PJM" | "SPP"
  | "IESO" | "AESO" | "none";

export interface AtlasFilters {
  /** Empty set = all fuels. */
  fuels: Set<FuelFamily>;
  status: "all" | "operating" | "construction";
  band: "all" | "s" | "m" | "l";
  era: "all" | "pre1970" | "1970s" | "2000s" | "recent";
  region: "all" | MarketRegion;
}

export interface LayerVisibility {
  wires: boolean;
  regions: boolean;
  regulation: boolean;
}

export interface PlantsFile {
  meta: {
    title: string;
    source: string;
    source_url: string;
    vintage: string;
    generated: string;
    threshold_mw: number;
    notes: string;
    counts: { plants: number; operating_gw: number };
  };
  plants: Plant[];
}
