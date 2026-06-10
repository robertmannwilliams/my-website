"use client";

// Placeholder plate: a ruled drafting frame with construction lines and the
// figure caption, holding the spot until the real plates land in Phase 4.

const PLATE_CAPTIONS: Record<string, string> = {
  "the-question": "a question, typed.",
  "one-computer-building": "datacenter campus under construction, aerial cutaway.",
  "sand-to-wafer": "quartz ridge, crystal ingot, mirror-polished wafers.",
  "euv-machine": "EUV exposure tool, Veldhoven.",
  "fab-cathedral": "fab interior, cathedral scale.",
  "hbm-sandwich": "the chip package, drawn like a building section.",
  "rack-to-building": "chip → tray → rack → row → hall → campus.",
  "power-island": "cooling towers and a restarted reactor, lines marching to the horizon.",
  "two-seconds": "the journey, one continuous line.",
  "the-atlas": "a drafting table, the world spread on it.",
};

export default function PlateFigure({
  plate,
  chapterId,
}: {
  plate: string;
  chapterId: number;
}) {
  const caption =
    PLATE_CAPTIONS[plate] ?? `${plate.replace(/-/g, " ")} (plate forthcoming).`;
  return (
    <figure className="story-plate">
      <div className="story-plate__frame" aria-hidden>
        <svg viewBox="0 0 400 280" preserveAspectRatio="none">
          <line x1="0" y1="0" x2="400" y2="280" />
          <line x1="400" y1="0" x2="0" y2="280" />
        </svg>
        <span className="atlas-mono story-plate__tag">
          Plate · {plate} · forthcoming
        </span>
      </div>
      <figcaption className="atlas-annotation story-plate__caption">
        Fig. {chapterId} — {caption}
      </figcaption>
    </figure>
  );
}
