"use client";

// The red ink stamp — the signature element (DESIGN §Direction). Thunks onto
// the sheet once per chapter: ~110ms scale-down with a couple degrees of
// rotation, then a 1px paper shake handled by the figure stage. Distressed
// edge via an SVG displacement filter; multiply blend so it sits in the
// paper like ink.

export default function Stamp({ text }: { text: string }) {
  return (
    <>
      <svg width="0" height="0" aria-hidden focusable="false">
        <filter id="stamp-rough">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.55"
            numOctaves="2"
            seed="7"
            result="noise"
          />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.4" />
        </filter>
      </svg>
      <span className="stamp" role="img" aria-label={`Stamp: ${text}`}>
        {text}
      </span>
    </>
  );
}
