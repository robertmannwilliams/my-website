"use client";

// The story's traveling map — a non-interactive sticky sheet behind the
// beat cards. Camera flies per beat (aistack grammar: slow flyTo, capped),
// only the active beat's sites are drawn (story density rule), the night
// wash enters at the beat that asks for it, and a faint journey line
// accumulates behind the reader.

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { buildPaperStyle } from "@/features/atlas/map/paperStyle";
import { addGridPinImages, pinIconExpression } from "../../map/pins";
import { applyNightWash, NIGHT_LAMP, NIGHT_WASH_MS } from "../../map/night";
import type { StoryBeat } from "../../lib/content";

const PAPER = "#F8F4E9";
const INK = "#2B4A8C";
const INK_FAINT = "#9DACC9";

const SERIF_ITALIC = ["Newsreader Italic"];
const MONO_MEDIUM = ["IBM Plex Mono Medium"];

const START_CAMERA = { center: [-96.5, 38.5] as [number, number], zoom: 3.6 };

export default function StoryMap({ beat }: { beat: StoryBeat | null }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const loadedRef = useRef(false);
  const nightRef = useRef(false);
  const trailRef = useRef<[number, number][]>([]);
  const pendingRef = useRef<StoryBeat | null>(null);

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
      center: START_CAMERA.center,
      zoom: START_CAMERA.zoom,
      interactive: false,
      attributionControl: false,
      logoPosition: "bottom-left",
    });
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
    map.on("error", (e) => {
      console.error("[story map]", e.error?.message ?? e.error ?? e);
    });

    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __storyMap?: mapboxgl.Map }).__storyMap = map;
    }

    map.on("load", () => {
      addGridPinImages(map);

      map.addSource("transmission", {
        type: "geojson",
        data: "/grid-data/transmission.json",
      });
      map.addLayer(
        {
          id: "transmission-glow",
          type: "line",
          source: "transmission",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": NIGHT_LAMP,
            "line-width": 2.6,
            "line-blur": 2.5,
            "line-opacity": 0,
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
            "line-width": 0.6,
            "line-opacity": 0.4,
          },
        },
        "marine-label",
      );

      map.addSource("regions", { type: "geojson", data: "/grid-data/regions.json" });
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
            "text-color": "#1C3263",
            "text-halo-color": PAPER,
            "text-halo-width": 1.2,
          },
        },
        "marine-label",
      );

      map.addLayer(
        {
          id: "city-lights",
          type: "circle",
          source: "streets",
          "source-layer": "place_label",
          filter: [
            "all",
            ["==", ["get", "class"], "settlement"],
            ["match", ["get", "worldview"], ["all", "US"], true, false] as unknown as boolean,
            ["<=", ["get", "symbolrank"], 11],
          ],
          paint: {
            "circle-color": NIGHT_LAMP,
            "circle-radius": ["step", ["get", "symbolrank"], 2.4, 7, 1.7, 10, 1.1],
            "circle-blur": 0.5,
            "circle-opacity": 0,
          },
        },
        "marine-label",
      );

      // Journey line: a faint dashed trail accumulating site-to-site.
      map.addSource("trail", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer(
        {
          id: "trail-line",
          type: "line",
          source: "trail",
          paint: {
            "line-color": INK,
            "line-width": 1,
            "line-dasharray": [1.5, 2.2],
            "line-opacity": 0.55,
          },
        },
        "marine-label",
      );

      // Active beat sites only (story density rule).
      map.addSource("story-sites", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "story-pins",
        type: "symbol",
        source: "story-sites",
        layout: {
          "icon-image": pinIconExpression("d") as unknown as string,
          "icon-allow-overlap": true,
          "icon-padding": 0,
          "icon-size": 1.35,
        },
      });
      map.addLayer({
        id: "story-labels",
        type: "symbol",
        source: "story-sites",
        layout: {
          "text-field": ["get", "name"],
          "text-font": SERIF_ITALIC,
          "text-size": 14,
          "text-offset": [0, 1.3],
          "text-anchor": "top",
          "text-max-width": 10,
          "text-allow-overlap": true,
        },
        paint: {
          "text-color": "#1C3263",
          "text-halo-color": PAPER,
          "text-halo-width": 1.1,
        },
      });

      loadedRef.current = true;
      if (pendingRef.current) applyBeat(map, pendingRef.current);
    });

    const applyBeat = (m: mapboxgl.Map, beat: StoryBeat) => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // Camera
      const center =
        beat.camera?.center ??
        (beat.sites[0] ? ([beat.sites[0].lng, beat.sites[0].lat] as [number, number]) : null);
      if (center) {
        const wide = window.innerWidth >= 760;
        const camera = {
          center,
          zoom: beat.camera?.zoom ?? 6.5,
          padding: wide
            ? { left: Math.min(430, Math.round(window.innerWidth * 0.42)), top: 0, right: 0, bottom: 0 }
            : { left: 0, top: 0, right: 0, bottom: Math.round(window.innerHeight * 0.4) },
        };
        if (reduced) m.jumpTo(camera);
        else m.flyTo({ ...camera, speed: 0.8, curve: 1.4, essential: true });
      }

      // Sites + trail
      const siteFeatures = beat.sites.map((s) => ({
        type: "Feature" as const,
        properties: { name: s.name, fuel: s.fuel, status: "operating", mw: 0 },
        geometry: { type: "Point" as const, coordinates: [s.lng, s.lat] },
      }));
      (m.getSource("story-sites") as mapboxgl.GeoJSONSource | undefined)?.setData({
        type: "FeatureCollection",
        features: siteFeatures,
      });
      if (beat.sites[0]) {
        const pt: [number, number] = [beat.sites[0].lng, beat.sites[0].lat];
        const trail = trailRef.current;
        const last = trail[trail.length - 1];
        if (!last || last[0] !== pt[0] || last[1] !== pt[1]) trail.push(pt);
        if (trail.length >= 2) {
          (m.getSource("trail") as mapboxgl.GeoJSONSource | undefined)?.setData({
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                properties: {},
                geometry: { type: "LineString", coordinates: trail },
              },
            ],
          });
        }
      }

      // Overlay
      for (const id of ["regions-line", "regions-label"]) {
        if (m.getLayer(id)) {
          m.setLayoutProperty(id, "visibility", beat.overlay === "regions" ? "visible" : "none");
        }
      }

      // Night
      if (beat.night !== nightRef.current) {
        nightRef.current = beat.night;
        applyNightWash(m, beat.night, reduced ? 0 : NIGHT_WASH_MS);
        window.setTimeout(() => {
          if (m.getLayer("story-pins")) {
            m.setLayoutProperty(
              "story-pins",
              "icon-image",
              pinIconExpression(beat.night ? "n" : "d") as unknown as string,
            );
          }
        }, reduced ? 0 : NIGHT_WASH_MS / 2);
      }
    };

    // Store the applier so the beat effect below can reach it.
    (map as unknown as { __applyBeat?: (b: StoryBeat) => void }).__applyBeat = (b) =>
      applyBeat(map, b);

    mapRef.current = map;
    return () => {
      loadedRef.current = false;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!beat) return;
    if (!map || !loadedRef.current) {
      pendingRef.current = beat;
      return;
    }
    (map as unknown as { __applyBeat?: (b: StoryBeat) => void }).__applyBeat?.(beat);
  }, [beat]);

  return <div ref={containerRef} className="grid-story-map-canvas" />;
}
