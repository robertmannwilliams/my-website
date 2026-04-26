"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AtlasMap } from "@/features/aistack/components/map/AtlasMap";
import { LoadingSkeleton } from "@/features/aistack/components/map/LoadingSkeleton";
import { MapControls } from "@/features/aistack/components/map/MapControls";
import { MapErrorBoundary } from "@/features/aistack/components/map/MapErrorBoundary";
import { NodeDetail } from "@/features/aistack/components/panels/NodeDetail";
import { StagePanel } from "@/features/aistack/components/panels/StagePanel";
import { WelcomeOverlay } from "@/features/aistack/components/WelcomeOverlay";
import stack from "@/features/aistack/data/stack.json";
import {
  buildHrefWithNode,
  buildHrefWithStages,
  getEnabledStageIds,
  getSelectedNodeId,
} from "@/features/aistack/lib/url-state";
import { useIsMobile } from "@/features/aistack/lib/useIsMobile";
import type { Flow, StackAtlas, StageId } from "@/features/aistack/types/stack";

const atlas = stack as StackAtlas;
const stageById = new Map(atlas.stages.map((stage) => [stage.id, stage]));
const nodeById = new Map(atlas.nodes.map((node) => [node.id, node]));
const allStageIds = atlas.stages.map((stage) => stage.id);

const countByStage = atlas.stages.reduce<Record<StageId, number>>(
  (acc, stage) => {
    acc[stage.id] = atlas.nodes.filter((node) => node.stage === stage.id).length;
    return acc;
  },
  {} as Record<StageId, number>,
);

const chokepointNodeIds: ReadonlySet<string> = new Set(
  atlas.nodes
    .filter(
      (node) =>
        node.chokepointSeverity === "monopoly" ||
        node.chokepointSeverity === "duopoly",
    )
    .map((node) => node.id),
);
const chokepointCount = chokepointNodeIds.size;

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [flowsVisible, setFlowsVisible] = useState(true);
  const [showAllFlows, setShowAllFlows] = useState(false);
  const [chokepointMode, setChokepointMode] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedOverride, setSelectedOverride] = useState<{
    id: string | null;
    search: string;
  } | null>(null);
  const isMobile = useIsMobile();

  const searchKey = searchParams.toString();
  const urlSelectedId = getSelectedNodeId(searchParams);
  const selectedId =
    selectedOverride?.search === searchKey ? selectedOverride.id : urlSelectedId;
  const selectedNode = selectedId ? nodeById.get(selectedId) ?? null : null;
  const selectedStage = selectedNode
    ? stageById.get(selectedNode.stage) ?? null
    : null;

  const enabledStages = useMemo(
    () => getEnabledStageIds(searchParams, allStageIds),
    [searchParams],
  );
  const displayedFlows = useMemo(
    () => getDisplayedFlows(showAllFlows, selectedId),
    [selectedId, showAllFlows],
  );

  const setSelected = useCallback(
    (id: string | null) => {
      setSelectedOverride({ id, search: searchParams.toString() });
      router.replace(buildHrefWithNode(searchParams, id), { scroll: false });
    },
    [router, searchParams],
  );

  const setEnabled = useCallback(
    (next: Set<StageId>) => {
      router.replace(buildHrefWithStages(searchParams, next, allStageIds), {
        scroll: false,
      });
    },
    [router, searchParams],
  );

  const toggleStage = useCallback(
    (id: StageId) => {
      const next = new Set(enabledStages);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setEnabled(next);
    },
    [enabledStages, setEnabled],
  );

  const toggleMegaLayer = useCallback(
    (ids: StageId[]) => {
      const next = new Set(enabledStages);
      const allOn = ids.every((id) => next.has(id));
      for (const id of ids) {
        if (allOn) next.delete(id);
        else next.add(id);
      }
      setEnabled(next);
    },
    [enabledStages, setEnabled],
  );

  const soloStage = useCallback(
    (id: StageId) => {
      const isCurrentSolo = enabledStages.size === 1 && enabledStages.has(id);
      const next = isCurrentSolo ? new Set(allStageIds) : new Set([id]);
      setEnabled(next);
    },
    [enabledStages, setEnabled],
  );

  const resetStages = useCallback(() => {
    setEnabled(new Set(allStageIds));
  }, [setEnabled]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setSelected]);

  return (
    <>
      <MapErrorBoundary>
        <AtlasMap
          nodes={atlas.nodes}
          stages={atlas.stages}
          flows={displayedFlows}
          enabledStages={enabledStages}
          selectedNodeId={selectedId}
          hoveredNodeId={hoveredNodeId}
          flowsVisible={flowsVisible}
          chokepointMode={chokepointMode}
          chokepointNodeIds={chokepointNodeIds}
          onNodeClick={setSelected}
          onNodeHover={setHoveredNodeId}
          onLoadedChange={setMapLoaded}
        />
      </MapErrorBoundary>
      {!mapLoaded && <LoadingSkeleton />}
      <StagePanel
        stages={atlas.stages}
        megaLayers={atlas.megaLayers}
        enabled={enabledStages}
        countByStage={countByStage}
        onToggle={toggleStage}
        onToggleMegaLayer={toggleMegaLayer}
        onSolo={soloStage}
        onReset={resetStages}
      />
      <MapControls
        flowsVisible={flowsVisible}
        onToggleFlows={() => setFlowsVisible((visible) => !visible)}
        showAllFlows={showAllFlows}
        onToggleAllFlows={() => setShowAllFlows((visible) => !visible)}
        chokepointMode={chokepointMode}
        onToggleChokepoint={() => setChokepointMode((active) => !active)}
        chokepointCount={chokepointCount}
      />
      <NodeDetail
        node={selectedNode}
        stage={selectedStage}
        chokepointMode={chokepointMode}
        isMobile={isMobile}
        onClose={() => setSelected(null)}
      />
      <WelcomeOverlay />
    </>
  );
}

function getDisplayedFlows(showAllFlows: boolean, selectedId: string | null): Flow[] {
  const base = showAllFlows ? atlas.allFlows : atlas.flows;
  if (!selectedId) return base;

  const flowsById = new Map(base.map((flow) => [flow.id, flow]));
  for (const flow of atlas.allFlows) {
    if (flow.fromId === selectedId || flow.toId === selectedId) {
      flowsById.set(flow.id, flow);
    }
  }
  return [...flowsById.values()];
}
