"use client";

// Placeholder plate: a ruled drafting frame with construction lines and the
// figure caption, holding the spot until the real plates land in Phase 4.

const PLATE_CAPTIONS: Record<string, string> = {
  "euv-machine": "EUV exposure tool, Veldhoven.",
  "gpu-grid": "A GPU drawn as a city; a CPU drawn as a few grand buildings.",
  "cable-nervous-system": "The cable plant, rear of rack row.",
  "training-room": "A building-sized machine reading a library.",
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
