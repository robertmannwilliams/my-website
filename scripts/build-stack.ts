import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { z } from "zod";

import { atlasMegaLayers } from "../src/features/aistack/content/megaLayers";
import { atlasStages } from "../src/features/aistack/content/stages";
import type {
  ChokepointSeverity,
  Confidence,
  EdgeCriticality,
  EdgeType,
  Flow,
  JurisdictionBloc,
  MegaLayerId,
  Node,
  SiteStatus,
  StackAtlas,
  StageId,
} from "../src/features/aistack/types/stack";

const PROJECT_ROOT = resolve(__dirname, "..");
const RAW_DIR = join(PROJECT_ROOT, "src", "features", "aistack", "data", "raw");
const OUT_FILE = join(
  PROJECT_ROOT,
  "src",
  "features",
  "aistack",
  "data",
  "stack.json",
);

const statusSchema = z.enum([
  "operational",
  "construction",
  "planned",
  "decommissioning",
]);

const chokepointSeveritySchema = z.enum([
  "monopoly",
  "duopoly",
  "diversified",
  "na",
]);

const edgeCriticalitySchema = z.enum([
  "monopoly",
  "duopoly",
  "diversified",
]);

const confidenceSchema = z.enum(["high", "medium", "low"]);
const jurisdictionBlocSchema = z.enum(["us", "allied", "china", "neutral"]);

const layerSchema = z.enum([
  "Raw materials",
  "Chemicals",
  "Wafers",
  "Equipment",
  "EDA & IP",
  "Design",
  "Fabrication",
  "Memory",
  "Packaging",
  "Networking",
  "Assembly",
  "Datacenter",
  "Power",
  "Connectivity",
]);

const megaLayerRawSchema = z.enum([
  "Inputs",
  "Toolchain",
  "Silicon",
  "Systems",
  "Deployment",
]);

const rawCapacitySchema = z.object({
  metric: z.string().min(1),
  value: z.number().nullable(),
  unit: z.string().min(1).nullable(),
  notes: z.string().min(1).optional(),
});

const rawSiteSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  operator: z.string().min(1),
  parent_company: z.string().min(1).nullable().optional(),
  layer: layerSchema,
  mega_layer: megaLayerRawSchema,
  sub_type: z.string().min(1).nullable().optional(),
  city: z.string().min(1).nullable().optional(),
  country: z.string().min(1),
  region: z.string().min(1).nullable().optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  status: statusSchema,
  year_online: z.number().int().nullable().optional(),
  why_it_matters: z.string().min(1),
  capacity: rawCapacitySchema.nullable().optional(),
  process_or_product: z.array(z.string().min(1)).nullable().optional(),
  capex_usd_b: z.number().nullable().optional(),
  employees: z.number().int().nullable().optional(),
  key_customers: z.array(z.string().min(1)).nullable().optional(),
  ownership: z.string().min(1).nullable().optional(),
  jurisdiction_bloc: jurisdictionBlocSchema,
  tags: z.array(z.string().min(1)),
  chokepoint_severity: chokepointSeveritySchema,
  confidence: confidenceSchema,
  sources: z.array(z.string().url()),
});

const edgeTypeSchema = z.enum([
  "supplies_material",
  "supplies_equipment",
  "supplies_chips",
  "supplies_ip",
  "supplies_power",
  "connects",
]);

const rawEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  type: edgeTypeSchema,
  product: z.string().min(1),
  criticality: edgeCriticalitySchema,
  confidence: confidenceSchema,
  note: z.string().min(1).optional(),
});

type RawSite = z.infer<typeof rawSiteSchema>;
type RawEdge = z.infer<typeof rawEdgeSchema>;

const layerToStage = {
  "Raw materials": "raw-materials",
  Chemicals: "chemicals",
  Wafers: "wafers",
  Equipment: "equipment",
  "EDA & IP": "eda",
  Design: "design",
  Fabrication: "fabrication",
  Memory: "memory",
  Packaging: "packaging",
  Networking: "networking",
  Assembly: "assembly",
  Datacenter: "datacenter",
  Power: "power",
  Connectivity: "connectivity",
} satisfies Record<RawSite["layer"], StageId>;

const rawMegaLayerToId = {
  Inputs: "inputs",
  Toolchain: "toolchain",
  Silicon: "silicon",
  Systems: "systems",
  Deployment: "deployment",
} satisfies Record<RawSite["mega_layer"], MegaLayerId>;

function fail(where: string, detail: string): never {
  console.error(`\n✗ build-stack failed in ${where}`);
  console.error(detail);
  process.exit(1);
}

function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
}

