// hero-brush.mjs — the shared brush: procedural stamp textures + the stroke
// renderer used by hero-decompose.mjs, hero-proof.mjs and (mirrored in TS by)
// src/components/hero/HeroPainting.tsx. One stroke = a quadratic path through
// the orientation field, swept with 2-3 tinted stamp segments; stamps carry
// the bristle texture, tapered ends, and irregular silhouette so strokes read
// as oil paint, not geometry (Rob's gate-2 note).

import { createCanvas } from "@napi-rs/canvas";

// Two registers (Rob's gate-3 note A2): stamps 0-4 are soft-edged for the
// blended underpainting (tiers 0-1); stamps 5-9 are hard-edged (≤1px feather
// at render size) irregular touches for the crisp tiers (3+). The feather is
// defined relative to the 192px cell, so downscaled to dab size it stays
// sub-pixel — no upscaling happens anywhere (dabs are always ≤ cell size).
export const SOFT_STAMPS = 5;
export const HARD_STAMPS = 5;
export const STAMP_COUNT = SOFT_STAMPS + HARD_STAMPS;
export const STAMP_W = 192;
export const STAMP_H = 96;

function stampRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Build the stamp sprite: STAMP_COUNT brush footprints side by side, white
 * shapes with shaped alpha — tapered tips, noise-perturbed silhouette, and
 * lengthwise bristle striations. The same sprite ships to the browser
 * (public/hero/brush-stamps.png) so Node renders and the player agree.
 */
export function generateStampSprite() {
  const sprite = createCanvas(STAMP_W * STAMP_COUNT, STAMP_H);
  const ctx = sprite.getContext("2d");

  for (let s = 0; s < STAMP_COUNT; s++) {
    const hard = s >= SOFT_STAMPS;
    const rand = stampRng(811 + s * 977);
    const img = ctx.createImageData(STAMP_W, STAMP_H);
    const data = img.data;
    const cx = STAMP_W / 2;
    const cy = STAMP_H / 2;
    const halfL = STAMP_W * 0.46;
    const halfW = STAMP_H * 0.36;

    // a handful of lengthwise bristle bands, each nudging alpha up or down
    const bands = [];
    const bandCount = 7 + Math.floor(rand() * 4);
    for (let b = 0; b < bandCount; b++) {
      bands.push({
        y: (rand() - 0.5) * 2 * halfW,
        w: halfW * (0.08 + rand() * 0.2),
        a: (rand() - 0.5) * (hard ? 0.4 : 0.5),
      });
    }
    // silhouette wobble: hard touches get chunkier, higher-frequency chips
    const wob = [];
    const wobCount = hard ? 6 : 4;
    for (let k = 0; k < wobCount; k++) {
      wob.push({
        f: 1 + k + rand() * (hard ? 4 : 2),
        p: rand() * Math.PI * 2,
        a: (hard ? 0.08 : 0.05) + rand() * (hard ? 0.11 : 0.08),
      });
    }

    // soft register feathers over ~7px of the cell; hard register over ~2px,
    // which is sub-pixel once the stamp is downscaled to dab size
    const edgeRamp = hard ? 45 : 9;

    for (let y = 0; y < STAMP_H; y++) {
      for (let x = 0; x < STAMP_W; x++) {
        const u = (x - cx) / halfL; // -1..1 along
        const v = (y - cy) / halfW; // -1..1 across
        // tapered ends (hard touches stay blunter)
        let envelope = hard
          ? Math.sqrt(Math.max(0, 1 - u * u * u * u * u * u))
          : Math.sqrt(Math.max(0, 1 - u * u * u * u));
        for (const o of wob) envelope *= 1 + o.a * Math.sin(u * o.f * Math.PI + o.p) * 0.5;
        const edge = envelope - Math.abs(v);
        let alpha = edge <= 0 ? 0 : Math.min(1, edge * edgeRamp);
        if (alpha > 0) {
          alpha *= hard ? 0.99 : 0.92 - 0.1 * u * (rand() * 0.2 + 0.9) * 0.5;
          for (const b of bands) {
            const d = Math.abs(y - cy - b.y);
            if (d < b.w) alpha *= 1 + b.a * (1 - d / b.w);
          }
          alpha = Math.max(0, Math.min(1, alpha));
        }
        const i = (y * STAMP_W + x) * 4;
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
        data[i + 3] = Math.round(alpha * 255);
      }
    }
    ctx.putImageData(img, s * STAMP_W, 0);
  }
  return sprite;
}

/** Scratch canvas pool for tinting stamp cells. */
export function makeScratch() {
  const c = createCanvas(STAMP_W, STAMP_H);
  return { canvas: c, ctx: c.getContext("2d") };
}

