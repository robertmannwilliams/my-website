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
