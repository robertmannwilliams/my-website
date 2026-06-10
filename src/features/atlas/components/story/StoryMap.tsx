"use client";

// The story-mode map: a paper plate that slides under the copy. Non-interactive;
// the scroll engine drives one camera move per beat. Active sites render at
// full ink with italic annotations, the chapter's other sites at 12%, and the
// remaining 300-odd sites are not on the sheet at all (DESIGN §map density).
//
// draw_links beats: great-circle ink lines draw on as an SVG overlay after the
// camera settles — stroke-dashoffset, staggered from the hub outward.

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { buildPaperStyle } from "../../map/paperStyle";
import { addPinImages, PIN_ICON_EXPRESSION } from "../../map/pins";
import { greatCirclePoints, type LngLat } from "../../map/geo";
import type { StorySite } from "../../lib/story";

const INK_STRONG = "#1C3263";
const PAPER = "#F8F4E9";

export type StoryCamera =
  | { kind: "point"; center: LngLat; zoom: number; pitch?: number; bearing?: number }
  | { kind: "fit"; coords: LngLat[]; maxZoom: number };

export interface StoryMapProps {
  sites: StorySite[];
  activeSiteIds: string[];
  camera: StoryCamera | null;
  /** hub: spokes from the first site. chain: legs in site order (ch. 11). */
  linkMode: "hub" | "chain" | null;
  /** Atlas handoff (ch. 12): reveal every site in the dataset. */
  allSites: boolean;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function toFeatureCollection(sites: StorySite[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: sites.map((s) => ({
      type: "Feature",
      properties: {
        id: s.id,
        name: s.name,
        status: s.status,
        monopoly: s.monopoly,
      },
      geometry: { type: "Point", coordinates: [s.lng, s.lat] },
    })),
  };
}

export default function StoryMap({
  sites,
  activeSiteIds,
  camera,
  linkMode,
  allSites,
}: StoryMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const loadedRef = useRef(false);
  const applyBeatRef = useRef<(() => void) | null>(null);

  const stateRef = useRef({ sites, activeSiteIds, camera, linkMode, allSites });
  useEffect(() => {
    stateRef.current = { sites, activeSiteIds, camera, linkMode, allSites };
  });

  // ----- init once -----
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!containerRef.current || mapRef.current) return;
    if (!token) {
      console.error("Missing NEXT_PUBLIC_MAPBOX_TOKEN");
      return;
    }
    mapboxgl.accessToken = token;

