"use client";

// The chapter engine: scrolling copy column + sticky figure column (DESIGN
// §motion, CLAUDE.md §story mode). The figure shows the chapter's plate,
// diagram, or map; one camera move per beat; the stamp thunks once at the
// chapter's climax. On mobile the figure pins at reduced height and the copy
// scrolls over it as drafting cards.

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { withEmphasis } from "../../lib/emphasis";
import type { StorySite } from "../../lib/story";
import type { Beat, Chapter } from "../../types";
import type { StoryCamera } from "./StoryMap";
import DiagramFigure, { DIAGRAMS } from "./diagrams";
import PlateFigure from "./PlateFigure";
import Stamp from "./Stamp";

const StoryMap = dynamic(() => import("./StoryMap"), { ssr: false });

export interface ChapterStoryProps {
  chapter: Chapter;
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

export default function ChapterStory({ chapter, sites }: ChapterStoryProps) {
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
  const stampedRef = useRef(false);

  const beats = chapter.beats;
  const activeBeat = beats[activeIdx];
  const hasMapBeats = useMemo(() => beats.some((b) => b.kind === "map"), [beats]);

  // ---- scroll engine: active beat = last block above the 55% line ----
  useEffect(() => {
    const compute = () => {
      const section = sectionRef.current;
      if (!section) return;
      const vh = window.innerHeight;
      const rect = section.getBoundingClientRect();

      // Mount the chapter's map while nearby (tile preload), release it when
      // far away — 13 chapters of live WebGL contexts would hit browser caps.
      if (hasMapBeats) {
        if (rect.top < vh * 1.6 && rect.bottom > -vh * 1.6) {
          setMapMounted(true);
        } else if (rect.top > vh * 3.2 || rect.bottom < -vh * 3.2) {
          setMapMounted(false);
        }
      }
      // Beats only need attention while the chapter is on or near screen.
      if (rect.top > vh * 1.5 || rect.bottom < -vh * 0.5) return;

      const line = vh * 0.55;
      let idx = 0;
      beatRefs.current.forEach((el, i) => {
        if (el && el.getBoundingClientRect().top < line) idx = i;
      });
      setActiveIdx((prev) => (prev === idx ? prev : idx));

      const beat = beats[idx];
      // The stamp fires the first time its beat becomes active, then stays.
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
     
  }, [beats, hasMapBeats]);

  // ---- figure state derived from the active beat ----
  const surfaceBeat = nearestBeat(beats, activeIdx, ["plate", "diagram", "map"]);
  const showMap = surfaceBeat?.kind === "map";
  const artBeat = nearestBeat(beats, activeIdx, ["plate", "diagram"]);
  const stampIdx = beats.findIndex((b) => b.kind === "stamp");
  const stampBeat = stampIdx >= 0 ? beats[stampIdx] : undefined;
  // A mid-chapter stamp belongs to the figure it was struck on; it hides
  // when the chapter moves on to a different surface (and returns, without
  // re-thunking, if the reader scrolls back).
  const stampSurface =
    stampIdx >= 0
      ? nearestBeat(beats, stampIdx, ["plate", "diagram", "map"])
      : undefined;
  const stampVisible = stamped && surfaceBeat === stampSurface;

  const mapBeat = nearestBeat(beats, activeIdx, ["map"]);

  const camera: StoryCamera | null = useMemo(() => {
    if (!mapBeat) return null;
    const ids = mapBeat.sites ?? [];
    const coords = ids
      .map((id) => sites[id])
      .filter(Boolean)
      .map((s): [number, number] => [s.lng, s.lat]);
    const override = mapBeat.camera ?? {};
    if (coords.length === 0) {
      // Siteless map beat (the atlas handoff): fit the inhabited world, with
      // the authored zoom as the ceiling so phones still see the whole plate.
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

  // Hub-and-spokes for a supplier web; a chain for the ch. 11 journey.
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
      className="chapter chapter--story"
      id={chapter.slug}
      aria-labelledby={`ch-${chapter.id}`}
      data-chapter={chapter.id}
    >
      <header className="chapter__header chapter--story__header">
        <div className="chapter__meta">
          <span className="atlas-mono chapter__kicker">{chapter.kicker}</span>
          <span className="atlas-mono chapter__number">
            CH {String(chapter.id).padStart(2, "0")}
          </span>
        </div>
        <h2 className="chapter__title" id={`ch-${chapter.id}`}>
          {chapter.title}
        </h2>
      </header>

      <div className="story-grid">
        <div
          className={`story-grid__figure${stamping ? " is-stamping" : ""}`}
        >
          <div className="story-stage">
            {hasMapBeats && mapMounted && (
              <StoryMap
                sites={storySites}
                activeSiteIds={activeSiteIds}
                camera={camera}
                linkMode={linkMode}
                allSites={handoffReached}
              />
            )}
            {showMap && mapCaption && (
              <span className="story-stage__caption atlas-annotation">
                {mapCaption}
              </span>
            )}
            <div
              className={`story-stage__plate${!showMap ? " is-visible" : ""}`}
            >
              {artBeat?.plate &&
                (artIsDiagram ? (
                  <DiagramFigure
                    plate={artBeat.plate}
                    chapterId={chapter.id}
                    drawn={drawnDiagrams.has(artBeat.id)}
                  />
                ) : (
                  <PlateFigure plate={artBeat.plate} chapterId={chapter.id} />
                ))}
            </div>
            {stamped && stampBeat?.stamp && (
              <Stamp text={stampBeat.stamp} hidden={!stampVisible} />
            )}
          </div>
        </div>

        <div className="story-grid__copy">
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
      </div>
    </section>
  );
}
