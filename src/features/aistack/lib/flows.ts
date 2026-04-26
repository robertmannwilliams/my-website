import type { Flow, Node, Stage, StageId } from "@/features/aistack/types/stack";

export type FlowFeature = GeoJSON.Feature<
  GeoJSON.LineString,
  {
    flowId: string;
    material: string;
    notes: string;
    color: string;
    opacity: number;
    width: number;
  }
>;

export type FlowFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.LineString,
  FlowFeature["properties"]
>;

const EMPTY_COLLECTION: FlowFeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

const DEFAULT_ALPHA = 0.55;
const FULL_ALPHA = 0.85;
const DIM_ALPHA = 0.12;
const SEGMENTS_PER_ARC = 48;

export function emptyFlowCollection(): FlowFeatureCollection {
  return { ...EMPTY_COLLECTION, features: [] };
}

export function buildFlowFeatures(params: {
  flows: readonly Flow[];
  nodeById: Map<string, Node>;
  stageById: Map<StageId, Stage>;
  enabledStages: Set<StageId>;
  hoveredNodeId: string | null;
  selectedNodeId?: string | null;
  chokepointMode?: boolean;
  chokepointNodeIds?: ReadonlySet<string>;
}): FlowFeatureCollection {
  const {
    flows,
    nodeById,
    stageById,
    enabledStages,
    hoveredNodeId,
    selectedNodeId = null,
    chokepointMode = false,
    chokepointNodeIds,
  } = params;
  const features: FlowFeature[] = [];

  for (const flow of flows) {
    const from = nodeById.get(flow.fromId);
    const to = nodeById.get(flow.toId);
    if (!from || !to) continue;
    if (!enabledStages.has(from.stage) || !enabledStages.has(to.stage)) continue;

    const fromColor = stageById.get(from.stage)?.color ?? "#888";
    const points = greatCircle(from.coordinates, to.coordinates, SEGMENTS_PER_ARC);
    const selectedTouches = Boolean(
      selectedNodeId &&
        (flow.fromId === selectedNodeId || flow.toId === selectedNodeId),
    );
    const hoveredTouches = Boolean(
      hoveredNodeId &&
        (flow.fromId === hoveredNodeId || flow.toId === hoveredNodeId),
    );

    let opacity: number;
    if (selectedNodeId) {
      opacity = selectedTouches ? FULL_ALPHA : DIM_ALPHA;
    } else if (hoveredNodeId) {
      opacity = hoveredTouches ? FULL_ALPHA : DIM_ALPHA;
    } else if (chokepointMode && chokepointNodeIds) {
      const touchesChokepoint =
        chokepointNodeIds.has(flow.fromId) ||
        chokepointNodeIds.has(flow.toId);
      opacity = touchesChokepoint ? FULL_ALPHA : DIM_ALPHA;
    } else {
      opacity = DEFAULT_ALPHA;
    }
    const width =
      widthForCriticality(flow.criticality) +
      (selectedTouches || hoveredTouches ? 0.5 : 0);

    for (let i = 0; i < points.length - 1; i++) {
      features.push({
        type: "Feature",
        id: `${flow.id}-${i}`,
        geometry: {
          type: "LineString",
          coordinates: [points[i], points[i + 1]],
        },
        properties: {
          flowId: flow.id,
          material: flow.product,
          notes: "",
          color: fromColor,
          opacity,
          width,
        },
      });
    }
  }

  return { type: "FeatureCollection", features };
}

function widthForCriticality(criticality: Flow["criticality"]): number {
  if (criticality === "monopoly") return 2.75;
  if (criticality === "duopoly") return 2;
  return 1.25;
}

/**
 * Spherical linear interpolation between two [lng, lat] pairs, returning
 * an (segments + 1) point polyline along the great circle. Longitudes are
 * unwrapped so consecutive points never jump more than 180° — Mapbox draws
 * the line continuously across the antimeridian.
 */
function greatCircle(
  a: readonly [number, number],
  b: readonly [number, number],
  segments: number,
): [number, number][] {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (d: number) => (d * 180) / Math.PI;
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const phi1 = toRad(lat1);
  const lam1 = toRad(lng1);
  const phi2 = toRad(lat2);
  const lam2 = toRad(lng2);
  const x1 = Math.cos(phi1) * Math.cos(lam1);
  const y1 = Math.cos(phi1) * Math.sin(lam1);
  const z1 = Math.sin(phi1);
  const x2 = Math.cos(phi2) * Math.cos(lam2);
  const y2 = Math.cos(phi2) * Math.sin(lam2);
  const z2 = Math.sin(phi2);
  const dot = Math.max(-1, Math.min(1, x1 * x2 + y1 * y2 + z1 * z2));
  const d = Math.acos(dot);
  if (d < 1e-9) {
    return [
      [lng1, lat1],
      [lng2, lat2],
    ];
  }

  const points: [number, number][] = [];
  const sinD = Math.sin(d);
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const f = Math.sin((1 - t) * d) / sinD;
    const g = Math.sin(t * d) / sinD;
    const x = f * x1 + g * x2;
    const y = f * y1 + g * y2;
    const z = f * z1 + g * z2;
    const phi = Math.atan2(z, Math.hypot(x, y));
    const lam = Math.atan2(y, x);
    points.push([toDeg(lam), toDeg(phi)]);
  }

  for (let i = 1; i < points.length; i++) {
    while (points[i][0] - points[i - 1][0] > 180) points[i][0] -= 360;
    while (points[i][0] - points[i - 1][0] < -180) points[i][0] += 360;
  }
  return points;
}
