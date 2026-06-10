// Server component: renders one chapter as styled text (Phase 0 scaffold).
// Plate, map, diagram, and stamp beats show quiet drafting-style placeholders;
// the real figures arrive in Phases 1–4.

import { getSiteIndex } from "../lib/content";
import { withEmphasis } from "../lib/emphasis";
import type { Beat, Chapter } from "../types";

export function ChapterSection({ chapter }: { chapter: Chapter }) {
  return (
    <section className="chapter" id={chapter.slug} aria-labelledby={`ch-${chapter.id}`}>
      <header className="chapter__header">
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
      {chapter.beats.map((beat) => (
        <BeatBlock beat={beat} chapterId={chapter.id} key={beat.id} />
      ))}
    </section>
  );
}

function BeatBlock({ beat, chapterId }: { beat: Beat; chapterId: number }) {
  return (
    <article className="beat">
      <span className="beat__marker" aria-hidden>
        {beat.id} · {beat.kind}
      </span>
      {beat.copy.map((paragraph, i) => (
        <p key={i}>{withEmphasis(paragraph)}</p>
      ))}
      <BeatFigure beat={beat} chapterId={chapterId} />
    </article>
  );
}

function BeatFigure({ beat, chapterId }: { beat: Beat; chapterId: number }) {
  switch (beat.kind) {
    case "plate":
    case "diagram":
      return (
        <figure className="beat-figure">
          <span className="atlas-mono beat-figure__tag">
            {beat.kind} · {beat.plate}
          </span>
          <figcaption className="atlas-annotation">
            Fig. {chapterId} — {beat.plate?.replace(/-/g, " ")}{" "}
            ({beat.kind === "plate" ? "plate" : "drawn diagram"} forthcoming)
          </figcaption>
        </figure>
      );
    case "map":
      return (
        <figure className="beat-figure">
          <span className="atlas-mono beat-figure__tag">map</span>
          <span className="beat-figure__note atlas-annotation">{mapNote(beat)}</span>
        </figure>
      );
    case "stamp":
      return (
        <span className="stamp-proof" role="img" aria-label={`Stamp: ${beat.stamp}`}>
          {beat.stamp}
        </span>
      );
    default:
      return null;
  }
}

function mapNote(beat: Beat): string {
  if (beat.atlasHandoff) {
    return "The story map opens into the full atlas — every site, yours to explore.";
  }
  const siteIndex = getSiteIndex();
  const sites = (beat.sites ?? []).map((id) => siteIndex.get(id)!);
  if (sites.length === 0) return "Map forthcoming.";
  const [first, ...rest] = sites;
  const place = [first.city, first.country].filter(Boolean).join(", ");
  const parts = [`${first.name}${place ? ` — ${place}` : ""}`];
  if (rest.length > 0) {
    parts.push(
      beat.drawLinks
        ? `ink lines to ${rest.length} more site${rest.length > 1 ? "s" : ""}`
        : `with ${rest.length} more site${rest.length > 1 ? "s" : ""}`,
    );
  }
  return `Camera: ${parts.join(" · ")}.`;
}
