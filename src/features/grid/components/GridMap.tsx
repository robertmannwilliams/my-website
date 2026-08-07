"use client";

// Plate I — the fleet. Phase 1 map spike: paper style (shared with the
// atlas), fuel-family pins from a clustered source, the HIFLD transmission
// layer, and the night proof (GRID-DESIGN §The night set piece). Filters,
// detail panel, and search arrive with atlas assembly; this plate is free
// exploration plus the DAY/NIGHT review toggle.

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { buildPaperStyle } from "@/features/atlas/map/paperStyle";
import {
  addGridPinImages,
  pinIconExpression,
  PIN_SIZE_EXPRESSION,
} from "../map/pins";
import { applyNightWash, NIGHT_LAMP, NIGHT_WASH_MS } from "../map/night";

const PAPER = "#F8F4E9";
const INK = "#2B4A8C";
const INK_STRONG = "#1C3263";
const INK_FAINT = "#9DACC9";

const MONO_MEDIUM = ["IBM Plex Mono Medium"];

/** Keep US/CA labels from doubling up (same convention as paperStyle). */
const WORLDVIEW = [
  "match", ["get", "worldview"], ["all", "US"], true, false,
] as const;

const CONUS_BOUNDS: [[number, number], [number, number]] = [
  [-126.5, 23.5],
  [-65.5, 50.5],
];

export default function GridMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const loadedRef = useRef(false);
  const [night, setNight] = useState(false);
  const nightRef = useRef(false);

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
      try {
        addGridPinImages(map);
      } catch (err) {
        console.error("[grid map] pin images failed", err);
        throw err;
      }

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

      // ---- Plants: clustered survey markers + fuel pins. ----
      map.addSource("plants", {
        type: "geojson",
        data: "/grid-data/plants.geo.json",
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
          "icon-image": pinIconExpression("d") as unknown as string,
          "icon-allow-overlap": true,
          "icon-padding": 0,
          "icon-size": PIN_SIZE_EXPRESSION as unknown as number,
        },
      });

      // Clusters expand on click.
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
      map.on("mouseenter", "clusters", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "clusters", () => {
        map.getCanvas().style.cursor = "";
      });

      loadedRef.current = true;
    });

    mapRef.current = map;
    return () => {
      loadedRef.current = false;
      map.remove();
      mapRef.current = null;
    };
  }, []);

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

  return (
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
    </div>
  );
}
