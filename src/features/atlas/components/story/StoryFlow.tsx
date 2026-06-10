"use client";

// The story engine: one continuous flow of beats beside one persistent map.
// No chapter chrome — transitions live in the prose. The camera travels from
// site to site as the reader scrolls, and a faint ink line accumulates behind
// it (the journey so far). Plates and diagrams slide over the map; the single
// stamp thunks at the ASML climax. On mobile the figure pins at reduced
// height and the copy scrolls over it as drafting cards.

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { withEmphasis } from "../../lib/emphasis";
import type { StorySite } from "../../lib/story";
import type { Beat } from "../../types";
import type { StoryCamera } from "./StoryMap";
import DiagramFigure, { DIAGRAMS } from "./diagrams";
import PlateFigure from "./PlateFigure";
import Stamp from "./Stamp";

const StoryMap = dynamic(() => import("./StoryMap"), { ssr: false });

export interface StoryFlowProps {
  beats: Beat[];
  sites: Record<string, StorySite>;
}

/** Last beat at or before `idx` matching `kinds`, else first match overall. */
function nearestBeat(
  beats: Beat[],
  idx: number,
  kinds: Beat["kind"][],
): Beat | undefined {
  for (let i = idx; i >= 0; i--) {
    if (kinds.includes(beats[i].kind)) return beats[i];
  }
  return beats.find((b) => kinds.includes(b.kind));
}