function readJsonArray<T>(
  filename: string,
  schema: z.ZodType<T>,
  itemName: string,
): T[] {
  const file = join(RAW_DIR, filename);
  let parsed: unknown;

  try {
    parsed = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    fail(file, `malformed JSON: ${(error as Error).message}`);
  }

  const arrayResult = z.array(z.unknown()).safeParse(parsed);
  if (!arrayResult.success) {
    fail(file, `expected an array:\n${formatZodError(arrayResult.error)}`);
  }

  return arrayResult.data.map((item, index) => {
    const result = schema.safeParse(item);
    if (!result.success) {
      fail(`${file}#${index}`, `${itemName} schema failed:\n${formatZodError(result.error)}`);
    }
    return result.data;
  });
}

function transformSite(site: RawSite): Node {
  const stage = layerToStage[site.layer];
  const megaLayer = rawMegaLayerToId[site.mega_layer];
  const stageDefinition = atlasStages.find((candidate) => candidate.id === stage);

  if (!stageDefinition) {
    fail(site.id, `unknown stage "${stage}" mapped from layer "${site.layer}"`);
  }

  if (stageDefinition.megaLayerId !== megaLayer) {
    fail(
      site.id,
      `stage "${stage}" belongs to "${stageDefinition.megaLayerId}", not raw mega-layer "${megaLayer}"`,
    );
  }

  return compactObject({
    id: site.id,
    name: site.name,
    stage,
    megaLayer,
    coordinates: [site.lng, site.lat] as [number, number],
    operator: site.operator,
    parentCompany:
      site.parent_company && site.parent_company !== site.operator
        ? site.parent_company
        : undefined,
    country: site.country,
    city: site.city ?? undefined,
    region: site.region ?? undefined,
    subType: site.sub_type ?? undefined,
    tagline: site.why_it_matters,
    summary: undefined,
    body: undefined,
    keyFacts: generateKeyFacts(site),
    capacity: normalizeCapacity(site),
    processOrProduct: site.process_or_product ?? undefined,
    capexUsdB: site.capex_usd_b ?? undefined,
    employees: site.employees ?? undefined,
    keyCustomers: site.key_customers ?? undefined,
    ownership: site.ownership ?? undefined,
    jurisdictionBloc: site.jurisdiction_bloc as JurisdictionBloc,
    tags: site.tags,
    chokepointSeverity: site.chokepoint_severity as ChokepointSeverity,
    chokepointRisk: deriveChokepointRisk(site),
    chokepointNarrative: undefined,
    status: site.status as SiteStatus,
    yearOnline: site.year_online ?? undefined,
    confidence: site.confidence as Confidence,
    sources: site.sources.map((url) => ({ label: labelFromUrl(url), url })),
    heroImage: undefined,
  });
}

function normalizeCapacity(site: RawSite): Node["capacity"] {
  if (!site.capacity) return undefined;
  if (site.capacity.unit) {
    return {
      metric: site.capacity.metric,
      value: site.capacity.value,
      unit: site.capacity.unit,
      notes: site.capacity.notes,
    };
  }
  if (site.capacity.value !== null) {
    fail(site.id, "capacity.unit is required when capacity.value is present");
  }
  return undefined;
}

function transformEdges(
  rawEdges: RawEdge[],
  nodeIds: Set<string>,
  label: string,
): { flows: Flow[]; orphanCount: number } {
  const flows: Flow[] = [];
  const seenBaseIds = new Map<string, number>();
  let orphanCount = 0;

  for (const edge of rawEdges) {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
      orphanCount += 1;
      continue;
    }

    const baseId = `${edge.from}__${edge.to}__${edge.type}`;
    const seen = seenBaseIds.get(baseId) ?? 0;
    seenBaseIds.set(baseId, seen + 1);

    flows.push({
      id: seen === 0 ? baseId : `${baseId}__${slugify(edge.product)}${seen + 1}`,
      fromId: edge.from,
      toId: edge.to,
      type: edge.type as EdgeType,
      product: edge.product,
      criticality: edge.criticality as EdgeCriticality,
      confidence: edge.confidence as Confidence,
    });
  }

  if (orphanCount > 0) {
    console.warn(`⚠ ${label}: dropped ${orphanCount} orphaned edges`);
  }

  return { flows, orphanCount };
}

