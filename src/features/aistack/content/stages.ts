import type { Stage, StageId } from "@/features/aistack/types/stack";

type StageCssVarName = `--stage-${StageId}`;

const atlasStagePalette = {
  "raw-materials": "#8a6d4c",
  chemicals: "#6d7d3f",
  wafers: "#5a6d7f",
  equipment: "#3d7872",
  eda: "#6d5a85",
  design: "#4a5795",
  fabrication: "#b8762e",
  memory: "#a04e63",
  packaging: "#568a6a",
  networking: "#4a6f98",
  assembly: "#8f5435",
  datacenter: "#5c6670",
  power: "#a04a35",
  connectivity: "#2d6a70",
} satisfies Record<StageId, string>;

export const atlasStages: Stage[] = [
  {
    id: "raw-materials",
    name: "Raw materials",
    order: 1,
    color: atlasStagePalette["raw-materials"],
    shortDescription:
      "Quartz, silicon metal, and the geologic inputs behind every wafer.",
  },
  {
    id: "chemicals",
    name: "Chemicals",
    order: 2,
    color: atlasStagePalette.chemicals,
    shortDescription:
      "Polysilicon, photoresists, specialty gases, and ultra-pure reagents.",
  },
  {
    id: "wafers",
    name: "Wafers",
    order: 3,
    color: atlasStagePalette.wafers,
    shortDescription: "Ingot pulls and polished silicon wafers.",
  },
  {
    id: "equipment",
    name: "Equipment",
    order: 4,
    color: atlasStagePalette.equipment,
    shortDescription:
      "Lithography, etch, deposition, and metrology systems that build every chip.",
  },
  {
    id: "eda",
    name: "EDA & IP",
    order: 5,
    color: atlasStagePalette.eda,
    shortDescription:
      "Design automation software and licensable IP cores.",
  },
  {
    id: "design",
    name: "Design",
    order: 6,
    color: atlasStagePalette.design,
    shortDescription:
      "Fabless designers — Nvidia, AMD, Apple, Broadcom — specifying the silicon.",
  },
  {
    id: "fabrication",
    name: "Fabrication",
    order: 7,
    color: atlasStagePalette.fabrication,
    shortDescription:
      "The foundries that print leading-edge logic at sub-5nm nodes.",
  },
  {
    id: "memory",
    name: "Memory",
    order: 8,
    color: atlasStagePalette.memory,
    shortDescription: "HBM stacks and DRAM that feed AI accelerators.",
  },
  {
    id: "packaging",
    name: "Packaging",
    order: 9,
    color: atlasStagePalette.packaging,
    shortDescription: "CoWoS, substrates, ABF — where chiplets become products.",
  },
  {
    id: "networking",
    name: "Networking",
    order: 10,
    color: atlasStagePalette.networking,
    shortDescription:
      "Switches, NICs, and optical interconnects wiring AI clusters together.",
  },
  {
    id: "assembly",
    name: "Assembly",
    order: 11,
    color: atlasStagePalette.assembly,
    shortDescription:
      "Server and rack integration by Foxconn, Quanta, Wistron, and peers.",
  },
  {
    id: "datacenter",
    name: "Datacenter",
    order: 12,
    color: atlasStagePalette.datacenter,
    shortDescription: "Where the GPUs actually run — Ashburn, Dublin, Singapore.",
  },
  {
    id: "power",
    name: "Power",
    order: 13,
    color: atlasStagePalette.power,
    shortDescription:
      "Nuclear, gas, and grid capacity behind gigawatt-scale AI campuses.",
  },
  {
    id: "connectivity",
    name: "Connectivity",
    order: 14,
    color: atlasStagePalette.connectivity,
    shortDescription:
      "Submarine cables and fiber carrying traffic between regions.",
  },
];

export const atlasStageCssVars = Object.fromEntries(
  Object.entries(atlasStagePalette).map(([stageId, color]) => [
    `--stage-${stageId}`,
    color,
  ]),
) as Record<StageCssVarName, string>;

export function getStageColorVar(stageId: StageId) {
  return `var(--stage-${stageId})`;
}

export function getStageTint(stageId: StageId, strength: number) {
  return `color-mix(in oklab, ${getStageColorVar(stageId)} ${strength}%, transparent)`;
}