export default function StoryFlow({ beats, sites }: StoryFlowProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const beatRefs = useRef<(HTMLElement | null)[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [mapMounted, setMapMounted] = useState(false);
  const [stamped, setStamped] = useState(false);
  const [stamping, setStamping] = useState(false);
  const [drawnDiagrams, setDrawnDiagrams] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [handoffReached, setHandoffReached] = useState(false);
  const [progress, setProgress] = useState(0);
  const stampedRef = useRef(false);

  const activeBeat = beats[activeIdx];

  // ---- scroll engine ----
  useEffect(() => {
    const compute = () => {
      const section = sectionRef.current;
      if (!section) return;
      const vh = window.innerHeight;
      const rect = section.getBoundingClientRect();

      // One persistent map for the whole story. Mount on first engagement
      // (any scroll) rather than at load — the landing screen is masthead
      // text and shouldn't pay for mapbox in its first paint.
      if (window.scrollY > 24 && rect.top < vh * 1.5 && rect.bottom > -vh) {
        setMapMounted(true);
      }

      // Reading progress for the thread (0..1, quantized so scroll ticks
      // with no visible change skip the re-render).
      const total = rect.height - vh;
      const p = Math.min(1, Math.max(0, total > 0 ? -rect.top / total : 0));
      const q = Math.round(p * 200) / 200;
      setProgress((prev) => (prev === q ? prev : q));

      if (rect.top > vh * 1.5 || rect.bottom < -vh * 0.5) return;

      const line = vh * 0.55;
      let idx = 0;
      beatRefs.current.forEach((el, i) => {
        if (el && el.getBoundingClientRect().top < line) idx = i;
      });
      setActiveIdx((prev) => (prev === idx ? prev : idx));

      const beat = beats[idx];
      // The single stamp fires once and stays fired.
      if (beat?.kind === "stamp" && !stampedRef.current) {
        stampedRef.current = true;
        setStamped(true);
        setStamping(true);
        setTimeout(() => setStamping(false), 320);
      }
      // Diagrams ink themselves in once and stay drawn.
      if (beat?.kind === "diagram" && beat.plate && DIAGRAMS[beat.plate]) {
        setDrawnDiagrams((prev) =>
          prev.has(beat.id) ? prev : new Set(prev).add(beat.id),
        );
      }
      // The atlas handoff keeps the full constellation once revealed.
      if (beat?.atlasHandoff) setHandoffReached(true);
    };
    compute();
    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
    };
     
  }, [beats]);

  // ---- figure state derived from the active beat ----
  const surfaceBeat = nearestBeat(beats, activeIdx, ["plate", "diagram", "map"]);
  const showMap = surfaceBeat?.kind === "map";
  const artBeat = nearestBeat(beats, activeIdx, ["plate", "diagram"]);
  const stampIdx = beats.findIndex((b) => b.kind === "stamp");
  const stampBeat = stampIdx >= 0 ? beats[stampIdx] : undefined;
  const stampSurface =
    stampIdx >= 0
      ? nearestBeat(beats, stampIdx, ["plate", "diagram", "map"])
      : undefined;
  const stampVisible = stamped && surfaceBeat === stampSurface;

  const mapBeat = nearestBeat(beats, activeIdx, ["map"]);

  // Figure numbers run sequentially through the piece now that chapters are
  // gone (Fig. 1, Fig. 2, … in order of appearance).
  const figNumbers = useMemo(() => {
    const numbers = new Map<string, number>();
    let n = 0;
    for (const b of beats) {
      if (b.kind === "plate" || b.kind === "diagram") numbers.set(b.id, ++n);
    }
    return numbers;
  }, [beats]);

  // The journey: each map beat's primary site, deduped consecutively. The
  // breadcrumb shown is the prefix up to the current map beat.
  const journeyStops = useMemo(() => {
    const stops: { beatId: string; site: StorySite }[] = [];
    for (const b of beats) {
      if (b.kind !== "map") continue;
      const site = b.sites?.[0] ? sites[b.sites[0]] : undefined;
      if (!site) continue;
      if (stops[stops.length - 1]?.site.id !== site.id) {
        stops.push({ beatId: b.id, site });
      }
    }
    return stops;
  }, [beats, sites]);

  const journey = useMemo((): [number, number][] => {
    if (!mapBeat) return [];
    // Index of the last stop at or before the current map beat.
    let cut = -1;
    for (let i = 0; i < journeyStops.length; i++) {
      const stopBeatIdx = beats.findIndex((b) => b.id === journeyStops[i].beatId);
      const mapBeatIdx = beats.findIndex((b) => b.id === mapBeat.id);
      if (stopBeatIdx <= mapBeatIdx) cut = i;
    }
    return journeyStops
      .slice(0, cut + 1)
      .map(({ site }) => [site.lng, site.lat]);
  }, [mapBeat, journeyStops, beats]);

  const camera: StoryCamera | null = useMemo(() => {
    if (!mapBeat) return null;
    const ids = mapBeat.sites ?? [];
    const coords = ids
      .map((id) => sites[id])
      .filter(Boolean)
      .map((s): [number, number] => [s.lng, s.lat]);
    const override = mapBeat.camera ?? {};
    if (coords.length === 0) {
      // Siteless map beat (the atlas handoff): fit the inhabited world.
      return {
        kind: "fit",
        coords: [
          [-124, 52],
          [145, -36],
        ],
        maxZoom: override.zoom ?? 1.6,
      };
    }
    if (coords.length > 1) {
      return { kind: "fit", coords, maxZoom: override.zoom ?? 7 };
    }
    return {
      kind: "point",
      center: override.center ?? coords[0],
      zoom: override.zoom ?? 5.5,
      pitch: override.pitch,
      bearing: override.bearing,
    };
  }, [mapBeat, sites]);

  const activeSiteIds = useMemo(() => {
    if (activeBeat.kind === "map") return activeBeat.sites ?? [];
    if (activeBeat.kind === "stamp") return mapBeat?.sites ?? [];
    return [];
  }, [activeBeat, mapBeat]);

  const linkMode: "hub" | "chain" | null =
    (activeBeat.kind === "map" && activeBeat.drawLinks) ||
    (activeBeat.kind === "stamp" && mapBeat?.drawLinks)
      ? (mapBeat?.sites?.length ?? 0) > 5
        ? "chain"
        : "hub"
      : null;

  const mapCaption = useMemo(() => {
    if (!mapBeat) return null;
    if (mapBeat.atlasHandoff) {
      return "The full atlas — every site, handed to you.";
    }
    const list = (mapBeat.sites ?? []).map((id) => sites[id]).filter(Boolean);
    if (list.length === 0) return null;
    if (mapBeat.drawLinks && list.length > 5) {
      const first = list[0].city ?? list[0].name;
      const last = list[list.length - 1].city ?? list[list.length - 1].name;
      return `${first} → … → ${last} — ${list.length} stops.`;
    }
    if (mapBeat.drawLinks) {
      const places = list.map((s) => s.city ?? s.name);
      return `${places.join(" · ")} — single points of failure.`;
    }
    if (list.length > 1) {
      const place = [list[0].city, list[0].country].filter(Boolean).join(", ");
      return `${place} +${list.length - 1} more.`;
    }
    return [list[0].city, list[0].country].filter(Boolean).join(", ") + ".";
  }, [mapBeat, sites]);

  const storySites = useMemo(() => Object.values(sites), [sites]);

  const artIsDiagram =
    artBeat?.kind === "diagram" && !!artBeat.plate && !!DIAGRAMS[artBeat.plate];

  return (
    <section
      ref={sectionRef}
      className="story-flow"
      id="story"
      aria-label="The story"
    >
      <div className="story-thread" aria-hidden>
        <span
          className="story-thread__fill"
          style={{ transform: `scaleY(${progress})` }}
        />
        <a href="#atlas" className="atlas-mono story-thread__atlas" aria-hidden={false}>
          Atlas
        </a>
      </div>

      {/* The table: one full-bleed sticky stage under everything. The map is
          the spine — recessed while plates and copy carry the beat, forward
          when geography is the argument. */}
      <div
        className={`story-table${showMap ? " is-forward" : ""}${stamping ? " is-stamping" : ""}`}
      >
        {mapMounted && (
          <StoryMap
            sites={storySites}
            activeSiteIds={activeSiteIds}
            camera={camera}
            linkMode={linkMode}
            allSites={handoffReached}
            journey={journey}
            recessed={!showMap}
          />
        )}
        <div className="story-table__scrim" aria-hidden />
        {showMap && mapCaption && (
          <span className="story-stage__caption atlas-annotation">
            {mapCaption}
          </span>
        )}
        {artBeat?.plate && (
          <div
            className={`story-inset${showMap ? " story-inset--small" : " story-inset--large"}`}
          >
            {artIsDiagram ? (
              <DiagramFigure
                plate={artBeat.plate}
                figNo={figNumbers.get(artBeat.id) ?? 0}
                drawn={drawnDiagrams.has(artBeat.id)}
              />
            ) : (
              <PlateFigure
                plate={artBeat.plate}
                figNo={figNumbers.get(artBeat.id) ?? 0}
              />
            )}
          </div>
        )}
        {stamped && stampBeat?.stamp && (
          <Stamp text={stampBeat.stamp} hidden={!stampVisible} />
        )}
      </div>

      <div className="story-copy">
        {beats.map((beat, i) => (
          <article
            key={beat.id}
            ref={(el) => {
              beatRefs.current[i] = el;
            }}
            className={`story-beat${i === activeIdx ? " is-active" : ""}`}
          >
            {beat.copy.map((paragraph, j) => (
              <p key={j}>{withEmphasis(paragraph)}</p>
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}
