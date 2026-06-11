"use client";

// The atlas map proper. Owns the mapbox-gl instance; loaded lazily (and
// code-split) by AtlasSection so the story page stays light.
//
// Sites render from a clustered GeoJSON source. Clusters draw as survey
// markers (circled Plex Mono count); the 41 co-located pairs spiderfy on
// click at max cluster zoom. Pin variants per DESIGN.md are canvas-drawn
// images (see ../map/pins).

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { buildPaperStyle } from "../map/paperStyle";
import { addPinImages, PIN_ICON_EXPRESSION } from "../map/pins";

const PAPER = "#F8F4E9";
const INK = "#2B4A8C";
const INK_STRONG = "#1C3263";

const MONO_MEDIUM = ["IBM Plex Mono Medium"];
const CLUSTER_MAX_ZOOM = 13;

export interface AtlasMapProps {
  data: GeoJSON.FeatureCollection;
  /** Non-null switches the atlas into scenario view: clustering off,
   *  disrupted sites flagged red, impacted layers faded. */
  scenarioData: GeoJSON.FeatureCollection | null;
  selectedId: string | null;
  onSelect: (siteId: string | null) => void;
  onMapReady?: (map: mapboxgl.Map) => void;
}

const WORLD_VIEW = {
  center: [18, 26] as [number, number],
  zoom: 1.25,
};

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function AtlasMap({
  data,
  scenarioData,
  selectedId,
  onSelect,
  onMapReady,
}: AtlasMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const loadedRef = useRef(false);
  const applyScenarioRef = useRef<
    ((fc: GeoJSON.FeatureCollection | null) => void) | null
  >(null);
  const dataRef = useRef(data);
  const scenarioRef = useRef(scenarioData);
  const selectedRef = useRef(selectedId);
  const onSelectRef = useRef(onSelect);
  const onMapReadyRef = useRef(onMapReady);
  // Keep latest props readable from map event handlers without re-running
  // the map-init effect. Runs after every render.
  useEffect(() => {
    dataRef.current = data;
    scenarioRef.current = scenarioData;
    selectedRef.current = selectedId;
    onSelectRef.current = onSelect;
    onMapReadyRef.current = onMapReady;
  });

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!containerRef.current || mapRef.current) return;
    if (!token) {
      console.error("Missing NEXT_PUBLIC_MAPBOX_TOKEN");
      return;
    }
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: buildPaperStyle(window.location.origin),
      center: WORLD_VIEW.center,
      zoom: WORLD_VIEW.zoom,
      minZoom: 1,
      maxZoom: 14.5,
      attributionControl: false,
      logoPosition: "bottom-left",
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      // The atlas sits mid-page: plain scrolling must scroll the PAGE.
      // Zoom needs cmd/ctrl+wheel; panning on touch needs two fingers.
      cooperativeGestures: true,
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      "bottom-right",
    );
    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "bottom-right",
    );
    map.on("error", (e) => {
      console.error("[atlas map]", e.error?.message ?? e.error ?? e);
    });

    const clearSpider = () => {
      const spider = map.getSource("spider") as mapboxgl.GeoJSONSource | undefined;
      if (spider) spider.setData({ type: "FeatureCollection", features: [] });
    };

    const spiderfy = (clusterId: number, center: [number, number]) => {
      const source = map.getSource("sites") as mapboxgl.GeoJSONSource;
      source.getClusterLeaves(clusterId, 30, 0, (err, leaves) => {
        if (err || !leaves) return;
        placeSpider(leaves as GeoJSON.Feature[], center);
      });
    };

    const placeSpider = (leaves: GeoJSON.Feature[], center: [number, number]) => {
      const origin = map.project(center);
      const n = leaves.length;
      const radius = Math.min(20 + n * 3.5, 52);
      const features: GeoJSON.Feature[] = [];
      leaves.forEach((leaf, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const px = origin.x + radius * Math.cos(angle);
        const py = origin.y + radius * Math.sin(angle);
        const pos = map.unproject([px, py]);
        features.push({
          type: "Feature",
          properties: leaf.properties,
          geometry: { type: "Point", coordinates: [pos.lng, pos.lat] },
        });
        features.push({
          type: "Feature",
          properties: { leader: true },
          geometry: {
            type: "LineString",
            coordinates: [center, [pos.lng, pos.lat]],
          },
        });
      });
      (map.getSource("spider") as mapboxgl.GeoJSONSource).setData({
        type: "FeatureCollection",
        features,
      });
    };

    map.on("load", () => {
      addPinImages(map);

      map.addSource("sites", {
        type: "geojson",
        data: dataRef.current,
        cluster: true,
        clusterMaxZoom: CLUSTER_MAX_ZOOM,
        clusterRadius: 38,
      });
      map.addSource("spider", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // Survey-marker clusters: hairline outer ring, paper disc, mono count.
      map.addLayer({
        id: "clusters-outer",
        type: "circle",
        source: "sites",
        filter: ["has", "point_count"],
        paint: {
          "circle-radius": [
            "step", ["get", "point_count"],
            13.5, 25, 16.5, 60, 19.5, 150, 23.5,
          ],
          "circle-color": "rgba(0,0,0,0)",
          "circle-stroke-color": INK,
          "circle-stroke-width": 0.6,
          "circle-stroke-opacity": 0.5,
        },
      });
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "sites",
        filter: ["has", "point_count"],
        paint: {
          "circle-radius": [
            "step", ["get", "point_count"],
            11, 25, 14, 60, 17, 150, 21,
          ],
          "circle-color": PAPER,
          "circle-opacity": 0.95,
          "circle-stroke-color": INK,
          "circle-stroke-width": 1.25,
        },
      });
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "sites",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": MONO_MEDIUM,
          "text-size": 10.5,
          "text-allow-overlap": true,
        },
        paint: { "text-color": INK_STRONG },
      });

      map.addLayer({
        id: "site-pins",
        type: "symbol",
        source: "sites",
        filter: ["!", ["has", "point_count"]],
        layout: {
          "icon-image": PIN_ICON_EXPRESSION as unknown as string,
          "icon-allow-overlap": true,
          "icon-padding": 0,
        },
      });

      map.addLayer({
        id: "spider-lines",
        type: "line",
        source: "spider",
        filter: ["has", "leader"],
        paint: {
          "line-color": INK,
          "line-width": 0.8,
          "line-dasharray": [1.6, 2.2],
          "line-opacity": 0.7,
        },
      });
      map.addLayer({
        id: "spider-pins",
        type: "symbol",
        source: "spider",
        filter: ["!", ["has", "leader"]],
        layout: {
          "icon-image": PIN_ICON_EXPRESSION as unknown as string,
          "icon-allow-overlap": true,
          "icon-padding": 0,
        },
      });

      // Scenario view: a parallel unclustered source, hidden until a
      // scenario is switched on (PLAN Phase 5).
      map.addSource("sites-scenario", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "scenario-unaffected",
        type: "symbol",
        source: "sites-scenario",
        filter: ["==", ["get", "scenario"], "unaffected"],
        layout: {
          "icon-image": PIN_ICON_EXPRESSION as unknown as string,
          "icon-allow-overlap": true,
          "icon-padding": 0,
          visibility: "none",
        },
        paint: { "icon-opacity": 0.8 },
      });
      map.addLayer({
        id: "scenario-impacted",
        type: "symbol",
        source: "sites-scenario",
        filter: ["==", ["get", "scenario"], "impacted"],
        layout: {
          "icon-image": PIN_ICON_EXPRESSION as unknown as string,
          "icon-allow-overlap": true,
          "icon-padding": 0,
          visibility: "none",
        },
        paint: { "icon-opacity": 0.2 },
      });
      map.addLayer({
        id: "scenario-disrupted-ring",
        type: "circle",
        source: "sites-scenario",
        filter: ["==", ["get", "scenario"], "disrupted"],
        layout: { visibility: "none" },
        paint: {
          "circle-radius": 10,
          "circle-color": "rgba(0,0,0,0)",
          "circle-stroke-color": "#C8502E",
          "circle-stroke-width": 1.6,
          "circle-stroke-opacity": 0.9,
        },
      });
      map.addLayer({
        id: "scenario-disrupted",
        type: "symbol",
        source: "sites-scenario",
        filter: ["==", ["get", "scenario"], "disrupted"],
        layout: {
          "icon-image": PIN_ICON_EXPRESSION as unknown as string,
          "icon-allow-overlap": true,
          "icon-padding": 0,
          "icon-size": 1.15,
          visibility: "none",
        },
      });

      // Selected site: active pin drawn on top.
      map.addLayer({
        id: "site-selected",
        type: "symbol",
        source: "sites",
        filter: ["==", ["get", "id"], "__none__"],
        layout: {
          "icon-image": [
            "concat",
            PIN_ICON_EXPRESSION as unknown as string,
            "-active",
          ] as unknown as string,
          "icon-allow-overlap": true,
          "icon-padding": 0,
        },
      });

      // --- interactions ---
      const tooltip = tooltipRef.current;
      const pinLayers = [
        "site-pins",
        "spider-pins",
        "site-selected",
        "scenario-disrupted",
        "scenario-unaffected",
        "scenario-impacted",
      ];

      map.on("mousemove", (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: [...pinLayers, "clusters"],
        });
        const top = features[0];
        map.getCanvas().style.cursor = top ? "pointer" : "";
        if (tooltip) {
          const name =
            top && !top.properties?.point_count
              ? String(top.properties?.name ?? "")
              : "";
          if (name) {
            tooltip.textContent = name;
            tooltip.style.opacity = "1";
            tooltip.style.transform = `translate(${e.point.x + 12}px, ${e.point.y + 12}px)`;
          } else {
            tooltip.style.opacity = "0";
          }
        }
      });

      map.on("click", (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: [...pinLayers, "clusters"],
        });
        const top = features[0];
        if (!top) {
          clearSpider();
          onSelectRef.current(null);
          return;
        }
        if (top.properties?.cluster) {
          const clusterId = top.properties.cluster_id as number;
          const center = (top.geometry as GeoJSON.Point).coordinates as [
            number,
            number,
          ];
          const source = map.getSource("sites") as mapboxgl.GeoJSONSource;
          source.getClusterExpansionZoom(clusterId, (err, expansionZoom) => {
            if (err || expansionZoom == null) return;
            if (
              expansionZoom > CLUSTER_MAX_ZOOM ||
              map.getZoom() >= expansionZoom
            ) {
              spiderfy(clusterId, center);
            } else {
              clearSpider();
              map.easeTo({
                center,
                zoom: expansionZoom + 0.3,
                duration: prefersReducedMotion() ? 0 : 550,
              });
            }
          });
          return;
        }
        const id = top.properties?.id;
        if (typeof id === "string") onSelectRef.current(id);
      });

      map.on("zoomstart", clearSpider);

      loadedRef.current = true;
      map.setFilter("site-selected", [
        "==",
        ["get", "id"],
        selectedRef.current ?? "__none__",
      ]);
      applyScenarioRef.current?.(scenarioRef.current);
      map.resize();
      onMapReadyRef.current?.(map);
    });

    // Swap between the clustered base view and the flat scenario view.
    applyScenarioRef.current = (fc: GeoJSON.FeatureCollection | null) => {
      if (!loadedRef.current) return;
      const on = fc !== null;
      if (on) {
        (map.getSource("sites-scenario") as mapboxgl.GeoJSONSource).setData(fc);
        clearSpider();
      }
      for (const id of ["clusters-outer", "clusters", "cluster-count", "site-pins"]) {
        map.setLayoutProperty(id, "visibility", on ? "none" : "visible");
      }
      for (const id of [
        "scenario-unaffected",
        "scenario-impacted",
        "scenario-disrupted-ring",
        "scenario-disrupted",
      ]) {
        map.setLayoutProperty(id, "visibility", on ? "visible" : "none");
      }
    };

    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __atlasMap?: mapboxgl.Map }).__atlasMap = map;
    }

    mapRef.current = map;
    return () => {
      loadedRef.current = false;
      applyScenarioRef.current = null;
      map.remove();
      mapRef.current = null;
    };
     
  }, []);

  // Filtered data → setData (clusters recount server-side in the source).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const source = map.getSource("sites") as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData(data);
      const spider = map.getSource("spider") as mapboxgl.GeoJSONSource;
      spider.setData({ type: "FeatureCollection", features: [] });
    }
  }, [data]);

  // Selection highlight.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    map.setFilter("site-selected", [
      "==",
      ["get", "id"],
      selectedId ?? "__none__",
    ]);
  }, [selectedId]);

  // Scenario view on/off.
  useEffect(() => {
    applyScenarioRef.current?.(scenarioData);
  }, [scenarioData]);

  return (
    <div ref={containerRef} className="atlas-map">
      <div ref={tooltipRef} className="atlas-map__tooltip atlas-mono" />
    </div>
  );
}
