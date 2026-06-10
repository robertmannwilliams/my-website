"use client";

// The chapter engine: scrolling copy column + sticky figure column (DESIGN
// §motion, CLAUDE.md §story mode). The figure shows the chapter's plate or
// its map; one camera move per beat; the stamp thunks once at the chapter's
// climax. On mobile the figure pins at reduced height and the copy scrolls
// over it as drafting cards.

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { withEmphasis } from "../../lib/emphasis";
import type { StorySite } from "../../lib/story";
import type { Beat, Chapter } from "../../types";
import type { StoryCamera } from "./StoryMap";
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
  const stampedRef = useRef(false);

  const beats = chapter.beats;
  const activeBeat = beats[activeIdx];

  // ---- scroll engine: active beat = last block above the 55% line ----
  useEffect(() => {
    const compute = () => {
      const line = window.innerHeight * 0.55;
      let idx = 0;
      beatRefs.current.forEach((el, i) => {
        if (el && el.getBoundingClientRect().top < line) idx = i;
      });
      setActiveIdx((prev) => (prev === idx ? prev : idx));

      // The stamp fires the first time its beat becomes active, then stays.
      if (beats[idx]?.kind === "stamp" && !stampedRef.current) {
        stampedRef.current = true;
        setStamped(true);
        setStamping(true);
        setTimeout(() => setStamping(false), 320);
      }

      // Mount the map once the chapter is approaching (tile preload).
      const section = sectionRef.current;
      if (section) {
        const rect = section.getBoundingClientRect();
        if (rect.top < window.innerHeight + 1600 && rect.bottom > -1600) {
          setMapMounted(true);
        }
      }
    };
    if (process.env.NODE_ENV !== "production") {
       
      setMapMounted(true);
    }
    compute();
    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beats.length]);

  // ---- figure state derived from the active beat ----
  const showPlate =
    activeBeat.kind === "plate" || activeBeat.kind === "diagram";
  const plateBeat = nearestBeat(beats, activeIdx, ["plate", "diagram"]);
  const mapBeat = nearestBeat(beats, activeIdx, ["map"]);
  const stampBeat = beats.find((b) => b.kind === "stamp");

  const camera: StoryCamera | null = useMemo(() => {
    if (!mapBeat) return null;
    const ids = mapBeat.sites ?? [];
    const coords = ids
      .map((id) => sites[id])
      .filter(Boolean)
      .map((s): [number, number] => [s.lng, s.lat]);
    if (coords.length === 0) return null;
    const override = mapBeat.camera ?? {};
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

  const drawLinks =
    (activeBeat.kind === "map" && !!activeBeat.drawLinks) ||
    (activeBeat.kind === "stamp" && !!mapBeat?.drawLinks);

  const mapCaption = useMemo(() => {
    if (!mapBeat) return null;
    const list = (mapBeat.sites ?? []).map((id) => sites[id]).filter(Boolean);
    if (list.length === 0) return null;
    if (mapBeat.drawLinks) {
      const places = list.map((s) => s.city ?? s.name);
      return `${places.join(" · ")} — single points of failure.`;
    }
    const s = list[0];
    return [s.city, s.country].filter(Boolean).join(", ") + ".";
  }, [mapBeat, sites]);

  const storySites = useMemo(() => Object.values(sites), [sites]);

  return (
    <section
      ref={sectionRef}
      className="chapter chapter--story"
      id={chapter.slug}
      aria-labelledby={`ch-${chapter.id}`}
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
            {mapMounted && (
              <StoryMap
                sites={storySites}
                activeSiteIds={activeSiteIds}
                camera={camera}
                drawLinks={drawLinks}
              />
            )}
            {!showPlate && mapCaption && (
              <span className="story-stage__caption atlas-annotation">
                {mapCaption}
              </span>
            )}
            <div
              className={`story-stage__plate${showPlate ? " is-visible" : ""}`}
            >
              {plateBeat?.plate && (
                <PlateFigure plate={plateBeat.plate} chapterId={chapter.id} />
              )}
            </div>
            {stamped && stampBeat?.stamp && <Stamp text={stampBeat.stamp} />}
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
