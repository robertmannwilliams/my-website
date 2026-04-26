"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import stack from "@/features/aistack/data/stack.json";
import type {
  ChokepointSeverity,
  Flow,
  StackAtlas,
  StageId,
} from "@/features/aistack/types/stack";
import { NodeDetail } from "@/features/aistack/components/panels/NodeDetail";
import { StagePanel } from "@/features/aistack/components/panels/StagePanel";
import { MapControls } from "@/features/aistack/components/map/MapControls";
import { MapErrorBoundary } from "@/features/aistack/components/map/MapErrorBoundary";
import { LoadingSkeleton } from "@/features/aistack/components/map/LoadingSkeleton";
import {
  createStagePinLink,
  setStagePinSize,
} from "@/features/aistack/components/map/StagePin";
import { WelcomeOverlay } from "@/features/aistack/components/WelcomeOverlay";
import {
  buildHrefWithNode,
  buildHrefWithStages,
  getEnabledStageIds,
  getSelectedNodeId,
} from "@/features/aistack/lib/url-state";
import { buildFlowFeatures, emptyFlowCollection } from "@/features/aistack/lib/flows";
import { useIsMobile } from "@/features/aistack/lib/useIsMobile";

const atlas = stack as StackAtlas;
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

const chokepointNodeIds: ReadonlySet<string> = new Set(
  atlas.nodes
    .filter(
      (n) =>
        n.chokepointSeverity === "monopoly" ||
        n.chokepointSeverity === "duopoly",
    )
    .map((n) => n.id),
);
const chokepointCount = chokepointNodeIds.size;

