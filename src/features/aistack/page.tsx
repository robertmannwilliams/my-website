"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import { atlasStages, getStageColorVar } from "@/features/aistack/content/stages";
import stack from "@/features/aistack/data/stack.json";
import type { Node, StackAtlas, StageId } from "@/features/aistack/types/stack";
import { NodeDetail } from "@/features/aistack/components/panels/NodeDetail";
import { StagePanel } from "@/features/aistack/components/panels/StagePanel";
import { MapControls } from "@/features/aistack/components/map/MapControls";
import { MapErrorBoundary } from "@/features/aistack/components/map/MapErrorBoundary";
import { LoadingSkeleton } from "@/features/aistack/components/map/LoadingSkeleton";
import { TourNarration } from "@/features/aistack/components/tour/TourNarration";
import { WelcomeOverlay } from "@/features/aistack/components/WelcomeOverlay";
import {
  buildHrefWithNode,
  buildHrefWithStages,
  getEnabledStageIds,
  getSelectedNodeId,
} from "@/features/aistack/lib/url-state";
import { buildFlowFeatures, emptyFlowCollection } from "@/features/aistack/lib/flows";
import { mainTour } from "@/features/aistack/lib/tour-sequences";
import { useIsMobile } from "@/features/aistack/lib/useIsMobile";

const atlas = { ...(stack as StackAtlas), stages: atlasStages } satisfies StackAtlas;
const stageById = new Map(atlas.stages.map((s) => [s.id, s]));
const nodeById = new Map(atlas.nodes.map((n) => [n.id, n]));
const allStageIds = atlas.stages.map((s) => s.id);

const countByStage = atlas.stages.reduce<Record<StageId, number>>(
  (acc, stage) => {
    acc[stage.id] = atlas.nodes.filter((n) => n.stage === stage.id).length;
    return acc;
  },
  {} as Record<StageId, number>,
);

const tourStops: Node[] = mainTour
  .map((id) => nodeById.get(id))
  .filter((n): n is Node => Boolean(n));

const chokepointNodeIds: ReadonlySet<string> = new Set(
  atlas.nodes.filter((n) => n.chokepointRisk >= 4).map((n) => n.id),
);
const chokepointCount = chokepointNodeIds.size;

