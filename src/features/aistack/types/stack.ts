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

export interface Stage {
  id: StageId;
  name: string;
  order: number;
  color: string;
  shortDescription: string;
}

export interface Node {
  id: string;
  name: string;
  stage: StageId;
  coordinates: [number, number];

  company: string;
  country: string;
  region?: string;

  tagline: string;
  summary: string;
  body: string;

  keyFacts: { label: string; value: string }[];

  chokepointRisk: 1 | 2 | 3 | 4 | 5;
  chokepointNarrative?: string;

  status: "operating" | "under-construction" | "planned" | "historical";
  establishedYear?: number;
  commissioningYear?: number;

  heroImage?: string;
  sources: { label: string; url: string }[];
}

export interface Flow {
  id: string;
  fromId: string;
  toId: string;
  material: string;
  notes?: string;
  weight?: 1 | 2 | 3;
}

export interface StackAtlas {
  stages: Stage[];
  nodes: Node[];
  flows: Flow[];
}
