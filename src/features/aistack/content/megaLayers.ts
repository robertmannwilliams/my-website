import type { MegaLayer } from "../types/stack";

export const atlasMegaLayers: MegaLayer[] = [
  {
    id: "inputs",
    name: "Inputs",
    order: 1,
    stageIds: ["raw-materials", "chemicals", "wafers"],
    shortDescription:
      "Geologic and chemical foundations that become production-grade silicon.",
  },
  {
    id: "toolchain",
    name: "Toolchain",
    order: 2,
    stageIds: ["equipment", "eda"],
    shortDescription:
      "Machines, software, and IP that make advanced chip design and fabrication possible.",
  },
  {
    id: "silicon",
    name: "Silicon",
    order: 3,
    stageIds: ["design", "fabrication", "memory", "packaging"],
    shortDescription:
      "Chip architecture, foundry capacity, memory, and advanced package integration.",
  },
  {
    id: "systems",
    name: "Systems",
    order: 4,
    stageIds: ["networking", "assembly"],
    shortDescription:
      "Interconnect and server assembly layers that turn chips into deployable systems.",
  },
  {
    id: "deployment",
    name: "Deployment",
    order: 5,
    stageIds: ["datacenter", "power", "connectivity"],
    shortDescription:
      "Physical infrastructure that runs and connects AI compute at global scale.",
  },
];