const FLOW_SOURCE_ID = "stack-flows";
const FLOW_LAYER_ID = "stack-flows-layer";
const TOUR_STOP_MS = 8000;
const TOUR_FLYTO_MS = 2000;
const TOUR_ZOOM = 4.5;
const INITIAL_VIEW = { center: [150, 25] as [number, number], zoom: 2 };

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const flowLayerReadyRef = useRef(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [flowsVisible, setFlowsVisible] = useState(true);
  const [chokepointMode, setChokepointMode] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    setMounted(true);
  }, []);

  const [tourActive, setTourActive] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);
  const [tourPaused, setTourPaused] = useState(false);
  const [tourProgress, setTourProgress] = useState(0);

  const selectedId = getSelectedNodeId(searchParams);
  const selectedNode = selectedId ? nodeById.get(selectedId) ?? null : null;
  const selectedStage = selectedNode
    ? stageById.get(selectedNode.stage) ?? null
    : null;

  const enabledStages = useMemo(
    () => getEnabledStageIds(searchParams, allStageIds),
    [searchParams],
  );
  const enabledKey = useMemo(
    () => [...enabledStages].sort().join(","),
    [enabledStages],
  );

  const setSelected = useCallback(
    (id: string | null) => {
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

  const currentTourStop = tourActive ? tourStops[tourIndex] ?? null : null;
  const currentTourStage = currentTourStop
    ? stageById.get(currentTourStop.stage) ?? null
    : null;

  const startTour = useCallback(() => {
    if (tourActive) return;
    setTourIndex(0);
    setTourPaused(false);
    setTourProgress(0);
    setTourActive(true);
  }, [tourActive]);

  const exitTour = useCallback(() => {
    setTourActive(false);
    setTourPaused(false);
    setTourProgress(0);
    setSelected(null);
    const map = mapRef.current;
    if (map) {
      map.flyTo({
        center: INITIAL_VIEW.center,
        zoom: INITIAL_VIEW.zoom,
        duration: TOUR_FLYTO_MS,
        essential: true,
      });
    }
  }, [setSelected]);

  const nextStop = useCallback(() => {
    if (!tourActive) return;
    if (tourIndex < tourStops.length - 1) {
      setTourIndex((i) => i + 1);
    } else {
      exitTour();
    }
  }, [tourActive, tourIndex, exitTour]);

  const prevStop = useCallback(() => {
    if (!tourActive) return;
    if (tourIndex > 0) setTourIndex((i) => i - 1);
  }, [tourActive, tourIndex]);

  const togglePause = useCallback(() => {
    if (!tourActive) return;
    setTourPaused((p) => !p);
  }, [tourActive]);

  // Keep the latest action references for the keyboard effect without
  // re-registering listeners on every state change.
  const setSelectedRef = useRef(setSelected);
  useEffect(() => {
    setSelectedRef.current = setSelected;
  }, [setSelected]);

  const setHoveredRef = useRef(setHoveredNodeId);
  useEffect(() => {
    setHoveredRef.current = setHoveredNodeId;
  }, [setHoveredNodeId]);

  const tourHandlersRef = useRef({
    nextStop,
    prevStop,
    exitTour,
    togglePause,
  });
  useEffect(() => {
    tourHandlersRef.current = { nextStop, prevStop, exitTour, togglePause };
  });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.error("Missing NEXT_PUBLIC_MAPBOX_TOKEN");
      return;
    }
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      projection: "globe",
      center: INITIAL_VIEW.center,
      zoom: INITIAL_VIEW.zoom,
    });
    mapRef.current = map;

    const markers = markersRef.current;
    for (const node of atlas.nodes) {
      // Mapbox owns the outer element's `opacity` (it uses it for globe
      // occlusion fade). The inner button is where we apply chokepoint
      // dimming + pulse styling so the two don't fight.
      const wrapper = document.createElement("div");
      wrapper.style.display = "block";
      const inner = document.createElement("button");
      inner.type = "button";
      inner.setAttribute("aria-label", node.name);
      inner.style.width = "14px";
      inner.style.height = "14px";
      inner.style.padding = "0";
      inner.style.borderRadius = "9999px";
      inner.style.background = getStageColorVar(node.stage);
      inner.style.border = "1.5px solid rgba(68, 54, 37, 0.6)";
      inner.style.boxShadow =
        "0 0 0 1px rgba(246, 240, 225, 0.85), 0 4px 12px rgba(93, 75, 51, 0.12)";
      inner.style.cursor = "pointer";
      inner.addEventListener("click", (event) => {
        event.stopPropagation();
        setSelectedRef.current(node.id);
      });
      inner.addEventListener("mouseenter", () => {
        setHoveredRef.current(node.id);
      });
      inner.addEventListener("mouseleave", () => {
        setHoveredRef.current(null);
      });
      wrapper.appendChild(inner);

      const marker = new mapboxgl.Marker({ element: wrapper, anchor: "center" })
        .setLngLat(node.coordinates)
        .addTo(map);
      markers.set(node.id, marker);
    }

    const popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: "flow-tooltip",
      offset: 12,
    });

    const handleMouseMove = (e: mapboxgl.MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const props = feature.properties as
        | { material?: string; notes?: string }
        | null;
      map.getCanvas().style.cursor = "pointer";
      const material = props?.material ?? "";
      const notes = props?.notes ?? "";
      popup
        .setLngLat(e.lngLat)
        .setHTML(
          `<div class="flow-tooltip-material">${escapeHtml(material)}</div>${
            notes
              ? `<div class="flow-tooltip-notes">${escapeHtml(notes)}</div>`
              : ""
          }`,
        )
        .addTo(map);
    };
    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = "";
      popup.remove();
    };

    const installFlowsLayer = () => {
      if (flowLayerReadyRef.current) return;
      map.addSource(FLOW_SOURCE_ID, {
        type: "geojson",
        data: emptyFlowCollection(),
      });

      const firstSymbol = map
        .getStyle()
        ?.layers?.find((l) => l.type === "symbol")?.id;
      map.addLayer(
        {
          id: FLOW_LAYER_ID,
          type: "line",
          source: FLOW_SOURCE_ID,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": ["get", "color"],
            "line-opacity": ["get", "opacity"],
            "line-width": ["get", "width"],
          },
        },
        firstSymbol,
      );

      map.on("mousemove", FLOW_LAYER_ID, handleMouseMove);
      map.on("mouseleave", FLOW_LAYER_ID, handleMouseLeave);

      flowLayerReadyRef.current = true;
      setMapLoaded(true);
    };

    if (map.isStyleLoaded()) {
      installFlowsLayer();
    } else {
      map.on("load", installFlowsLayer);
      // Fallback: hide the skeleton after a generous timeout even if
      // `load` never fires (e.g. interrupted style fetch in dev HMR).
      window.setTimeout(() => setMapLoaded(true), 2500);
    }

    map.on("click", (e) => {
      const hit = map.queryRenderedFeatures(e.point, {
        layers: [FLOW_LAYER_ID],
      });
      if (hit.length > 0) return;
      setSelectedRef.current(null);
    });

    return () => {
      popup.remove();
      map.remove();
      mapRef.current = null;
      flowLayerReadyRef.current = false;
      markers.clear();
    };
  }, []);

  useEffect(() => {
    for (const node of atlas.nodes) {
      const marker = markersRef.current.get(node.id);
      if (!marker) continue;
      marker.getElement().style.display = enabledStages.has(node.stage)
        ? ""
        : "none";
    }
  }, [enabledKey, enabledStages]);

  // Chokepoint mode — dim low-risk pins; pulse high-risk pins. Target the
  // inner button so Mapbox's globe-occlusion opacity on the outer element
  // keeps working.
  useEffect(() => {
    for (const node of atlas.nodes) {
      const marker = markersRef.current.get(node.id);
      if (!marker) continue;
      const inner = marker.getElement().firstElementChild as
        | HTMLElement
        | null;
      if (!inner) continue;
      inner.classList.remove("chokepoint-pulse-4", "chokepoint-pulse-5");
      if (chokepointMode) {
        const critical = node.chokepointRisk >= 4;
        inner.style.opacity = critical ? "1" : "0.2";
        if (node.chokepointRisk === 5) inner.classList.add("chokepoint-pulse-5");
        else if (node.chokepointRisk === 4)
          inner.classList.add("chokepoint-pulse-4");
      } else {
        inner.style.opacity = "";
      }
    }
  }, [chokepointMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      if (!flowLayerReadyRef.current) return;
      map.setLayoutProperty(
        FLOW_LAYER_ID,
        "visibility",
        flowsVisible ? "visible" : "none",
      );
      const source = map.getSource(FLOW_SOURCE_ID) as
        | mapboxgl.GeoJSONSource
        | undefined;
      if (!source) return;
      const data = flowsVisible
        ? buildFlowFeatures({
            flows: atlas.flows,
            nodeById,
            stageById,
            enabledStages,
            hoveredNodeId,
            chokepointMode,
            chokepointNodeIds,
          })
        : emptyFlowCollection();
      source.setData(data);
    };

    if (flowLayerReadyRef.current) {
      apply();
    } else {
      const onLoad = () => apply();
      map.on("load", onLoad);
      return () => {
        map.off("load", onLoad);
      };
    }
  }, [enabledKey, enabledStages, flowsVisible, hoveredNodeId, chokepointMode]);

  // Drive camera + panel from tour index
  useEffect(() => {
    if (!tourActive) return;
    const stop = tourStops[tourIndex];
    if (!stop) return;
    const map = mapRef.current;
    if (map) {
      map.flyTo({
        center: stop.coordinates,
        zoom: TOUR_ZOOM,
        duration: TOUR_FLYTO_MS,
        essential: true,
      });
    }
    setSelected(stop.id);
    // setSelected is recreated per render; we deliberately only react to
    // the tour state here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourActive, tourIndex]);

  // Auto-advance timer
  useEffect(() => {
    if (!tourActive || tourPaused) return;
    setTourProgress(0);
    const startTime = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - startTime) / TOUR_STOP_MS, 1);
      setTourProgress(p);
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        tourHandlersRef.current.nextStop();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [tourActive, tourIndex, tourPaused]);

  // Combined keyboard handling — Esc closes panel when idle, drives the
  // tour when one is active.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (tourActive) {
        if (e.key === "Escape") {
          e.preventDefault();
          tourHandlersRef.current.exitTour();
        } else if (e.key === " " || e.code === "Space") {
          e.preventDefault();
          tourHandlersRef.current.togglePause();
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          tourHandlersRef.current.nextStop();
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          tourHandlersRef.current.prevStop();
        }
      } else if (e.key === "Escape") {
        setSelectedRef.current(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tourActive]);

  // On mobile during a tour, the NodeDetail sheet and the TourNarration
  // would both dock at the bottom — hide the panel and let the narration
  // be the source of truth for the current stop.
  const showDetail = !(isMobile && tourActive);

  return (
    <>
      <MapErrorBoundary>
        <div className="fixed inset-0">
          <div ref={containerRef} className="h-full w-full" />
        </div>
      </MapErrorBoundary>
      {!mapLoaded && <LoadingSkeleton />}
      <StagePanel
        stages={atlas.stages}
        enabled={enabledStages}
        countByStage={countByStage}
        onToggle={toggleStage}
        onSolo={soloStage}
        onReset={resetStages}
      />
      <MapControls
        flowsVisible={flowsVisible}
        onToggleFlows={() => setFlowsVisible((v) => !v)}
        onStartTour={startTour}
        tourActive={tourActive}
        chokepointMode={chokepointMode}
        onToggleChokepoint={() => setChokepointMode((v) => !v)}
        chokepointCount={chokepointCount}
      />
      {mounted && (
        <NodeDetail
          node={showDetail ? selectedNode : null}
          stage={showDetail ? selectedStage : null}
          chokepointMode={chokepointMode}
          isMobile={isMobile}
          onClose={() => setSelected(null)}
        />
      )}
      <TourNarration
        active={tourActive}
        stop={currentTourStop}
        stage={currentTourStage}
        index={tourIndex}
        total={tourStops.length}
        paused={tourPaused}
        progress={tourProgress}
        onPlayPause={togglePause}
        onNext={nextStop}
        onPrev={prevStop}
        onExit={exitTour}
      />
      <WelcomeOverlay />
    </>
  );
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
