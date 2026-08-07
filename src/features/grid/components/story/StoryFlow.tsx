"use client";

// The story engine — beat cards scrolling over the sticky StoryMap.
// IntersectionObserver marks the beat crossing the viewport's middle band
// as active; the map answers with camera, sites, overlays, and night.
// Plain card chrome per the Phase 4.5 reskin freeze.

import { useEffect, useRef, useState } from "react";
import type { StoryBeat } from "../../lib/content";
import StoryMap from "./StoryMap";
import Diagram from "./diagrams";
import DispatchStack from "./widgets/DispatchStack";
import DuckCurve from "./widgets/DuckCurve";
import Hold60 from "./widgets/Hold60";

const WIDGETS = {
  "dispatch-stack": DispatchStack,
  "duck-curve": DuckCurve,
  "hold-60": Hold60,
} as const;

export default function StoryFlow({ beats }: { beats: StoryBeat[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const cards = sectionRef.current?.querySelectorAll("[data-beat]");
    if (!cards?.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId((entry.target as HTMLElement).dataset.beat ?? null);
          }
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    cards.forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, [beats]);

  const activeBeat = beats.find((b) => b.id === activeId) ?? null;

  return (
    <section ref={sectionRef} className="grid-story" aria-label="Act 2 — one day on the grid">
      <div className="grid-story-map">
        <StoryMap beat={activeBeat} />
      </div>
      <div className="grid-story-beats">
        {beats.map((beat) => {
          const Widget = beat.widget ? WIDGETS[beat.widget] : null;
          return (
            <article
              key={beat.id}
              data-beat={beat.id}
              className="grid-story-beat"
              data-kind={beat.kind}
            >
              <div className="grid-story-card">
                <p>{beat.copy}</p>
                {Widget && <Widget />}
                {beat.kind === "diagram" && beat.diagram && (
                  <Diagram name={beat.diagram} />
                )}
                {beat.kind === "live" && (
                  <div className="grid-widget grid-live-placeholder">
                    <p className="grid-widget-note">
                      LIVE PANEL — arrives with the EIA data hookup (Phase 4).
                      This sheet will show national demand and the fuel mix,
                      this hour, as you read.
                    </p>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
