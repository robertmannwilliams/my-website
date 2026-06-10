// In-code SVG diagrams (PLAN Phase 3): drawn in ink with the same line
// weights as the map, captioned as figures, inking themselves in on scroll.

import type { ComponentType } from "react";
import CableNervousSystem from "./CableNervousSystem";
import GpuGrid from "./GpuGrid";
import TrainingRoom from "./TrainingRoom";

interface DiagramEntry {
  Component: ComponentType<{ drawn: boolean }>;
  caption: string;
}

export const DIAGRAMS: Record<string, DiagramEntry> = {
  "gpu-grid": {
    Component: GpuGrid,
    caption: "a GPU drawn as a city grid; a CPU as a few grand buildings.",
  },
  "cable-nervous-system": {
    Component: CableNervousSystem,
    caption: "the cable plant, rear of rack row.",
  },
  "training-room": {
    Component: TrainingRoom,
    caption: "a building-sized machine reading a library.",
  },
};

export default function DiagramFigure({
  plate,
  figNo,
  drawn,
}: {
  plate: string;
  figNo: number;
  drawn: boolean;
}) {
  const entry = DIAGRAMS[plate];
  if (!entry) return null;
  const { Component } = entry;
  return (
    <figure className="story-diagram">
      <div className="story-diagram__frame">
        <Component drawn={drawn} />
      </div>
      <figcaption className="atlas-annotation story-plate__caption">
        Fig. {figNo} — {entry.caption}
      </figcaption>
    </figure>
  );
}