function generateKeyFacts(site: RawSite): Node["keyFacts"] {
  const facts: Node["keyFacts"] = [];

  if (site.status !== "operational") {
    facts.push({ label: "Status", value: humanizeStatus(site.status) });
  }
  if (site.year_online) {
    facts.push({ label: "Year online", value: String(site.year_online) });
  }
  if (site.capacity && site.capacity.value !== null) {
    facts.push({
      label: humanizeMetric(site.capacity.metric),
      value: `${formatNumber(site.capacity.value)} ${site.capacity.unit}`,
    });
  }
  if (site.process_or_product?.length) {
    facts.push({
      label: "Process or product",
      value: site.process_or_product.slice(0, 4).join(" · "),
    });
  }
  if (site.key_customers?.length) {
    facts.push({
      label: "Key customers",
      value: site.key_customers.slice(0, 3).join(" · "),
    });
  }
  if (site.capex_usd_b !== null && site.capex_usd_b !== undefined) {
    facts.push({ label: "Capex", value: formatCapex(site.capex_usd_b) });
  }
  if (site.employees !== null && site.employees !== undefined) {
    facts.push({ label: "Employees", value: formatNumber(site.employees) });
  }
  if (
    site.chokepoint_severity === "monopoly" ||
    site.chokepoint_severity === "duopoly"
  ) {
    facts.push({
      label: "Chokepoint",
      value: titleCase(site.chokepoint_severity),
    });
  }

  return facts.slice(0, 6);
}

function deriveChokepointRisk(site: RawSite): Node["chokepointRisk"] {
  const base = {
    monopoly: 5,
    duopoly: 4,
    diversified: 2,
    na: 1,
  } satisfies Record<ChokepointSeverity, Node["chokepointRisk"]>;

  const raw = base[site.chokepoint_severity];
  const bumped =
    site.chokepoint_severity !== "na" && site.tags.includes("ai_critical")
      ? Math.min(raw + 1, 5)
      : raw;
  return bumped as Node["chokepointRisk"];
}

function labelFromUrl(url: string): string {
  const hostname = new URL(url).hostname.replace(/^www\./, "");
  const parts = hostname.split(".");
  const domain =
    parts.length > 2 && parts.at(-2)?.length === 2
      ? parts.at(-3) ?? parts[0]
      : parts.at(-2) ?? parts[0];
  return titleCase(domain.replaceAll("-", " "));
}

function humanizeMetric(metric: string): string {
  return titleCase(metric.replaceAll("_", " ").replace(" per ", " / "));
}

function humanizeStatus(status: SiteStatus): string {
  if (status === "construction") return "Under construction";
  return titleCase(status);
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(
    value,
  );
}

function formatCapex(value: number): string {
  return `$${formatNumber(value)}B`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function compactObject<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T;
}

function countBy<T extends string>(
  values: readonly T[],
  order: readonly T[],
): Record<T, number> {
  return Object.fromEntries(order.map((key) => [key, 0])) as Record<T, number>;
}

function main() {
  const sites = readJsonArray("sites.json", rawSiteSchema, "site");
  const criticalEdges = readJsonArray(
    "edges-critical.json",
    rawEdgeSchema,
    "critical edge",
  );
  const allEdges = readJsonArray("edges.json", rawEdgeSchema, "edge");

  const siteIds = new Set<string>();
  for (const site of sites) {
    if (siteIds.has(site.id)) {
      fail("sites.json", `duplicate site id "${site.id}"`);
    }
    siteIds.add(site.id);
  }

  const nodes = sites.map(transformSite);
  const critical = transformEdges(criticalEdges, siteIds, "critical edges");
  const all = transformEdges(allEdges, siteIds, "all edges");

  const atlas: StackAtlas = {
    stages: atlasStages,
    megaLayers: atlasMegaLayers,
    nodes,
    flows: critical.flows,
    allFlows: all.flows,
  };

  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(atlas, null, 2) + "\n", "utf8");

  const stageCounts = countBy(
    atlasStages.map((stage) => stage.id),
    atlasStages.map((stage) => stage.id),
  );
  for (const node of nodes) stageCounts[node.stage] += 1;

  const flowTypeCounts = countBy(
    edgeTypeSchema.options,
    edgeTypeSchema.options,
  );
  for (const flow of critical.flows) flowTypeCounts[flow.type] += 1;

  const severityCounts = countBy(
    chokepointSeveritySchema.options,
    chokepointSeveritySchema.options,
  );
  for (const node of nodes) severityCounts[node.chokepointSeverity] += 1;

  console.log(
    `✓ build-stack: ${nodes.length} sites, ${critical.flows.length} critical edges, ${all.flows.length} total edges → ${basename(OUT_FILE)}`,
  );
  console.log(`  Stages: ${formatCounts(stageCounts)}`);
  console.log(`  Critical edge types: ${formatCounts(flowTypeCounts)}`);
  console.log(`  Chokepoints: ${formatCounts(severityCounts)}`);
  console.log(`  Orphaned edges dropped: ${critical.orphanCount + all.orphanCount}`);
}

main();

function formatCounts(counts: Record<string, number>): string {
  return Object.entries(counts)
    .map(([key, value]) => `${key} ${value}`)
    .join(" · ");
}
