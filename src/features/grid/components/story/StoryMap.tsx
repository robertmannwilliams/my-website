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
  const uriTimersRef = useRef<number[]>([]);

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

      // Regulatory wash (beat 3.7).
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
              "choice", "#4E7E74",
              "limited", "#C99A3C",
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

      // The three interconnections (beats 1.9, 3.1, 3.3).
      map.addSource("interconnections", {
        type: "geojson",
        data: "/grid-data/interconnections.json",
      });
      map.addLayer(
        {
          id: "intercon-line",
          type: "line",
          source: "interconnections",
          layout: { visibility: "none" },
          paint: {
            "line-color": INK,
            "line-width": 1.6,
            "line-dasharray": [4, 2, 1, 2],
            "line-opacity": 0.8,
          },
        },
        "marine-label",
      );
      map.addLayer(
        {
          id: "intercon-label",
          type: "symbol",
          source: "interconnections",
          layout: {
            visibility: "none",
            "text-field": ["get", "LABEL"],
            "text-font": MONO_MEDIUM,
            "text-size": ["interpolate", ["linear"], ["zoom"], 3, 12, 6, 16],
            "text-letter-spacing": 0.18,
          },
          paint: {
            "text-color": "#1C3263",
            "text-halo-color": PAPER,
            "text-halo-width": 1.2,
          },
        },
        "marine-label",
      );

      // The doors: DC ties (points) + Hydro-Québec arcs (beats 3.3, 3.4).
      map.addSource("ties", { type: "geojson", data: "/grid-data/ties.json" });
      map.addLayer(
        {
          id: "hq-arc",
          type: "line",
          source: "ties",
          filter: ["==", ["get", "kind"], "arc"],
          layout: { visibility: "none", "line-cap": "round" },
          paint: {
            "line-color": INK,
            "line-width": 1.6,
            "line-dasharray": [2.4, 2],
            "line-opacity": 0.85,
          },
        },
        "marine-label",
      );
      map.addLayer({
        id: "ties-pt",
        type: "circle",
        source: "ties",
        filter: ["==", ["get", "kind"], "tie"],
        layout: { visibility: "none" },
        paint: {
          "circle-radius": 4.5,
          "circle-color": PAPER,
          "circle-stroke-color": INK,
          "circle-stroke-width": 1.5,
        },
      });
      map.addLayer({
        id: "ties-label",
        type: "symbol",
        source: "ties",
        filter: ["==", ["get", "kind"], "tie"],
        layout: {
          visibility: "none",
          "text-field": ["get", "name"],
          "text-font": MONO_MEDIUM,
          "text-size": 10,
          "text-offset": [0, 1],
          "text-anchor": "top",
          "text-allow-overlap": true,
        },
        paint: {
          "text-color": "#1C3263",
          "text-halo-color": PAPER,
          "text-halo-width": 1,
        },
      });

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

      // Overlays: exactly the requested sets on, everything else off.
      const OVERLAY_LAYERS: Record<string, string[]> = {
        regions: ["regions-line", "regions-label"],
        regulation: ["regulatory-fill"],
        interconnections: ["intercon-line", "intercon-label"],
        ties: ["ties-pt", "ties-label"],
        quebec: ["hq-arc"],
      };
      for (const [key, ids] of Object.entries(OVERLAY_LAYERS)) {
        const on = (beat.overlays as string[]).includes(key);
        for (const id of ids) {
          if (m.getLayer(id)) {
            m.setLayoutProperty(id, "visibility", on ? "visible" : "none");
          }
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

      // Uri (beat 3.5): the one gavel strike — the glow flickers and dies.
      // Reduced motion: no flicker, the region simply renders dark.
      for (const t of uriTimersRef.current) window.clearTimeout(t);
      uriTimersRef.current = [];
      const setGlow = (v: number) => {
        if (m.getLayer("city-lights")) {
          m.setPaintProperty("city-lights", "circle-opacity-transition", { duration: 90, delay: 0 } as never);
          m.setPaintProperty("city-lights", "circle-opacity", v);
        }
        if (m.getLayer("transmission-glow")) {
          m.setPaintProperty("transmission-glow", "line-opacity-transition", { duration: 90, delay: 0 } as never);
          m.setPaintProperty("transmission-glow", "line-opacity", v);
        }
      };
      if (beat.uri) {
        if (reduced) {
          setGlow(0);
        } else {
          const dips: Array<[number, number]> = [
            [900, 0.12], [1150, 0.4], [1500, 0.08], [1800, 0.26], [2200, 0],
          ];
          for (const [delay, v] of dips) {
            uriTimersRef.current.push(window.setTimeout(() => setGlow(v), delay));
          }
        }
      } else if (beat.night) {
        // Back on a normal night beat (e.g. scrolling up from 3.5):
        // restore the night baselines the wash would have set.
        setGlow(0.4);
        if (m.getLayer("city-lights")) {
          m.setPaintProperty("city-lights", "circle-opacity", 0.45);
        }
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