    const initial = stateRef.current.camera;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: buildPaperStyle(window.location.origin),
      center: initial?.kind === "point" ? initial.center : [8, 48],
      zoom: initial?.kind === "point" ? initial.zoom : 3,
      interactive: false,
      attributionControl: false,
      logoPosition: "bottom-left",
    });
    map.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      "bottom-right",
    );
    map.on("error", (e) => {
      console.error("[story map]", e.error?.message ?? e.error ?? e);
    });

    map.on("load", () => {
      addPinImages(map);
      map.addSource("story-sites", {
        type: "geojson",
        data: toFeatureCollection(stateRef.current.sites),
      });
      map.addLayer({
        id: "story-dim",
        type: "symbol",
        source: "story-sites",
        layout: {
          "icon-image": PIN_ICON_EXPRESSION as unknown as string,
          "icon-allow-overlap": true,
          "icon-padding": 0,
        },
        paint: { "icon-opacity": 0.12 },
      });
      map.addLayer({
        id: "story-active",
        type: "symbol",
        source: "story-sites",
        layout: {
          "icon-image": PIN_ICON_EXPRESSION as unknown as string,
          "icon-allow-overlap": true,
          "icon-padding": 0,
          "text-field": ["get", "name"],
          "text-font": ["Newsreader Italic"],
          "text-size": 11,
          "text-anchor": "top",
          "text-offset": [0, 1.05],
          "text-max-width": 9,
          "text-optional": true,
        },
        paint: {
          "text-color": INK_STRONG,
          "text-halo-color": PAPER,
          "text-halo-width": 1,
        },
      });
      loadedRef.current = true;
      applyBeat();
      map.resize();
    });

    // ----- beat application -----
    let drawTimer: ReturnType<typeof setTimeout> | null = null;

    const clearLinks = () => {
      if (drawTimer) clearTimeout(drawTimer);
      const svg = svgRef.current;
      if (svg) svg.replaceChildren();
    };

    /**
     * One ink line as SVG path data, with extra world-copy renderings when a
     * leg crosses the antimeridian (so a Taipei→Houston leg exits the right
     * edge and re-enters from the left instead of vanishing).
     */
    const legPaths = (a: StorySite, b: StorySite): string[] => {
      const pts = greatCirclePoints([a.lng, a.lat], [b.lng, b.lat]);
      const centerLng = map.getCenter().lng;
      const lngs = pts.map((p) => p[0]);
      const shifts = [0];
      if (Math.max(...lngs) > centerLng + 180) shifts.push(-360);
      if (Math.min(...lngs) < centerLng - 180) shifts.push(360);
      return shifts.map((shift) =>
        pts
          .map((p, j) => {
            const { x, y } = map.project([p[0] + shift, p[1]]);
            return `${j === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join(""),
      );
    };

    const renderLinks = (animate: boolean) => {
      const svg = svgRef.current;
      const { activeSiteIds: ids, sites: all, linkMode: mode } = stateRef.current;
      if (!svg || !mode || ids.length < 2) return;
      const byId = new Map(all.map((s) => [s.id, s]));
      svg.replaceChildren();
      const { clientWidth, clientHeight } = map.getContainer();
      svg.setAttribute("viewBox", `0 0 ${clientWidth} ${clientHeight}`);
      const reduced = prefersReducedMotion();

      // hub: every link starts at site 0. chain: consecutive legs in order.
      const legs: Array<[StorySite, StorySite]> = [];
      if (mode === "hub") {
        const hub = byId.get(ids[0]);
        if (!hub) return;
        for (const id of ids.slice(1)) {
          const spoke = byId.get(id);
          if (spoke) legs.push([hub, spoke]);
        }
      } else {
        for (let i = 0; i < ids.length - 1; i++) {
          const a = byId.get(ids[i]);
          const b = byId.get(ids[i + 1]);
          if (a && b) legs.push([a, b]);
        }
      }

      const stagger = mode === "chain" ? 170 : 300;
      const duration = mode === "chain" ? 450 : 650;
      legs.forEach(([a, b], i) => {
        for (const d of legPaths(a, b)) {
          const path = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "path",
          );
          path.setAttribute("d", d);
          path.setAttribute("class", "story-link");
          svg.appendChild(path);
          const len = path.getTotalLength();
          path.style.strokeDasharray = `${len} ${len}`;
          if (animate && !reduced) {
            path.style.strokeDashoffset = `${len}`;
            path.style.transition = `stroke-dashoffset ${duration}ms ease-out ${i * stagger}ms`;
            // Force style flush so the transition runs.
            path.getBoundingClientRect();
            path.style.strokeDashoffset = "0";
          } else if (animate && reduced) {
            path.style.opacity = "0";
            path.style.transition = `opacity 400ms ease-out ${i * 100}ms`;
            path.getBoundingClientRect();
            path.style.opacity = "1";
          }
        }
      });
    };

    let allSitesLoaded = false;
    const loadAllSites = () => {
      if (allSitesLoaded) return;
      allSitesLoaded = true;
      // Shares the lazy atlas chunk; only ch. 12 ever requests it.
      void import("../../map/sites").then(({ allSites: everySite }) => {
        const source = map.getSource("story-sites") as
          | mapboxgl.GeoJSONSource
          | undefined;
        if (!source || !stateRef.current.allSites) return;
        source.setData({
          type: "FeatureCollection",
          features: everySite.map((s) => ({
            type: "Feature",
            properties: {
              id: s.id,
              name: s.name,
              status: s.status,
              monopoly: s.chokepoint_severity === "monopoly",
            },
            geometry: { type: "Point", coordinates: [s.lng, s.lat] },
          })),
        });
        // The full constellation reads at half ink; full density and
        // interactivity belong to the atlas below.
        map.setPaintProperty("story-dim", "icon-opacity", 0.5);
      });
    };

    let applied = false;
    const applyBeat = () => {
      if (!loadedRef.current) return;
      const { activeSiteIds: ids, camera: cam } = stateRef.current;
      map.setFilter("story-active", [
        "in",
        ["get", "id"],
        ["literal", ids],
      ]);
      map.setFilter("story-dim", [
        "!",
        ["in", ["get", "id"], ["literal", ids]],
      ]);
      if (stateRef.current.allSites) loadAllSites();
      if (!cam) {
        // No camera on this beat (e.g. a stamp): leave the plate still.
        if (stateRef.current.linkMode && !map.isMoving()) renderLinks(false);
        return;
      }
      // The first application happens before the figure is revealed —
      // arrive pre-framed instead of flying (DESIGN: one move per beat).
      const reduced = prefersReducedMotion() || !applied;
      applied = true;
      const after = () => {
        if (stateRef.current.linkMode) {
          drawTimer = setTimeout(() => renderLinks(true), 120);
        }
      };
      map.stop(); // one move per beat: cancel anything in flight
      map.once("moveend", after);
      if (cam.kind === "fit") {
        const bounds = cam.coords.reduce(
          (b, c) => b.extend(c),
          new mapboxgl.LngLatBounds(cam.coords[0], cam.coords[0]),
        );
        // Padding scaled to the container so a short mobile map can't
        // produce an impossible (NaN) camera.
        const { clientWidth: w, clientHeight: h } = map.getContainer();
        map.fitBounds(bounds, {
          padding: {
            top: Math.min(60, h * 0.16),
            bottom: Math.min(80, h * 0.2),
            left: Math.min(60, w * 0.1),
            right: Math.min(60, w * 0.1),
          },
          maxZoom: cam.maxZoom,
          duration: reduced ? 0 : 1300,
        });
      } else if (reduced) {
        map.jumpTo({
          center: cam.center,
          zoom: cam.zoom,
          pitch: cam.pitch ?? 0,
          bearing: cam.bearing ?? 0,
        });
      } else {
        map.flyTo({
          center: cam.center,
          zoom: cam.zoom,
          pitch: cam.pitch ?? 0,
          bearing: cam.bearing ?? 0,
          curve: 1.4,
          speed: 0.8,
        });
      }
    };

    map.on("movestart", clearLinks);
    map.on("resize", () => {
      clearLinks();
      if (stateRef.current.linkMode && !map.isMoving()) renderLinks(false);
    });

    applyBeatRef.current = applyBeat;
    mapRef.current = map;
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __storyMap?: mapboxgl.Map }).__storyMap = map;
    }
    return () => {
      if (drawTimer) clearTimeout(drawTimer);
      applyBeatRef.current = null;
      loadedRef.current = false;
      map.remove();
      mapRef.current = null;
    };
     
  }, []);

  // Re-apply whenever the beat-derived props change.
  const cameraKey = JSON.stringify(camera);
  const activeKey = activeSiteIds.join("|");
  useEffect(() => {
    applyBeatRef.current?.();

  }, [cameraKey, activeKey, linkMode, allSites]);

  return (
    <div ref={containerRef} className="story-map" aria-hidden>
      <svg ref={svgRef} className="story-map__links" />
    </div>
  );
}
