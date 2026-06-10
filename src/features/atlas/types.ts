// Types for the Physical AI Stack story + atlas.
// Content schema: CLAUDE.md §Content schema. Data schema: CLAUDE.md §data/sites.json.

export type BeatKind = "text" | "plate" | "map" | "diagram" | "stamp";

export interface BeatCamera {
  center?: [number, number];
  zoom?: number;
  pitch?: number;
  bearing?: number;
}

export interface Beat {
  /** Beat id as authored, e.g. "4.1" (normalized to string from YAML). */
  id: string;
  kind: BeatKind;
  /** Copy paragraphs from the `## Beat {id}` section, soft wraps collapsed. */
  copy: string[];
  /** Asset key for plate and diagram beats → /public/plates/{key}.png */
  plate?: string;
  /** Site ids resolved against data/sites.json (map beats). */
  sites?: string[];
  camera?: BeatCamera;
  /** Ink lines draw between sites; first site is the hub. */
  drawLinks?: boolean;
  /** Stamp text, e.g. "ONE COMPANY". */
  stamp?: string;
  /** Chapter 12 only: the story map expands into the explorable atlas. */
  atlasHandoff?: boolean;
}

export interface Chapter {
  id: number;
  slug: string;
  title: string;
  /** Mega-layer label, shown as an eyebrow. */
  kicker: string;
  beats: Beat[];
}

export type MegaLayer =
  | "Inputs"
  | "Toolchain"
  | "Silicon"
  | "Systems"
  | "Deployment";

export type SiteStatus = "operational" | "construction" | "planned";
export type JurisdictionBloc = "us" | "allied" | "china" | "neutral";
export type ChokepointSeverity = "monopoly" | "duopoly" | "diversified" | "na";
export type Confidence = "high" | "medium";

export interface SiteCapacity {
  metric: string | null;
  value: number | null;
  unit: string | null;
  notes?: string | null;
}

export interface Site {
  id: string;
  name: string;
  operator: string;
  parent_company?: string | null;
  layer: string;
  mega_layer: MegaLayer;
  sub_type: string;
  city?: string | null;
  country?: string | null;
  region?: string | null;
  lat: number;
  lng: number;
  status: SiteStatus;
  year_online?: number | null;
  why_it_matters: string;
  capacity?: SiteCapacity | null;
  capex_usd_b?: number | null;
  key_customers?: string[] | null;
  employees?: number | null;
  ownership?: string | null;
  process_or_product?: string | null;
  tags?: string[] | null;
  jurisdiction_bloc: JurisdictionBloc;
  chokepoint_severity: ChokepointSeverity;
  confidence: Confidence;
  sources: string[];
}
