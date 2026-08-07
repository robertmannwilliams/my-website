"use client";

// Plate I — the fleet, now with the atlas controls (GRID-PLAN Phase 1).
// Owns the mapbox instance, the filter/layer state, and the detail card.
// Styling is deliberately plain scaffolding: the visual language is
// provisional (GRID-DESIGN banner) — structure now, skin in Phase 4.5.

import { useCallback, useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { buildPaperStyle } from "@/features/atlas/map/paperStyle";
import {
  addGridPinImages,
  pinIconExpression,
  PIN_SIZE_EXPRESSION,
} from "../map/pins";
import { applyNightWash, NIGHT_LAMP, NIGHT_WASH_MS } from "../map/night";
import type { AtlasFilters, LayerVisibility, PlantProps } from "../types";
import AtlasControls from "./AtlasControls";
import DetailCard from "./DetailCard";

const PAPER = "#F8F4E9";
const INK = "#2B4A8C";
const INK_STRONG = "#1C3263";
const INK_FAINT = "#9DACC9";
const TEAL = "#4E7E74";
const OCHRE = "#C99A3C";

const SERIF = ["Newsreader Regular"];
const MONO_MEDIUM = ["IBM Plex Mono Medium"];

/** Keep US/CA labels from doubling up (same convention as paperStyle). */
const WORLDVIEW = [
  "match", ["get", "worldview"], ["all", "US"], true, false,
] as const;

const CONUS_BOUNDS: [[number, number], [number, number]] = [
  [-126.5, 23.5],
  [-65.5, 50.5],
];

const DEFAULT_FILTERS: AtlasFilters = {
  fuels: new Set(),
  status: "all",
  band: "all",
  era: "all",
  region: "all",
};

const DEFAULT_VIS: LayerVisibility = {
  wires: true,
  regions: false,
  regulation: false,
};

function matchesFilters(p: PlantProps, f: AtlasFilters): boolean {
  if (f.fuels.size > 0 && !f.fuels.has(p.fuel)) return false;
  if (f.status !== "all" && p.status !== f.status) return false;
  if (f.band !== "all") {
    const band = p.mw < 250 ? "s" : p.mw <= 1000 ? "m" : "l";
    if (band !== f.band) return false;
  }
  if (f.era !== "all") {
    if (p.yr == null) return false;
    const era =
      p.yr < 1970 ? "pre1970" : p.yr < 2000 ? "1970s" : p.yr < 2015 ? "2000s" : "recent";
    if (era !== f.era) return false;
  }
  if (f.region !== "all" && p.iso !== f.region) return false;
  return true;
}

export default function GridMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const loadedRef = useRef(false);
  const dataRef = useRef<GeoJSON.FeatureCollection | null>(null);
  const [night, setNight] = useState(false);
  const nightRef = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const [filters, setFilters] = useState<AtlasFilters>(DEFAULT_FILTERS);
  const [vis, setVis] = useState<LayerVisibility>(DEFAULT_VIS);
  const [detail, setDetail] = useState<PlantProps | null>(null);
  const [shownCount, setShownCount] = useState<number | null>(null);
  const [plantIndex, setPlantIndex] = useState<PlantProps[]>([]);

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
      bounds: CONUS_BOUNDS,
      fitBoundsOptions: { padding: 24 },
      minZoom: 3,
      maxZoom: 11, // coordinate precision cap per GRID-DESIGN never-list
      attributionControl: false,
      logoPosition: "bottom-left",
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      cooperativeGestures: true,
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
    map.on("error", (e) => {
      console.error("[grid map]", e.error?.message ?? e.error ?? e);
    });

    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __gridMap?: mapboxgl.Map }).__gridMap = map;
    }

    map.on("load", () => {
      addGridPinImages(map);

      // ---- Regulatory wash: retail-choice status by state (toggle). ----
      map.addSource("regulatory", {
        type: "geojson",
        data: "/grid-data/regulatory.json",
      });
      map.addLayer(
        {
          id: "regulatory-fill",
          type: "fill",
          source: "regulatory",
          layout: { visibility: "none" },
          paint: {
            "fill-color": [
              "match", ["get", "status"],
              "choice", TEAL,
              "limited", OCHRE,
              "rgba(0,0,0,0)",
            ],
            "fill-opacity": [
              "match", ["get", "status"],
              "choice", 0.18,
              "limited", 0.14,
              0,
            ],
          },
        },
        "marine-label",
      );

      // ---- Transmission (HIFLD >=220 kV): glow underlay sleeps by day. ----
      map.addSource("transmission", {
        type: "geojson",
        data: "/grid-data/transmission.json",
      });
      const ehvWidth = (thin: number, thick: number) =>
        ["case", [">=", ["coalesce", ["get", "VOLTAGE"], 0], 500], thick, thin];
      map.addLayer(
        {
          id: "transmission-glow",
          type: "line",
          source: "transmission",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": NIGHT_LAMP,
            "line-width": ehvWidth(2.4, 3.6) as never,
            "line-blur": 2.5,
            "line-opacity": 0, // night only — the one licensed glow
          },
        },
        "marine-label",
      );
      map.addLayer(
        {
          id: "transmission-line",
          type: "line",
          source: "transmission",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": INK_FAINT,
            "line-width": ehvWidth(0.6, 1.0) as never,
            "line-opacity": 0.55,
          },
        },
        "marine-label",
      );

      // ---- ISO/RTO footprints: dashed survey boundaries + labels (toggle). ----
      map.addSource("regions", {
        type: "geojson",
        data: "/grid-data/regions.json",
      });
      map.addLayer(
        {
          id: "regions-line",
          type: "line",
          source: "regions",
          layout: { visibility: "none" },
          paint: {
            "line-color": INK,
            "line-width": 1.2,
            "line-dasharray": [3, 2],
            "line-opacity": 0.75,
          },
        },
        "marine-label",
      );
      map.addLayer(
        {
          id: "regions-label",
          type: "symbol",
          source: "regions",
          layout: {
            visibility: "none",
            "text-field": ["get", "LABEL"],
            "text-font": MONO_MEDIUM,
            "text-size": ["interpolate", ["linear"], ["zoom"], 3, 11, 7, 15],
            "text-letter-spacing": 0.12,
          },
          paint: {
            "text-color": INK_STRONG,
            "text-halo-color": PAPER,
            "text-halo-width": 1.2,
          },
        },
        "marine-label",
      );

      // ---- City lights: settlement points as lamp stipple, night only. ----
      map.addLayer(
        {
          id: "city-lights",
          type: "circle",
          source: "streets",
          "source-layer": "place_label",
          filter: [
            "all",
            ["==", ["get", "class"], "settlement"],
            WORLDVIEW as unknown as boolean,
            ["<=", ["get", "symbolrank"], 11],
          ],
          paint: {
            "circle-color": NIGHT_LAMP,
            "circle-radius": [
              "step", ["get", "symbolrank"],
              2.4, 7, 1.7, 10, 1.1,
            ],
            "circle-blur": 0.5,
            "circle-opacity": 0,
          },
        },
        "marine-label",
      );

      // ---- Plants: fetched raw so filters can re-feed the source. ----
      fetch("/grid-data/plants.geo.json")
        .then((r) => {
          if (!r.ok) throw new Error(`plants.geo.json ${r.status}`);
          return r.json();
        })
        .then((fc: GeoJSON.FeatureCollection) => {
          if (!map.getStyle()) return; // unmounted
          dataRef.current = fc;
          map.addSource("plants", {
            type: "geojson",
            data: fc,
            cluster: true,
            clusterMaxZoom: 10,
            clusterRadius: 22,
          });
          map.addLayer({
            id: "clusters-outer",
            type: "circle",
            source: "plants",
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
            source: "plants",
            filter: ["has", "point_count"],
            paint: {
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
            source: "plants",
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
            id: "plant-pins",
            type: "symbol",
            source: "plants",
            filter: ["!", ["has", "point_count"]],
            layout: {
              "icon-image": pinIconExpression(
                nightRef.current ? "n" : "d",
              ) as unknown as string,
              "icon-allow-overlap": true,
              "icon-padding": 0,
              "icon-size": PIN_SIZE_EXPRESSION as unknown as number,
            },
          });
          map.addLayer({
            id: "plant-labels",
            type: "symbol",
            source: "plants",
            minzoom: 8.5,
            filter: ["!", ["has", "point_count"]],
            layout: {
              "text-field": ["get", "name"],
              "text-font": SERIF,
              "text-size": ["interpolate", ["linear"], ["zoom"], 8.5, 10.5, 11, 13],
              "text-offset": [0, 1.1],
              "text-anchor": "top",
              "text-max-width": 9,
            },
            paint: {
              "text-color": INK,
              "text-halo-color": PAPER,
              "text-halo-width": 1,
            },
          });

          map.on("click", "clusters", (e) => {
            const f = map.queryRenderedFeatures(e.point, { layers: ["clusters"] })[0];
            if (!f?.properties?.cluster_id) return;
            const source = map.getSource("plants") as mapboxgl.GeoJSONSource;
            source.getClusterExpansionZoom(
              f.properties.cluster_id as number,
              (err, zoom) => {
                if (err || zoom == null) return;
                map.easeTo({
                  center: (f.geometry as GeoJSON.Point).coordinates as [number, number],
                  zoom: Math.min(zoom, 11),
                });
              },
            );
          });
          map.on("click", "plant-pins", (e) => {
            const f = e.features?.[0];
            if (f) setDetail(f.properties as unknown as PlantProps);
          });
          for (const layer of ["clusters", "plant-pins"]) {
            map.on("mouseenter", layer, () => {
              map.getCanvas().style.cursor = "pointer";
            });
            map.on("mouseleave", layer, () => {
              map.getCanvas().style.cursor = "";
            });
          }

          setPlantIndex(
            fc.features.map((f) => f.properties as unknown as PlantProps),
          );
          setShownCount(fc.features.length);
          loadedRef.current = true;
          setLoaded(true);
        })
        .catch((err) => console.error("[grid map] plants fetch", err));
    });

    mapRef.current = map;
    return () => {
      loadedRef.current = false;
      setLoaded(false);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Filters → re-feed the clustered source (clusters recount on setData).
  useEffect(() => {
    const map = mapRef.current;
    const fc = dataRef.current;
    if (!map || !loaded || !fc) return;
    const source = map.getSource("plants") as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;
    const features = fc.features.filter((f) =>
      matchesFilters(f.properties as unknown as PlantProps, filters),
    );
    source.setData({ type: "FeatureCollection", features });
    setShownCount(features.length);
  }, [filters, loaded]);

  // Layer toggles.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    const set = (id: string, on: boolean) => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, "visibility", on ? "visible" : "none");
      }
    };
    set("transmission-line", vis.wires);
    set("transmission-glow", vis.wires);
    set("regions-line", vis.regions);
    set("regions-label", vis.regions);
    set("regulatory-fill", vis.regulation);
  }, [vis, loaded]);

  const toggleNight = () => {
    const map = mapRef.current;
    // Guard on our own load flag — NOT map.isStyleLoaded(), which flickers
    // false whenever tiles or transitions are pending and would make the
    // toggle drop clicks.
    if (!map || !loadedRef.current) return;
    const next = !nightRef.current;
    nightRef.current = next;
    setNight(next);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduced ? 0 : NIGHT_WASH_MS;
    applyNightWash(map, next, duration);
    // Pin icons are layout properties (no transition): swap mid-wash so the
    // crossfade covers the cut.
    window.setTimeout(() => {
      if (map.getLayer("plant-pins")) {
        map.setLayoutProperty(
          "plant-pins",
          "icon-image",
          pinIconExpression(next ? "n" : "d") as unknown as string,
        );
      }
    }, duration / 2);
  };

  const onPickPlant = useCallback((p: PlantProps) => {
    const map = mapRef.current;
    setDetail(p);
    if (!map || !dataRef.current) return;
    const feature = dataRef.current.features.find(
      (f) => (f.properties as unknown as PlantProps).id === p.id,
    );
    if (feature) {
      map.easeTo({
        center: (feature.geometry as GeoJSON.Point).coordinates as [number, number],
        zoom: Math.max(map.getZoom(), 8),
      });
    }
  }, []);

  return (
    <div>
      <AtlasControls
        filters={filters}
        onFilters={setFilters}
        vis={vis}
        onVis={setVis}
        plantIndex={plantIndex}
        onPickPlant={onPickPlant}
        shownCount={shownCount}
        disabled={!loaded}
      />
      <div className="grid-plate" data-mode={night ? "night" : "day"}>
        <div ref={containerRef} className="grid-plate-map" />
        <button
          type="button"
          className="grid-plate-toggle"
          onClick={toggleNight}
          aria-pressed={night}
        >
          {night ? "DAY" : "NIGHT"}
        </button>
        {detail && <DetailCard plant={detail} onClose={() => setDetail(null)} />}
      </div>
    </div>
  );
}