/**
 * Draw one stroke: a quadratic bezier (p0 → ctrl → p1) derived from center,
 * angle, length and bend, swept with 2-3 stamp segments, each tinted with a
 * small value drift along the stroke so the paint load varies.
 *
 * stroke: { x, y, len, wid, angle, bend (-1..1), alpha, stamp (0..4),
 *           vdrift (-1..1) }
 */
export function drawStroke(ctx, stroke, r, g, b, stamps, scratch) {
  const { x, y, len, wid, angle, bend, alpha, stamp, vdrift } = stroke;
  const dx = Math.cos(angle), dy = Math.sin(angle);
  const nx = -dy, ny = dx;
  const half = len / 2;
  const bendPx = bend * len * 0.18;
  const p0x = x - dx * half, p0y = y - dy * half;
  const p1x = x + dx * half, p1y = y + dy * half;
  const cxp = x + nx * bendPx, cyp = y + ny * bendPx;

  // short dabs stamp once (crisp touches); long strokes sweep 2-3 segments
  const segs = len < wid * 2.2 ? 1 : len > wid * 3.5 ? 3 : 2;
  const segLen = segs === 1 ? len : (len / segs) * 1.25;

  for (let i = 0; i < segs; i++) {
    const t = (i + 0.5) / segs;
    const omt = 1 - t;
    const px = omt * omt * p0x + 2 * omt * t * cxp + t * t * p1x;
    const py = omt * omt * p0y + 2 * omt * t * cyp + t * t * p1y;
    // bezier tangent
    const tx = 2 * omt * (cxp - p0x) + 2 * t * (p1x - cxp);
    const ty = 2 * omt * (cyp - p0y) + 2 * t * (p1y - cyp);
    const ta = Math.atan2(ty, tx);

    // value drift along the stroke (±6% max), direction set by vdrift sign
    const drift = 1 + vdrift * 0.06 * (t - 0.5) * 2;
    const rr = Math.max(0, Math.min(255, Math.round(r * drift)));
    const gg = Math.max(0, Math.min(255, Math.round(g * drift)));
    const bb = Math.max(0, Math.min(255, Math.round(b * drift)));

    // tint the stamp cell
    const sctx = scratch.ctx;
    sctx.clearRect(0, 0, STAMP_W, STAMP_H);
    sctx.globalCompositeOperation = "source-over";
    sctx.drawImage(stamps, stamp * STAMP_W, 0, STAMP_W, STAMP_H, 0, 0, STAMP_W, STAMP_H);
    sctx.globalCompositeOperation = "source-in";
    sctx.fillStyle = `rgb(${rr},${gg},${bb})`;
    sctx.fillRect(0, 0, STAMP_W, STAMP_H);

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(ta);
    ctx.globalAlpha = alpha;
    ctx.drawImage(scratch.canvas, -segLen / 2, -wid / 2, segLen, wid);
    ctx.restore();
  }
}

/**
 * Subtle canvas-grain tile (woven texture), overlaid on composites at low
 * opacity so the paint sits on linen rather than glass.
 */
export function generateGrainTile(size = 256) {
  const c = createCanvas(size, size);
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(size, size);
  const rand = stampRng(424242);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const weave =
        Math.sin(x * 0.9 + Math.sin(y * 0.13) * 2) * 0.5 +
        Math.sin(y * 0.85 + Math.sin(x * 0.11) * 2) * 0.5;
      const n = (rand() - 0.5) * 0.6;
      const v = 128 + (weave + n) * 26;
      const i = (y * size + x) * 4;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Overlay the grain tile across a canvas at the given strength. */
export function applyGrain(ctx, grainTile, w, h, strength = 0.05) {
  ctx.save();
  ctx.globalAlpha = strength;
  ctx.globalCompositeOperation = "multiply";
  for (let y = 0; y < h; y += grainTile.height) {
    for (let x = 0; x < w; x += grainTile.width) {
      ctx.drawImage(grainTile, x, y);
    }
  }
  ctx.restore();
}

/**
 * Grain clipped to the PAINT (source-atop): the linen rides the strokes and
 * never tints bare ground — essential once the painting floats transparent
 * on the page so no rectangle seam exists (Rob's bleed note, 2026-06-11).
 */
export function applyGrainAtop(ctx, grainTile, w, h, strength = 0.05) {
  ctx.save();
  ctx.globalAlpha = strength;
  ctx.globalCompositeOperation = "source-atop";
  for (let y = 0; y < h; y += grainTile.height) {
    for (let x = 0; x < w; x += grainTile.width) {
      ctx.drawImage(grainTile, x, y);
    }
  }
  ctx.restore();
}
