export type StageId =
  | "raw-materials"
  | "chemicals"
  | "wafers"
  | "equipment"
  | "eda"
  | "design"
  | "fabrication"
  | "memory"
  | "packaging"
  | "networking"
  | "assembly"
  | "datacenter"
  | "power"
  | "connectivity";

export type MegaLayerId =
  | "inputs"
  | "toolchain"
  | "silicon"
  | "systems"
  | "deployment";

export type SiteStatus =
  | "operational"
  | "construction"
  | "planned"
  | "decommissioning";

export type ChokepointSeverity =
  | "monopoly"
  | "duopoly"
  | "diversified"
  | "na";

export type EdgeCriticality = Exclude<ChokepointSeverity, "na">;

export type Confidence = "high" | "medium" | "low";

export type JurisdictionBloc = "us" | "allied" | "china" | "neutral";

export interface Capacity {
  metric: string;
  value: number | null;
  unit: string;
  notes?: string;
}

export interface Node {
  id: string;
  name: string;
  stage: StageId;
  megaLayer: MegaLayerId;
  coordinates: [number, number];

  operator: string;
  parentCompany?: string;
  country: string;
  city?: string;
  region?: string;
  subType?: string;

  tagline: string;
  summary?: string;
  body?: string;
  keyFacts: { label: string; value: string }[];

  capacity?: Capacity;
  processOrProduct?: string[];
  capexUsdB?: number;
  employees?: number;
  keyCustomers?: string[];
  ownership?: string;

  jurisdictionBloc: JurisdictionBloc;
  tags: string[];

  chokepointSeverity: ChokepointSeverity;
  chokepointRisk: 1 | 2 | 3 | 4 | 5;
  chokepointNarrative?: string;

  status: SiteStatus;
  yearOnline?: number;

  confidence: Confidence;
  heroImage?: string;
  sources: { label: string; url: string }[];
}

export type EdgeType =
  | "supplies_material"
  | "supplies_equipment"
  | "supplies_chips"
  | "supplies_ip"
  | "supplies_power"
  | "connects";

export interface Flow {
  id: string;
  fromId: string;
  toId: string;
  type: EdgeType;
  product: string;
  criticality: EdgeCriticality;
  confidence: Confidence;
}

export interface StackAtlas {
  stages: Stage[];
  megaLayers: MegaLayer[];
  nodes: Node[];
  flows: Flow[];
  allFlows: Flow[];
}

export interface MegaLayer {
  id: MegaLayerId;
  name: string;
  order: number;
  stageIds: StageId[];
  shortDescription: string;
}

export interface Stage {
  id: StageId;
  name: string;
  megaLayerId: MegaLayerId;
  order: number;
  color: string;
  shortDescription: string;
}
