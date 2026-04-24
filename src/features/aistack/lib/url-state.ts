import type { ReadonlyURLSearchParams } from "next/navigation";
import type { StageId } from "@/features/aistack/types/stack";

type AnyParams = ReadonlyURLSearchParams | URLSearchParams;

export function getSelectedNodeId(params: AnyParams): string | null {
  return params.get("node");
}

export function buildHrefWithNode(
  params: AnyParams,
  nodeId: string | null,
): string {
  const next = new URLSearchParams(params.toString());
  if (nodeId) next.set("node", nodeId);
  else next.delete("node");
  return serialize(next);
}

/**
 * Enabled stages: absent `?stages` param means all stages are on. An
 * explicit empty param (`?stages=`) means none are on.
 */
export function getEnabledStageIds(
  params: AnyParams,
  allStageIds: readonly StageId[],
): Set<StageId> {
  const raw = params.get("stages");
  if (raw === null) return new Set(allStageIds);
  if (raw === "") return new Set();
  const allowed = new Set<StageId>(allStageIds);
  const picked = raw
    .split(",")
    .filter((s): s is StageId => allowed.has(s as StageId));
  return new Set(picked);
}

export function buildHrefWithStages(
  params: AnyParams,
  enabled: Set<StageId>,
  allStageIds: readonly StageId[],
): string {
  const next = new URLSearchParams(params.toString());
  const allOn = allStageIds.every((id) => enabled.has(id));
  if (allOn) {
    next.delete("stages");
  } else {
    next.set("stages", [...enabled].join(","));
  }
  return serialize(next);
}

function serialize(params: URLSearchParams): string {
  const q = params.toString();
  return q ? `/aistack?${q}` : "/aistack";
}