const FLOW_SOURCE_ID = "stack-flows";
const FLOW_LAYER_ID = "stack-flows-layer";
const PIN_SOURCE_ID = "stack-pins";
const CLUSTER_LAYER_ID = "stack-pin-clusters";
const CLUSTER_COUNT_LAYER_ID = "stack-pin-cluster-count";
const PIN_LAYER_ID = "stack-pin-points";
const HTML_MARKER_MIN_ZOOM = 5;
const INITIAL_VIEW = { center: [150, 25] as [number, number], zoom: 2 };
const MAP_PALETTE = {
  paper: "#ede4cf",
  water: "#c5d2d8",
  border: "#9a8e74",
  ink: "#3a3228",
  cityInk: "#6f6657",
};

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const flowLayerReadyRef = useRef(false);
  const suppressNextMapClickRef = useRef(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [flowsVisible, setFlowsVisible] = useState(true);
  const [showAllFlows, setShowAllFlows] = useState(false);
  const [chokepointMode, setChokepointMode] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedOverride, setSelectedOverride] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const selectedId = selectedOverride ?? getSelectedNodeId(searchParams);
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
  const displayedFlows = useMemo(
    () => getDisplayedFlows(showAllFlows, selectedId),
    [selectedId, showAllFlows],
  );
  const enabledStagesRef = useRef(enabledStages);
  const chokepointModeRef = useRef(chokepointMode);

  useEffect(() => {
    enabledStagesRef.current = enabledStages;
  }, [enabledStages]);

  useEffect(() => {
    chokepointModeRef.current = chokepointMode;
  }, [chokepointMode]);

  const setSelected = useCallback(
    (id: string | null) => {
      setSelectedOverride(id);
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

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const container = containerRef.current;

    const handleMarkerActivation = (event: MouseEvent | PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const markerButton = target.closest<HTMLElement>("[data-node-id]");
      const nodeId = markerButton?.dataset.nodeId;
      if (!nodeId) return;
      event.preventDefault();
      event.stopPropagation();
      suppressNextMapClickRef.current = true;
      setSelectedRef.current(nodeId);
      window.setTimeout(() => {
        suppressNextMapClickRef.current = false;
      }, 0);
    };

    container.addEventListener("pointerdown", handleMarkerActivation, true);
    container.addEventListener("mousedown", handleMarkerActivation, true);
    container.addEventListener("click", handleMarkerActivation, true);

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
      // occlusion fade). The inner link is where we apply chokepoint
      // dimming + pulse styling so the two don't fight.
      const wrapper = document.createElement("div");
      wrapper.className = "stack-html-marker";
      wrapper.style.display = "block";
      wrapper.style.pointerEvents = "auto";
      wrapper.style.zIndex = "2";
      wrapper.addEventListener("click", (event) => {
        event.stopPropagation();
      });
      const inner = createStagePinLink({
        stageId: node.stage,
        label: node.name,
        href: `/aistack?node=${encodeURIComponent(node.id)}`,
        nodeId: node.id,
      });
      inner.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        suppressNextMapClickRef.current = true;
        setSelectedRef.current(node.id);
        window.setTimeout(() => {
          suppressNextMapClickRef.current = false;
        }, 0);
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

    const installMapLayers = () => {
      if (flowLayerReadyRef.current) return;
      applyPaperAtlasMapStyle(map);
      map.addSource(PIN_SOURCE_ID, {
        type: "geojson",
        data: buildPinCollection(enabledStagesRef.current),
        cluster: true,
        clusterRadius: 40,
        clusterMaxZoom: HTML_MARKER_MIN_ZOOM,
      });

      const firstSymbol = map
        .getStyle()
        ?.layers?.find((l) => l.type === "symbol")?.id;

      map.addLayer(
        {
          id: CLUSTER_LAYER_ID,
          type: "circle",
          source: PIN_SOURCE_ID,
          filter: ["has", "point_count"],
          paint: {
            "circle-color": "#fbf7ee",
            "circle-radius": [
              "step",
              ["get", "point_count"],
              18,
              25,
              24,
              75,
              31,
            ],
            "circle-stroke-color": "rgba(68, 54, 37, 0.7)",
            "circle-stroke-width": 1.5,
          },
          maxzoom: HTML_MARKER_MIN_ZOOM,
        },
        firstSymbol,
      );

      map.addLayer(
        {
          id: CLUSTER_COUNT_LAYER_ID,
          type: "symbol",
          source: PIN_SOURCE_ID,
          filter: ["has", "point_count"],
          layout: {
            "text-field": ["get", "point_count_abbreviated"],
            "text-size": 13,
            "text-allow-overlap": true,
          },
          paint: {
            "text-color": "#443625",
          },
          maxzoom: HTML_MARKER_MIN_ZOOM,
        },
        firstSymbol,
      );

      map.addLayer(
        {
          id: PIN_LAYER_ID,
          type: "circle",
          source: PIN_SOURCE_ID,
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": ["get", "stageColor"],
            "circle-radius": [
              "case",
              ["==", ["get", "severity"], "monopoly"],
              7,
              ["==", ["get", "severity"], "duopoly"],
              6,
              5,
            ],
            "circle-opacity": 0.95,
            "circle-stroke-color": "rgba(68, 54, 37, 0.7)",
            "circle-stroke-width": 1.3,
          },
          maxzoom: HTML_MARKER_MIN_ZOOM,
        },
        firstSymbol,
      );

      map.addSource(FLOW_SOURCE_ID, {
        type: "geojson",
        data: emptyFlowCollection(),
      });

      map.addLayer(
        {
          id: FLOW_LAYER_ID,
          type: "line",
          source: FLOW_SOURCE_ID,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": ["get", "color"],
            "line-opacity": ["get", "opacity"],
            "line-opacity-transition": { duration: 150 },
            "line-width": ["get", "width"],
            "line-width-transition": { duration: 150 },
            "line-dasharray": [
              "step",
              ["zoom"],
              ["literal", [0.8, 1.6]],
              3,
              ["literal", [1, 0]],
            ],
          },
        },
        firstSymbol,
      );

      map.on("click", CLUSTER_LAYER_ID, (event) => {
        const feature = map.queryRenderedFeatures(event.point, {
          layers: [CLUSTER_LAYER_ID],
        })[0];
        const clusterId = feature?.properties?.cluster_id as number | undefined;
        const source = map.getSource(PIN_SOURCE_ID) as
          | mapboxgl.GeoJSONSource
          | undefined;
        if (clusterId === undefined || !source) return;
        source.getClusterExpansionZoom(clusterId, (error, zoom) => {
          if (error || zoom === null || zoom === undefined) return;
          const geometry = feature.geometry as GeoJSON.Point;
          map.easeTo({
            center: geometry.coordinates as [number, number],
            zoom,
            duration: 650,
          });
        });
      });

      map.on("click", PIN_LAYER_ID, (event) => {
        const feature = map.queryRenderedFeatures(event.point, {
          layers: [PIN_LAYER_ID],
        })[0];
        const nodeId = feature?.properties?.nodeId as string | undefined;
        if (nodeId) setSelectedRef.current(nodeId);
      });

      map.on("mouseenter", CLUSTER_LAYER_ID, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", CLUSTER_LAYER_ID, () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", PIN_LAYER_ID, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", PIN_LAYER_ID, () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mousemove", FLOW_LAYER_ID, handleMouseMove);
      map.on("mouseleave", FLOW_LAYER_ID, handleMouseLeave);
      map.on("zoom", () => {
        syncHtmlMarkers(
          map,
          markers,
          enabledStagesRef.current,
          chokepointModeRef.current,
        );
      });

      flowLayerReadyRef.current = true;
      applyPinLayerPaint(map, chokepointModeRef.current);
      syncHtmlMarkers(
        map,
        markers,
        enabledStagesRef.current,
        chokepointModeRef.current,
      );
      setMapLoaded(true);
    };

    if (map.isStyleLoaded()) {
      installMapLayers();
    } else {
      map.on("load", installMapLayers);
      // Fallback: hide the skeleton after a generous timeout even if
      // `load` never fires (e.g. interrupted style fetch in dev HMR).
      window.setTimeout(() => setMapLoaded(true), 2500);
    }

    map.on("click", (e) => {
      if (suppressNextMapClickRef.current) {
        suppressNextMapClickRef.current = false;
        return;
      }
      const target = e.originalEvent.target;
      if (target instanceof Element && target.closest(".stack-html-marker")) {
        return;
      }
      const hit = map.queryRenderedFeatures(e.point, {
        layers: [FLOW_LAYER_ID, PIN_LAYER_ID, CLUSTER_LAYER_ID],
      });
      if (hit.length > 0) return;
      setSelectedRef.current(null);
    });

    return () => {
      container.removeEventListener("pointerdown", handleMarkerActivation, true);
      container.removeEventListener("mousedown", handleMarkerActivation, true);
      container.removeEventListener("click", handleMarkerActivation, true);
      popup.remove();
      map.remove();
      mapRef.current = null;
      flowLayerReadyRef.current = false;
      markers.clear();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (map && flowLayerReadyRef.current) {
      const source = map.getSource(PIN_SOURCE_ID) as
        | mapboxgl.GeoJSONSource
        | undefined;
      source?.setData(buildPinCollection(enabledStages));
      syncHtmlMarkers(map, markersRef.current, enabledStages, chokepointMode);
    }
  }, [chokepointMode, enabledKey, enabledStages]);

  // Chokepoint mode — dim diversified pins; pulse monopoly pins. Target the
  // inner link so Mapbox's globe-occlusion opacity on the outer element
  // keeps working.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flowLayerReadyRef.current) return;
    applyPinLayerPaint(map, chokepointMode);
    syncHtmlMarkers(map, markersRef.current, enabledStages, chokepointMode);
  }, [chokepointMode, enabledKey, enabledStages]);

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
            flows: displayedFlows,
            nodeById,
            stageById,
            enabledStages,
            hoveredNodeId,
            selectedNodeId: selectedId,
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
  }, [
    chokepointMode,
    displayedFlows,
    enabledKey,
    enabledStages,
    flowsVisible,
    hoveredNodeId,
    selectedId,
  ]);

  // Esc closes the active detail panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedRef.current(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <MapErrorBoundary>
        <div className="fixed inset-0">
          <div ref={containerRef} className="h-full w-full" />
          <div className="paper-texture" aria-hidden="true" />
        </div>
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
        onToggleFlows={() => setFlowsVisible((v) => !v)}
        showAllFlows={showAllFlows}
        onToggleAllFlows={() => setShowAllFlows((v) => !v)}
        chokepointMode={chokepointMode}
        onToggleChokepoint={() => setChokepointMode((v) => !v)}
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

type PinFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  {
    nodeId: string;
    name: string;
    stage: StageId;
    stageColor: string;
    severity: ChokepointSeverity;
  }
>;

function buildPinCollection(enabledStages: Set<StageId>): PinFeatureCollection {
  return {
    type: "FeatureCollection",
    features: atlas.nodes
      .filter((node) => enabledStages.has(node.stage))
      .map((node) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: node.coordinates,
        },
        properties: {
          nodeId: node.id,
          name: node.name,
          stage: node.stage,
          stageColor: stageById.get(node.stage)?.color ?? "#888888",
          severity: node.chokepointSeverity,
        },
      })),
  };
}

function applyPinLayerPaint(map: mapboxgl.Map, chokepointMode: boolean) {
  if (!map.getLayer(PIN_LAYER_ID)) return;
  map.setPaintProperty(
    PIN_LAYER_ID,
    "circle-opacity",
    chokepointMode
      ? [
          "case",
          ["in", ["get", "severity"], ["literal", ["monopoly", "duopoly"]]],
          0.95,
          0.2,
        ]
      : 0.95,
  );
}

function syncHtmlMarkers(
  map: mapboxgl.Map,
  markers: Map<string, mapboxgl.Marker>,
  enabledStages: Set<StageId>,
  chokepointMode: boolean,
) {
  const showHtmlMarkers = map.getZoom() >= HTML_MARKER_MIN_ZOOM;
  for (const node of atlas.nodes) {
    const marker = markers.get(node.id);
    if (!marker) continue;
    const wrapper = marker.getElement();
    const inner = wrapper.firstElementChild as HTMLElement | null;
    wrapper.style.display =
      showHtmlMarkers && enabledStages.has(node.stage) ? "block" : "none";
    if (!inner) continue;
    inner.classList.remove("chokepoint-pulse-4", "chokepoint-pulse-5");

    const isMonopoly = node.chokepointSeverity === "monopoly";
    const isDuopoly = node.chokepointSeverity === "duopoly";
    const size = chokepointMode && isMonopoly ? 38 : chokepointMode && isDuopoly ? 35 : 32;
    setStagePinSize(inner, size);

    if (!chokepointMode) {
      inner.style.opacity = "";
      return;
    }

    inner.style.opacity = isMonopoly || isDuopoly ? "1" : "0.2";
    if (isMonopoly) inner.classList.add("chokepoint-pulse-4");
  }
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

function applyPaperAtlasMapStyle(map: mapboxgl.Map) {
  map.setFog({
    color: "rgb(245, 240, 225)",
    "high-color": "rgb(220, 210, 185)",
    "horizon-blend": 0.2,
    "space-color": "rgb(240, 232, 215)",
    "star-intensity": 0,
  });

  for (const layer of map.getStyle().layers ?? []) {
    const id = layer.id.toLowerCase();

    if (layer.type === "background") {
      setPaint(map, layer.id, "background-color", MAP_PALETTE.paper);
      continue;
    }

    if (shouldHideMapLayer(id)) {
      setLayout(map, layer.id, "visibility", "none");
      continue;
    }

    if (id.includes("water")) {
      if (layer.type === "fill") setPaint(map, layer.id, "fill-color", MAP_PALETTE.water);
      if (layer.type === "line") setPaint(map, layer.id, "line-color", MAP_PALETTE.water);
      if (layer.type === "symbol") setLayout(map, layer.id, "visibility", "none");
      continue;
    }

    if (
      id.includes("land") ||
      id.includes("landuse") ||
      id.includes("national-park")
    ) {
      if (layer.type === "fill") {
        setPaint(map, layer.id, "fill-color", MAP_PALETTE.paper);
        setPaint(map, layer.id, "fill-opacity", 0.8);
      }
      continue;
    }

    if (id.includes("admin") || id.includes("boundary")) {
      if (layer.type === "line") {
        setPaint(map, layer.id, "line-color", MAP_PALETTE.border);
        setPaint(map, layer.id, "line-opacity", 0.42);
        setPaint(map, layer.id, "line-width", 0.65);
      }
      continue;
    }

    if (layer.type === "symbol" && id.includes("country-label")) {
      setPaint(map, layer.id, "text-color", MAP_PALETTE.ink);
      setPaint(map, layer.id, "text-halo-color", "rgba(245, 240, 225, 0.55)");
      setPaint(map, layer.id, "text-halo-width", 0.4);
      continue;
    }

    if (layer.type === "symbol" && id.includes("settlement-major")) {
      setPaint(map, layer.id, "text-color", MAP_PALETTE.cityInk);
      setPaint(map, layer.id, "text-opacity", 0.62);
      setPaint(map, layer.id, "text-halo-color", "rgba(245, 240, 225, 0.45)");
      setPaint(map, layer.id, "text-halo-width", 0.3);
    }
  }
}

function shouldHideMapLayer(id: string): boolean {
  return [
    "road",
    "motorway",
    "street",
    "tunnel",
    "bridge",
    "rail",
    "transit",
    "airport",
    "aeroway",
    "ferry",
    "poi",
    "building",
    "housenum",
    "water-label",
    "marine-label",
    "natural-line-label",
    "settlement-subdivision",
    "settlement-minor",
    "state-label",
  ].some((pattern) => id.includes(pattern));
}

function setPaint(
  map: mapboxgl.Map,
  layerId: string,
  property: string,
  value: unknown,
) {
  try {
    const setPaintProperty = map.setPaintProperty.bind(map) as (
      id: string,
      key: string,
      next: unknown,
    ) => void;
    setPaintProperty(layerId, property, value);
  } catch {
    // Mapbox style templates vary; unsupported paint keys can be skipped.
  }
}

function setLayout(
  map: mapboxgl.Map,
  layerId: string,
  property: string,
  value: unknown,
) {
  try {
    const setLayoutProperty = map.setLayoutProperty.bind(map) as (
      id: string,
      key: string,
      next: unknown,
    ) => void;
    setLayoutProperty(layerId, property, value);
  } catch {
    // Mapbox style templates vary; unsupported layout keys can be skipped.
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
