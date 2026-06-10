"use client";

// Slim chapter rail (PLAN Phase 3): Plex Mono numbers down the left edge for
// orientation and jumping. Desktop only — mobile keeps its pixels.

import { useEffect, useState } from "react";

export interface RailChapter {
  id: number;
  slug: string;
  title: string;
}

export default function StoryRail({ chapters }: { chapters: RailChapter[] }) {
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    const ids = [...chapters.map((c) => c.slug), "atlas"];
    const compute = () => {
      const line = window.innerHeight * 0.5;
      let current = "";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top < line && rect.bottom > 0) current = id;
      }
      setActive((prev) => (prev === current ? prev : current));
    };
    compute();
    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
    };
  }, [chapters]);

  return (
    <nav className="story-rail" aria-label="Chapters">
      <ol className="story-rail__list">
        {chapters.map((c) => (
          <li key={c.id}>
            <a
              href={`#${c.slug}`}
              className={`atlas-mono story-rail__link${active === c.slug ? " is-active" : ""}`}
              title={c.title}
              aria-current={active === c.slug ? "true" : undefined}
            >
              {String(c.id).padStart(2, "0")}
            </a>
          </li>
        ))}
        <li>
          <a
            href="#atlas"
            className={`atlas-mono story-rail__link story-rail__link--atlas${active === "atlas" ? " is-active" : ""}`}
            title="The Atlas"
            aria-current={active === "atlas" ? "true" : undefined}
          >
            Atlas
          </a>
        </li>
      </ol>
    </nav>
  );
}
