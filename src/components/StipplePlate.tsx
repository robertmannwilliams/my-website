"use client";

import { useEffect, useMemo, useState } from "react";

export type SilhouetteDraw = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
) => void;

interface StipplePlateProps {
  draw: SilhouetteDraw;
  width?: number;
  height?: number;
  /** Approx dots per 1000 px² of silhouette area. Higher = denser. */
  density?: number;
  seed?: number;
  minRadius?: number;
  maxRadius?: number;
  minOpacity?: number;
  maxOpacity?: number;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
}

// Mulberry32 — deterministic seeded PRNG so plates don't reshuffle between
// renders (SSR/hydration will hand off identical dot layouts once mounted).
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Dot {
  x: number;
  y: number;
  r: number;
  o: number;
}

// Rasterize silhouette to an offscreen canvas, then rejection-sample dots from
// the white regions. Same technique used by the landing-page ParticleField to
// place particles onto the skyline mask.
function generateDots(
  draw: SilhouetteDraw,
  w: number,
  h: number,
  target: number,
  seed: number,
  minR: number,
  maxR: number,
  minO: number,
  maxO: number
): Dot[] {
  if (typeof document === "undefined") return [];

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "white";
  ctx.strokeStyle = "white";
  draw(ctx, w, h);

  const { data } = ctx.getImageData(0, 0, w, h);
  const rand = mulberry32(seed);
  const dots: Dot[] = [];
  const maxAttempts = target * 60;
  let attempts = 0;

  while (dots.length < target && attempts < maxAttempts) {
    attempts++;
    const x = rand() * w;
    const y = rand() * h;
    const idx = (Math.floor(y) * w + Math.floor(x)) * 4;
    if (data[idx] <= 128) continue;
    dots.push({
      x,
      y,
      r: minR + rand() * (maxR - minR),
      o: minO + rand() * (maxO - minO),
    });
  }
  return dots;
}

export default function StipplePlate({
  draw,
  width = 320,
  height = 240,
  density = 2.2,
  seed = 1,
  minRadius = 0.55,
  maxRadius = 1.55,
  minOpacity = 0.45,
  maxOpacity = 0.95,
  className,
  style,
  ariaLabel,
}: StipplePlateProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const dots = useMemo(() => {
    if (!mounted) return [];
    const target = Math.round((width * height * density) / 1000);
    return generateDots(
      draw,
      width,
      height,
      target,
      seed,
      minRadius,
      maxRadius,
      minOpacity,
      maxOpacity
    );
  }, [
    mounted,
    draw,
    width,
    height,
    density,
    seed,
    minRadius,
    maxRadius,
    minOpacity,
    maxOpacity,
  ]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={style}
      role={ariaLabel ? "img" : "presentation"}
      aria-label={ariaLabel}
      preserveAspectRatio="xMidYMid meet"
    >
      {dots.map((d, i) => (
        <circle
          key={i}
          cx={d.x}
          cy={d.y}
          r={d.r}
          fill="currentColor"
          opacity={d.o}
        />
      ))}
    </svg>
  );
}
