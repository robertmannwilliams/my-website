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

/** Pins grow with zoom: roughly today's size at survey zooms, then larger
 *  as the sheet empties out (we draw no roads — past ~z10 the pins and
 *  their labels ARE the map). */
const PIN_SIZE = [
  "interpolate", ["linear"], ["zoom"],
  3, 0.85,
  8, 1,
  11, 1.2,
] as const;

/** Co-located campuses (the 41 near-identical pairs) spiderfy instead of
 *  zooming; anything spread wider frames its contents on click. */
const CAMPUS_SPAN_DEG = 0.02;

export interface AtlasMapProps {
  data: GeoJSON.FeatureCollection;
  /** Non-null switches the atlas into scenario view: clustering off,
   *  disrupted sites flagged red, impacted layers faded. */
  scenarioData: GeoJSON.FeatureCollection | null;
  /** Page-end lock: when true the map owns scroll/drag gestures; while
   *  false (approaching) it must never steal the page scroll. */
  locked: boolean;
  selectedId: string | null;
  onSelect: (siteId: string | null) => void;
  onMapReady?: (map: mapboxgl.Map) => void;
}

// Framed on the inhabited world (mercator wastes half its canvas on the
// poles), high enough that country names are on the sheet from the start.
const WORLD_VIEW = {
  center: [12, 30] as [number, number],
  zoom: 1.45,
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
  locked,
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
  const lockedRef = useRef(locked);
  const selectedRef = useRef(selectedId);
  const onSelectRef = useRef(onSelect);
  const onMapReadyRef = useRef(onMapReady);
  // Keep latest props readable from map event handlers without re-running
  // the map-init effect. Runs after every render.
  useEffect(() => {
    dataRef.current = data;
    scenarioRef.current = scenarioData;
    lockedRef.current = locked;
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
      // Gesture-dead until the page bottoms out (the `locked` effect
      // below) — while approaching, scroll belongs to the page.
      scrollZoom: false,
      dragPan: false,
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
        // Small radius: metros decompose by ~z7-9; only true campus
        // neighbors stay grouped (and spiderfy on click).
        clusterRadius: 22,
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
            11.5, 5, 14.5, 25, 17.5, 60, 20.5, 150, 24.5,
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
          // Campus pairs (2-4) draw small, like a pin with a badge;
          // regional clusters keep the survey-marker presence.
          "circle-radius": [
            "step", ["get", "point_count"],
            9, 5, 12, 25, 15, 60, 18, 150, 22,
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
          "text-size": ["step", ["get", "point_count"], 9.5, 5, 10.5],
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
          "icon-size": PIN_SIZE as unknown as number,
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
          "icon-size": PIN_SIZE as unknown as number,
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
          "icon-size": PIN_SIZE as unknown as number,
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
          "icon-size": PIN_SIZE as unknown as number,
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
          "circle-radius": 12,
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
          "icon-size": [
            "interpolate", ["linear"], ["zoom"],
            3, 0.98, 8, 1.15, 11, 1.38,
          ] as unknown as number,
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
          "icon-size": PIN_SIZE as unknown as number,
        },
      });

      // Past the survey zooms the sheet is deliberately empty (no roads),
      // so the sites label themselves — finding becomes reading.
      map.addLayer({
        id: "site-labels",
        type: "symbol",
        source: "sites",
        minzoom: 8.5,
        filter: ["!", ["has", "point_count"]],
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["Newsreader Italic"],
          "text-size": [
            "interpolate", ["linear"], ["zoom"],
            8.5, 12,
            11, 14,
          ],
          "text-anchor": "top",
          "text-offset": [0, 1.05],
          "text-max-width": 9,
          "text-padding": 2,
        },
        paint: {
          "text-color": INK_STRONG,
          "text-halo-color": PAPER,
          "text-halo-width": 1.2,
        },
      });

      // --- interactions ---
      const tooltip = tooltipRef.current;
      const pinLayers = [
        "site-pins",
        "site-labels",
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
          // One click should end with the contents visible — never a
          // zoom ladder. Campus groups annotate in place (spiderfy);
          // regional clusters frame all their sites at once.
          source.getClusterLeaves(clusterId, 100, 0, (err, leaves) => {
            if (err || !leaves?.length) return;
            const coords = leaves.map(
              (l) => (l.geometry as GeoJSON.Point).coordinates as [number, number],
            );
            const bounds = coords.reduce(
              (b, c) => b.extend(c),
              new mapboxgl.LngLatBounds(coords[0], coords[0]),
            );
            const span = Math.max(
              bounds.getEast() - bounds.getWest(),
              bounds.getNorth() - bounds.getSouth(),
            );
            const reduced = prefersReducedMotion();
            if (span < CAMPUS_SPAN_DEG) {
              if (map.getZoom() >= 8) {
                placeSpider(leaves as GeoJSON.Feature[], center);
                return;
              }
              // Too far out for a legible fan: step in once, then fan.
              map.once("moveend", () => {
                const pt = map.project(center as mapboxgl.LngLatLike);
                const f = map.queryRenderedFeatures(
                  [[pt.x - 12, pt.y - 12], [pt.x + 12, pt.y + 12]],
                  { layers: ["clusters"] },
                )[0];
                if (f?.properties?.cluster_id != null) {
                  spiderfy(
                    f.properties.cluster_id as number,
                    (f.geometry as GeoJSON.Point).coordinates as [number, number],
                  );
                }
              });
              map.easeTo({ center, zoom: 8.6, duration: reduced ? 0 : 600 });
              return;
            }
            clearSpider();
            const wide = map.getContainer().clientWidth > 720;
            map.fitBounds(bounds, {
              padding: wide
                ? { top: 90, bottom: 90, left: 330, right: 70 }
                : { top: 80, bottom: 150, left: 36, right: 36 },
              maxZoom: 10.5,
              duration: reduced ? 0 : 700,
            });
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
      if (lockedRef.current) {
        map.scrollZoom.enable();
        map.dragPan.enable();
      }
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

  // Page-end lock: hand the gestures to the map, take them back on exit.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (locked) {
      map.scrollZoom.enable();
      map.dragPan.enable();
    } else {
      map.scrollZoom.disable();
      map.dragPan.disable();
    }
    map.getCanvas().style.cursor = locked ? "" : "default";
  }, [locked]);

  return (
    <div ref={containerRef} className="atlas-map">
      <div ref={tooltipRef} className="atlas-map__tooltip atlas-mono" />
    </div>
  );
}
