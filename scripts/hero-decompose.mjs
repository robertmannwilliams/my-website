// hero-decompose.mjs — offline decomposition of the homepage hero painting
// into an ordered brush-stroke field (spec: hero/HERO.md Phase 1; reworked
// per Rob's gate notes round 1 [error-driven tiers, computed order] and
// round 2 [oil-paint rendering: full tiled coverage, curved tapered stamp
// strokes, wet blending, area-average color, autonomous convergence]).
//
// Reads  hero/sources/{master,variant-*,underdrawing}.png
// Writes public/hero/strokes.bin            (JSON header + quantized SoA arrays)
//        public/hero/brush-stamps.png       (stamp sprite the player tints)
//        public/hero/canvas-grain.png       (linen overlay tile)
//        public/hero/final-{variant}.jpg    (stroke render baked on site paper)
//        public/hero/og.jpg                 (1200x630 crop of final-master)
//        public/hero/underdrawing.jpg       (pentimento layer)
//        hero/order-heatmap.png             (replay order: early=light, late=dark)
//        hero/contact-sheet-{N}.png         (master vs render, full + 3 crops)
//
// Run: node scripts/hero-decompose.mjs [--round N]

import { createCanvas, loadImage } from "@napi-rs/canvas";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import zlib from "node:zlib";
import { spawnSync } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import {
  generateStampSprite,
  generateGrainTile,
  applyGrainAtop,
  drawStroke,
  makeScratch,
  SOFT_STAMPS,
  HARD_STAMPS,
} from "./hero-brush.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC_DIR = path.join(ROOT, "hero", "sources");
const OUT_DIR = path.join(ROOT, "public", "hero");

/** Site paper the hero dissolves into (homepage background). */
const PAPER = "#eee8da";
const PAPER_RGB = [238, 232, 218];

// Tier 0 tiles the whole canvas (full coverage, ~30% overlap — no gaps, no
// visible underwash). Later tiers are error-driven refinement on top of it,
// worst cells first, capped.
const TILE_TIER = { r: 24, overlap: 0.38 };
const REFINE_TIERS = [
  { r: 12, t: 26, cap: 5000 },
  { r: 6, t: 30, cap: 10000 },
  { r: 3, t: 38, cap: 8000 },
];
// Mild unsharp on the finest refine tier so mid-detail carries contrast too.
const FINE_PUNCH = 1.25;
// The crisp-touch tier (gate-3 note A3): small hard-edged dabs at 98-100%
// opacity placed by residual error, colors as footprint MEDIANS so the
// broken-color flecks come back over the blended base. The crisp register
// carries most of the high-pass energy, so it gets the density.
const CRISP_TIER = { r: 2, t: 14, cap: 22700, grid: 3 };
// Unsharp factor on crisp colors: medians against the local low-pass,
// punched so adjacent touches carry the master's fleck contrast.
const CRISP_PUNCH = 1.9;
const PAINT_ALPHA = [0.9, 0.96]; // wet blending range (gate-2 rule 3)
const WASH_SPACING = 76; // thin toning wash — barely more than tinted canvas
const GRAIN_STRENGTH = 0.035;
const SIZE_BUDGET_KB = 800; // raised from 600 per gate-3 note A6 (see log)

// Spatially coherent development (gate-3 note B2): strokes order through a
// coarse cell grid so the activity always has a locus — sky settles, then
// skyline, tower, street, figures — instead of uniform global refinement.
const CELL_COLS = 8;
const CELL_ROWS = 5;

// ---------------------------------------------------------------------------
// numeric helpers
// ---------------------------------------------------------------------------

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
const lerp = (a, b, t) => a + (b - a) * t;

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function valueNoise2(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const h = (a, b) => {
    let n = a * 374761393 + b * 668265263;
    n = (n ^ (n >> 13)) * 1274126177;
    return (((n ^ (n >> 16)) >>> 0) % 4096) / 4096;
  };
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  return lerp(
    lerp(h(ix, iy), h(ix + 1, iy), sx),
    lerp(h(ix, iy + 1), h(ix + 1, iy + 1), sx),
    sy,
  );
}

function boxBlur(field, w, h, radius, passes = 3) {
  if (radius < 1) return;
  const tmp = new Float32Array(field.length);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < h; y++) {
      let acc = 0;
      const row = y * w;
      for (let x = -radius; x <= radius; x++) acc += field[row + Math.min(w - 1, Math.max(0, x))];
      const n = radius * 2 + 1;
      for (let x = 0; x < w; x++) {
        tmp[row + x] = acc / n;
        acc += field[row + Math.min(w - 1, x + radius + 1)] - field[row + Math.max(0, x - radius)];
      }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let y = -radius; y <= radius; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
      const n = radius * 2 + 1;
      for (let y = 0; y < h; y++) {
        field[y * w + x] = acc / n;
        acc += tmp[Math.min(h - 1, y + radius + 1) * w + x] - tmp[Math.max(0, y - radius) * w + x];
      }
    }
  }
}

// ---------------------------------------------------------------------------
// image loading + analysis
// ---------------------------------------------------------------------------

async function loadRaw(file, blurSigma = 0) {
  let img = sharp(file).removeAlpha();
  if (blurSigma >= 0.3) img = img.blur(blurSigma);
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

function toGray(img) {
  const { data, w, h } = img;
  const g = new Float32Array(w * h);
  for (let i = 0, p = 0; i < g.length; i++, p += 3) {
    g[i] = (0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2]) / 255;
  }
  return g;
}

function orientationField(gray, w, h, integrationRadius) {
  const gx = new Float32Array(w * h);
  const gy = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      gx[i] = (gray[i + 1] - gray[i - 1]) * 0.5;
      gy[i] = (gray[i + w] - gray[i - w]) * 0.5;
    }
  }
  const jxx = new Float32Array(w * h);
  const jyy = new Float32Array(w * h);
  const jxy = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    jxx[i] = gx[i] * gx[i];
    jyy[i] = gy[i] * gy[i];
    jxy[i] = gx[i] * gy[i];
  }
  const r = Math.max(2, Math.round(integrationRadius));
  boxBlur(jxx, w, h, r, 3);
  boxBlur(jyy, w, h, r, 3);
  boxBlur(jxy, w, h, r, 3);
  const angle = new Float32Array(w * h);
  const coh = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    let a = 0.5 * Math.atan2(2 * jxy[i], jxx[i] - jyy[i]) + Math.PI / 2;
    if (a >= Math.PI / 2) a -= Math.PI;
    angle[i] = a;
    const tr = jxx[i] + jyy[i];
    const det = Math.sqrt((jxx[i] - jyy[i]) ** 2 + 4 * jxy[i] * jxy[i]);
    coh[i] = tr > 1e-7 ? det / tr : 0;
  }
  return { angle, coh };
}

function edgeDensity(gray, w, h) {
  const d = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const sx =
        gray[i - w + 1] + 2 * gray[i + 1] + gray[i + w + 1] -
        (gray[i - w - 1] + 2 * gray[i - 1] + gray[i + w - 1]);
      const sy =
        gray[i + w - 1] + 2 * gray[i + w] + gray[i + w + 1] -
        (gray[i - w - 1] + 2 * gray[i - w] + gray[i - w + 1]);
      d[i] = Math.hypot(sx, sy);
    }
  }
  boxBlur(d, w, h, 14, 3);
  const sample = [];
  for (let i = 0; i < d.length; i += 397) sample.push(d[i]);
  sample.sort((a, b) => a - b);
  const p95 = sample[Math.floor(sample.length * 0.95)] || 1;
  for (let i = 0; i < d.length; i++) d[i] = clamp01(d[i] / p95);
  return d;
}

async function registrationScore(masterFile, variantFile) {
  const prep = (f) =>
    sharp(f).resize(160, null).grayscale().raw().toBuffer({ resolveWithObject: true });
  const [a, b] = await Promise.all([prep(masterFile), prep(variantFile)]);
  if (a.info.width !== b.info.width || a.info.height !== b.info.height) return 0;
  const n = Math.min(a.data.length, b.data.length);
  let sa = 0, sb = 0;
  for (let i = 0; i < n; i++) {
    sa += a.data[i];
    sb += b.data[i];
  }
  const ma = sa / n, mb = sb / n;
  let cov = 0, va = 0, vb = 0;
  for (let i = 0; i < n; i++) {
    const da = a.data[i] - ma, db = b.data[i] - mb;
    cov += da * db;
    va += da * da;
    vb += db * db;
  }
  return cov / Math.sqrt(va * vb || 1);
}

// ---------------------------------------------------------------------------
// stroke construction
// ---------------------------------------------------------------------------

/** Width of the edge-dissolve band as a fraction of min(w,h). Generous:
 *  the painting must BLEED into the page, not sit in a frame (Rob,
 *  2026-06-11 post-ship note). */
const EDGE_BAND = 0.14;

function dissolveAlpha(x, y, w, h, alpha) {
  const band = EDGE_BAND * Math.min(w, h);
  const d = Math.min(x, y, w - x, h - y) / band;
  if (d >= 1) return alpha;
  const noise = valueNoise2(x * 0.013, y * 0.013);
  // the hard floor (d/0.12) guarantees true zero AT the canvas line, so no
  // stroke ever gets guillotined flat by the bounds — the bleed dies out,
  // it is never cut off
  const a =
    alpha *
    Math.pow(clamp01(d + (noise - 0.5) * 0.6), 1.2) *
    clamp01(d / 0.12);
  return a < 0.03 ? 0 : a;
}

/** Strokes shrink as they approach the border so big dabs never reach the
 *  canvas line at visible alpha. */
function edgeShrink(s, w, h) {
  const band = EDGE_BAND * Math.min(w, h);
  const d = clamp01(Math.min(s.x, s.y, w - s.x, h - s.y) / band);
  if (d < 1) {
    s.len *= 0.55 + 0.45 * d;
    s.wid *= 0.7 + 0.3 * d;
  }
  return s;
}

/**
 * Footprint sample coordinates: 9 points spread over the stroke's swept area
 * (3 along the bezier × 3 across the width). The stroke's color is the AREA
 * AVERAGE of the master under these (gate-2 rule 4 — kills the warm-fleck
 * bias of point sampling), and variant colors reuse the same footprint.
 */
function footprintSamples(s, w, h) {
  const dx = Math.cos(s.angle), dy = Math.sin(s.angle);
  const nx = -dy, ny = dx;
  const half = s.len / 2;
  const bendPx = s.bend * s.len * 0.18;
  const p0x = s.x - dx * half, p0y = s.y - dy * half;
  const p1x = s.x + dx * half, p1y = s.y + dy * half;
  const cxp = s.x + nx * bendPx, cyp = s.y + ny * bendPx;
  const pts = [];
  for (const t of [0.18, 0.5, 0.82]) {
    const omt = 1 - t;
    const bx = omt * omt * p0x + 2 * omt * t * cxp + t * t * p1x;
    const by = omt * omt * p0y + 2 * omt * t * cyp + t * t * p1y;
    for (const v of [-0.55, 0, 0.55]) {
      const px = Math.round(bx + nx * v * s.wid * 0.5);
      const py = Math.round(by + ny * v * s.wid * 0.5);
      pts.push([Math.min(w - 1, Math.max(0, px)), Math.min(h - 1, Math.max(0, py))]);
    }
  }
  return pts;
}

/**
 * Footprint color: AREA AVERAGE of the image under the stroke (no warm-fleck
 * bias), with the average's chroma restored toward the footprint's MEAN
 * per-pixel saturation — plain averaging mixes complements toward gray, which
 * is the opposite color bias. Restoration is clamped at the footprint's own
 * mean saturation, so it can never amplify (gate-2 rule 4).
 */
function averageColor(img, samples) {
  let r = 0, g = 0, b = 0, satSum = 0;
  for (const [x, y] of samples) {
    const p = (y * img.w + x) * 3;
    const pr = img.data[p], pg = img.data[p + 1], pb = img.data[p + 2];
    r += pr;
    g += pg;
    b += pb;
    const mx = Math.max(pr, pg, pb);
    satSum += mx > 0 ? (mx - Math.min(pr, pg, pb)) / mx : 0;
  }
  const n = samples.length;
  r /= n;
  g /= n;
  b /= n;
  const meanSat = satSum / n;
  const mx = Math.max(r, g, b);
  const avgSat = mx > 0 ? (mx - Math.min(r, g, b)) / mx : 0;
  if (avgSat > 0.01 && meanSat > avgSat) {
    const k = Math.min(meanSat / avgSat, 2.2);
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    r = lum + (r - lum) * k;
    g = lum + (g - lum) * k;
    b = lum + (b - lum) * k;
  }
  return [clamp255(Math.round(r)), clamp255(Math.round(g)), clamp255(Math.round(b))];
}

/** Per-channel MEDIAN under the stroke footprint — the crisp-touch color
 *  rule (gate-3 note A3): medians keep the fleck colors averages dissolve. */
function footprintMedian(img, samples) {
  const rs = [], gs = [], bs = [];
  for (const [x, y] of samples) {
    const p = (y * img.w + x) * 3;
    rs.push(img.data[p]);
    gs.push(img.data[p + 1]);
    bs.push(img.data[p + 2]);
  }
  const med = (arr) => {
    arr.sort((a, b) => a - b);
    return arr[Math.floor(arr.length / 2)];
  };
  return [med(rs), med(gs), med(bs)];
}

/** Common stroke fields shared by every tier. Soft stamp register for the
 *  blended underpainting (tiers ≤ 1), hard register for crisp tiers (≥ 2). */
function finishStroke(s, master, fields, w, h, random) {
  const i = Math.round(s.y) * w + Math.round(s.x);
  const coh = fields.coh[i];
  s.bend = (random() - 0.5) * 2 * lerp(0.25, 1, 1 - coh); // calm areas curve more
  s.stamp =
    s.tier >= 2
      ? SOFT_STAMPS + Math.floor(random() * HARD_STAMPS)
      : Math.floor(random() * SOFT_STAMPS);
  s.vdrift = random() * 2 - 1;
  s.coh = coh;
  s.density = fields.density[i];
  edgeShrink(s, w, h);
  s.samples = footprintSamples(s, w, h);
  s.color = averageColor(master, s.samples);
  return s;
}

/**
 * Silhouette protection (gate-3 note A4): walk outward from the stroke's
 * center along its path; where the master's color breaks hard from the
 * stroke's own color (an object boundary), trim the stroke so it stops at
 * the edge instead of smudging across it. Fine tiers only.
 */
function clipAtEdges(s, master, w, h) {
  const dx = Math.cos(s.angle), dy = Math.sin(s.angle);
  const c = s.color;
  const limit = 70; // RGB distance that counts as "crossed a boundary"
  let half = s.len / 2;
  for (const dir of [-1, 1]) {
    for (let t = 0.35; t <= 1; t += 0.22) {
      const px = Math.round(s.x + dir * dx * half * t);
      const py = Math.round(s.y + dir * dy * half * t);
      if (px < 0 || py < 0 || px >= w || py >= h) break;
      const p = (py * w + px) * 3;
      const dr = master.data[p] - c[0];
      const dg = master.data[p + 1] - c[1];
      const db = master.data[p + 2] - c[2];
      if (Math.sqrt(dr * dr + dg * dg + db * db) > limit) {
        half = Math.max(s.wid * 0.6, half * t * 0.85);
        break;
      }
    }
  }
  s.len = Math.max(s.wid, half * 2);
  return s;
}

function generateWash(blurred, w, h, random) {
  const strokes = [];
  for (let gy = WASH_SPACING / 2; gy < h + WASH_SPACING / 2; gy += WASH_SPACING) {
    for (let gx = WASH_SPACING / 2; gx < w + WASH_SPACING / 2; gx += WASH_SPACING) {
      const x = Math.min(w - 2, Math.max(1, gx + (random() - 0.5) * WASH_SPACING * 0.6));
      const y = Math.min(h - 2, Math.max(1, gy + (random() - 0.5) * WASH_SPACING * 0.6));
      const alpha = dissolveAlpha(x, y, w, h, lerp(0.3, 0.42, random()));
      if (alpha === 0) continue;
      const wid = WASH_SPACING * lerp(1.05, 1.35, random());
      const p = (Math.round(y) * w + Math.round(x)) * 3;
      const mix = 0.75; // barely more than tinted canvas
      strokes.push(edgeShrink({
        x, y, wid,
        len: wid * lerp(1.6, 2.2, random()),
        angle: (random() - 0.5) * Math.PI,
        bend: (random() - 0.5) * 1.2,
        stamp: Math.floor(random() * SOFT_STAMPS),
        vdrift: random() * 2 - 1,
        alpha,
        tier: -1,
        coh: 0,
        density: 0,
        color: [
          clamp255(Math.round(lerp(blurred.data[p], PAPER_RGB[0], mix))),
          clamp255(Math.round(lerp(blurred.data[p + 1], PAPER_RGB[1], mix))),
          clamp255(Math.round(lerp(blurred.data[p + 2], PAPER_RGB[2], mix))),
        ],
        samples: [[Math.round(x), Math.round(y)]],
      }, w, h));
    }
  }
  return strokes;
}

/**
 * Tier 0: tile the WHOLE canvas with large strokes at ~30% overlap — the
 * opaque ground every later tier paints into. Spacing is width-derived so
 * coverage holds regardless of tuning (gate-2 rule 1).
 */
function tileBaseCoat(master, fields, w, h, random) {
  const { r, overlap } = TILE_TIER;
  const baseWid = r * 2;
  const step = baseWid * (1 - overlap);
  const strokes = [];
  let row = 0;
  for (let gy = step / 2; gy < h + baseWid * 0.5; gy += step, row++) {
    const offset = (row % 2) * step * 0.5; // brick the rows
    for (let gx = step / 2 - offset; gx < w + baseWid * 0.5; gx += step) {
      const x = Math.min(w - 2, Math.max(1, gx + (random() - 0.5) * step * 0.45));
      const y = Math.min(h - 2, Math.max(1, gy + (random() - 0.5) * step * 0.45));
      const alpha = dissolveAlpha(x, y, w, h, lerp(PAINT_ALPHA[0], PAINT_ALPHA[1], random()));
      if (alpha === 0) continue;
      const i = Math.round(y) * w + Math.round(x);
      const coh = fields.coh[i];
      const wid = baseWid * lerp(0.92, 1.18, random());
      const s = {
        x, y, wid,
        len: wid * lerp(2.0, 3.0, random()) * lerp(1, 1.25, coh),
        angle:
          coh > 0.09
            ? fields.angle[i] + (random() - 0.5) * lerp(0.5, 0.12, clamp01(coh * 1.6))
            : (random() - 0.5) * Math.PI,
        alpha,
        tier: 0,
      };
      strokes.push(finishStroke(s, master, fields, w, h, random));
    }
  }
  return strokes;
}

/** Error-driven refinement tier (worst cells first, capped). */
function refineTier(ctx, tier, master, ref, fields, w, h, random) {
  const { r, t, cap } = tier;
  const canvasData = ctx.getImageData(0, 0, w, h).data;
  const refData = ref.data;
  const grid = Math.max(2, Math.round(r * 1.15));

  const candidates = [];
  for (let cy = 0; cy < h; cy += grid) {
    for (let cx = 0; cx < w; cx += grid) {
      let sum = 0, n = 0, worst = -1, wx = cx, wy = cy;
      const yEnd = Math.min(h, cy + grid);
      const xEnd = Math.min(w, cx + grid);
      for (let y = cy; y < yEnd; y += 2) {
        for (let x = cx; x < xEnd; x += 2) {
          const c4 = (y * w + x) * 4;
          const c3 = (y * w + x) * 3;
          const dr = canvasData[c4] - refData[c3];
          const dg = canvasData[c4 + 1] - refData[c3 + 1];
          const db = canvasData[c4 + 2] - refData[c3 + 2];
          const e = Math.sqrt(dr * dr + dg * dg + db * db);
          sum += e;
          n++;
          if (e > worst) {
            worst = e;
            wx = x;
            wy = y;
          }
        }
      }
      if (n === 0 || sum / n <= t) continue;
      candidates.push({ err: sum / n, wx, wy });
    }
  }

  candidates.sort((a, b) => b.err - a.err);
  const strokes = [];
  for (const cand of candidates) {
    if (strokes.length >= cap) break;
    const { wx, wy } = cand;
    const i = wy * w + wx;
    const coh = fields.coh[i];
    const alpha = dissolveAlpha(wx, wy, w, h, lerp(PAINT_ALPHA[0], PAINT_ALPHA[1], random()));
    if (alpha === 0) continue;
    const wid = r * 2 * lerp(0.85, 1.15, random());
    // refinement touches stay short and direct — the master's detail is
    // built from crisp small dabs, not long sweeps
    const fine = r <= 4;
    const s = {
      x: wx, y: wy, wid,
      len:
        wid *
        (fine ? lerp(1.5, 2.4, random()) : lerp(2.0, 3.4, random())) *
        lerp(0.85, fine ? 1.25 : 1.5, coh),
      angle:
        coh > 0.09
          ? fields.angle[i] + (random() - 0.5) * lerp(0.55, 0.12, clamp01(coh * 1.6))
          : (random() - 0.5) * Math.PI,
      alpha,
      tier: tier.index,
    };
    const st = finishStroke(s, master, fields, w, h, random);
    if (fine) st.bend *= 0.4;
    if (tier.r <= 6) clipAtEdges(st, master, w, h);
    strokes.push(st);
  }
  return strokes;
}

/**
 * The crisp-touch tier (gate-3 note A3): small hard-edged dabs at 98-100%
 * opacity placed by residual error against the unblurred master — densest
 * over the flags, scaffold lattice, figure edges, and water sparkle. Colors
 * are footprint MEDIANS (not averages) so the broken-color flecks return.
 */
function crispTier(ctx, master, lowMaster, fields, w, h, random, stamps, scratch) {
  const { t, cap, grid } = CRISP_TIER;
  const canvasData = ctx.getImageData(0, 0, w, h).data;

  const candidates = [];
  for (let cy = 0; cy < h; cy += grid) {
    for (let cx = 0; cx < w; cx += grid) {
      let worst = -1, wx = cx, wy = cy;
      const yEnd = Math.min(h, cy + grid);
      const xEnd = Math.min(w, cx + grid);
      for (let y = cy; y < yEnd; y++) {
        for (let x = cx; x < xEnd; x++) {
          const c4 = (y * w + x) * 4;
          const c3 = (y * w + x) * 3;
          const dr = canvasData[c4] - master.data[c3];
          const dg = canvasData[c4 + 1] - master.data[c3 + 1];
          const db = canvasData[c4 + 2] - master.data[c3 + 2];
          const e = Math.sqrt(dr * dr + dg * dg + db * db);
          if (e > worst) {
            worst = e;
            wx = x;
            wy = y;
          }
        }
      }
      if (worst <= t) continue;
      candidates.push({ err: worst, wx, wy });
    }
  }

  candidates.sort((a, b) => b.err - a.err);
  const strokes = [];
  for (const cand of candidates) {
    if (strokes.length >= cap) break;
    const { wx, wy } = cand;
    const i = wy * w + wx;
    const coh = fields.coh[i];
    const alpha = dissolveAlpha(wx, wy, w, h, lerp(0.98, 1, random()));
    if (alpha === 0) continue;
    const wid = lerp(2.5, 5.5, random());
    const s = {
      x: wx, y: wy, wid,
      len: wid * lerp(1.0, 1.8, random()),
      angle:
        coh > 0.09
          ? fields.angle[i] + (random() - 0.5) * 0.2
          : (random() - 0.5) * Math.PI,
      alpha,
      tier: 4,
      bend: (random() - 0.5) * 0.3,
      stamp: SOFT_STAMPS + Math.floor(random() * HARD_STAMPS),
      vdrift: random() * 2 - 1,
      coh,
      density: fields.density[i],
    };
    edgeShrink(s, w, h);
    s.samples = footprintSamples(s, w, h);
    const med = footprintMedian(master, s.samples);
    // unsharp the touch against the local low-pass: the fleck's distance
    // from its surroundings is what the eye reads as broken color
    const lp = (wy * w + wx) * 3;
    s.color = [
      clamp255(Math.round(lowMaster.data[lp] + (med[0] - lowMaster.data[lp]) * CRISP_PUNCH)),
      clamp255(Math.round(lowMaster.data[lp + 1] + (med[1] - lowMaster.data[lp + 1]) * CRISP_PUNCH)),
      clamp255(Math.round(lowMaster.data[lp + 2] + (med[2] - lowMaster.data[lp + 2]) * CRISP_PUNCH)),
    ];
    clipAtEdges(s, master, w, h);
    strokes.push(s);
    drawStroke(ctx, s, s.color[0], s.color[1], s.color[2], stamps, scratch);
  }
  return strokes;
}

// ---------------------------------------------------------------------------
// ordering (gate-1 contract + gate-3 spatial coherence)
// ---------------------------------------------------------------------------

function isWarmAccent([r, g, b]) {
  const mx = Math.max(r, g, b) / 255;
  const mn = Math.min(r, g, b) / 255;
  if (mx < 0.3) return false;
  const sat = mx > 0 ? (mx - mn) / mx : 0;
  if (sat < 0.45) return false;
  const d = mx - mn;
  if (d === 0) return false;
  let hue;
  const r1 = r / 255, g1 = g / 255, b1 = b / 255;
  if (mx === r1) hue = ((g1 - b1) / d) % 6;
  else if (mx === g1) hue = (b1 - r1) / d + 2;
  else hue = (r1 - g1) / d + 4;
  hue *= 60;
  if (hue < 0) hue += 360;
  return hue <= 55 || hue >= 330;
}

function orderStrokes(wash, painted, random) {
  const values = painted.map((s) => Math.max(s.color[0], s.color[1], s.color[2]));
  const sortedV = [...values].sort((a, b) => a - b);
  const darkCut = sortedV[Math.floor(sortedV.length * 0.1)];

  const accents = [];
  const middle = [];
  painted.forEach((s, i) => {
    if (isWarmAccent(s.color) || values[i] <= darkCut) accents.push(s);
    else middle.push(s);
  });

  // warm rule is absolute; the dark decile flexes to keep the tail ≥ 80%
  const total = wash.length + painted.length;
  const maxAccents = Math.floor(total * 0.2);
  if (accents.length > maxAccents) {
    const darks = accents
      .filter((s) => !isWarmAccent(s.color))
      .sort((a, b) => Math.max(...b.color) - Math.max(...a.color));
    let excess = accents.length - maxAccents;
    const demoted = new Set();
    for (const s of darks) {
      if (excess === 0) break;
      demoted.add(s);
      excess--;
    }
    for (let i = accents.length - 1; i >= 0; i--) {
      if (demoted.has(accents[i])) {
        middle.push(accents[i]);
        accents.splice(i, 1);
      }
    }
  }

  // Spatially coherent development (gate-3 note B2): bucket strokes into a
  // coarse cell grid; order the CELLS by painter logic (light before dark,
  // calm before detailed, sky before street) but walk them with a
  // nearest-neighbor bias so the activity has a continuous locus — the hand
  // moves across the canvas. Within a cell: size tiers big → small, then the
  // crisp pass returns across the same cell path as the finishing sweep.
  const jitterKey = (s) => {
    const v = Math.sin(s.x * 12.9898 + s.y * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  const W = 1672, H = 941; // cell math normalizes below — actual w/h passed via strokes
  const cellOf = (s, w, h) =>
    Math.min(CELL_ROWS - 1, Math.floor((s.y / h) * CELL_ROWS)) * CELL_COLS +
    Math.min(CELL_COLS - 1, Math.floor((s.x / w) * CELL_COLS));

  const wMax = Math.max(...middle.map((s) => s.x), W);
  const hMax = Math.max(...middle.map((s) => s.y), H);
  const cells = new Map();
  for (const s of middle) {
    const c = cellOf(s, wMax, hMax);
    if (!cells.has(c)) cells.set(c, []);
    cells.get(c).push(s);
  }

  // score each cell, then greedy-walk: among the 4 best remaining scores,
  // go to the one nearest the current cell
  const cellInfo = [...cells.entries()].map(([id, list]) => {
    let lum = 0, den = 0;
    for (const s of list) {
      lum += (0.2126 * s.color[0] + 0.7152 * s.color[1] + 0.0722 * s.color[2]) / 255;
      den += s.density;
    }
    lum /= list.length;
    den /= list.length;
    const row = Math.floor(id / CELL_COLS);
    const col = id % CELL_COLS;
    return { id, row, col, score: 0.45 * (1 - lum) + 0.3 * den + 0.25 * (row / (CELL_ROWS - 1)) };
  });
  cellInfo.sort((a, b) => a.score - b.score);
  const walk = [];
  const remaining = [...cellInfo];
  let current = remaining.shift();
  walk.push(current);
  while (remaining.length) {
    const k = Math.min(4, remaining.length);
    let best = 0, bestD = Infinity;
    for (let i = 0; i < k; i++) {
      const d = Math.hypot(remaining[i].row - current.row, remaining[i].col - current.col);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    current = remaining.splice(best, 1)[0];
    walk.push(current);
  }

  const orderedMiddle = [];
  const crispPass = [];
  for (const cell of walk) {
    const list = cells.get(cell.id);
    const sweep = (arr, dir) =>
      arr.sort(
        (a, b) =>
          dir * (a.x + a.y * 0.3) + (jitterKey(a) - 0.5) * 200 -
          (dir * (b.x + b.y * 0.3) + (jitterKey(b) - 0.5) * 200),
      );
    const tiers = [...new Set(list.map((s) => s.tier))].sort((a, b) => a - b);
    for (const t of tiers) {
      const group = list.filter((s) => s.tier === t);
      if (t === 4) {
        // crisp touches come back late, as the finishing sweep
        crispPass.push(...sweep(group, walk.indexOf(cell) % 2 === 0 ? 1 : -1));
      } else {
        orderedMiddle.push(...sweep(group, t % 2 === 0 ? 1 : -1));
      }
    }
  }
  orderedMiddle.push(...crispPass);

  const darkAccents = accents.filter((s) => !isWarmAccent(s.color));
  const warmAccents = accents.filter((s) => isWarmAccent(s.color));
  const softShuffle = (arr) => {
    for (let i = 0; i < arr.length; i++) {
      const j = Math.min(arr.length - 1, i + Math.floor(random() * 24));
      if (arr[i].tier === arr[j].tier) [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const ordered = [...wash, ...orderedMiddle, ...softShuffle(darkAccents), ...softShuffle(warmAccents)];
  const accentStart = (wash.length + orderedMiddle.length) / ordered.length;
  return { ordered, accentStart, accentCount: accents.length };
}

// ---------------------------------------------------------------------------
// packing (v3: bezier strokes + stamp fields, variants as int8 deltas)
// ---------------------------------------------------------------------------

const LEN_SCALE = 1.5; // u8 quantization: lengths to 170px

function packStrokes(strokes, variants, w, h, washCount) {
  const count = strokes.length;
  const header = {
    version: 4,
    count,
    width: w,
    height: h,
    washCount,
    paintAlpha: PAINT_ALPHA,
    grain: GRAIN_STRENGTH,
    stamps: { count: SOFT_STAMPS + HARD_STAMPS, soft: SOFT_STAMPS, cellW: 192, cellH: 96 },
    variants: ["master", ...variants.map((v) => v.name)],
    // SoA: x u16 (px*8), y u16 (px*8), len u8 (px*1.5), wid u8 (px*1.5),
    // angle u8, alphaStamp u8 (alpha 4 bits | stamp 4 bits), bendDrift u8
    // (bend 4 bits | vdrift 4 bits), master rgb u8*3, per extra variant rgb
    // int8 deltas
    fields: ["x16", "y16", "len8", "wid8", "ang8", "alphaStamp8", "bendDrift8", "rgb8", "drgb8"],
  };
  const headerBytes = Buffer.from(JSON.stringify(header), "utf8");
  const payload = Buffer.alloc(count * (2 + 2 + 1 + 1 + 1 + 1 + 1 + 3) + count * 3 * variants.length);

  let o = 0;
  for (const s of strokes) payload.writeUInt16LE(Math.min(65535, Math.round(s.x * 8)), (o += 2) - 2);
  for (const s of strokes) payload.writeUInt16LE(Math.min(65535, Math.round(s.y * 8)), (o += 2) - 2);
  for (const s of strokes) payload.writeUInt8(Math.min(255, Math.round(s.len * LEN_SCALE)), o++);
  for (const s of strokes) payload.writeUInt8(Math.min(255, Math.round(s.wid * LEN_SCALE)), o++);
  for (const s of strokes) {
    let a = s.angle;
    while (a < -Math.PI / 2) a += Math.PI;
    while (a >= Math.PI / 2) a -= Math.PI;
    payload.writeUInt8(Math.round(((a + Math.PI / 2) / Math.PI) * 255), o++);
  }
  for (const s of strokes) {
    const a4 = Math.round(clamp01(s.alpha) * 15);
    payload.writeUInt8((a4 << 4) | (s.stamp & 15), o++);
  }
  for (const s of strokes) {
    const b4 = Math.round(clamp01(s.bend * 0.5 + 0.5) * 15);
    const v4 = Math.round(clamp01(s.vdrift * 0.5 + 0.5) * 15);
    payload.writeUInt8((b4 << 4) | v4, o++);
  }
  for (const s of strokes) {
    payload.writeUInt8(s.color[0], o++);
    payload.writeUInt8(s.color[1], o++);
    payload.writeUInt8(s.color[2], o++);
  }
  for (const v of variants) {
    for (let i = 0; i < count; i++) {
      const m = strokes[i].color;
      const c = v.colors[i];
      for (let ch = 0; ch < 3; ch++) {
        payload.writeInt8(Math.max(-128, Math.min(127, c[ch] - m[ch])), o++);
      }
    }
  }

  const magic = Buffer.from("HERO");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32LE(headerBytes.length);
  return Buffer.concat([magic, lenBuf, headerBytes, payload]);
}

// ---------------------------------------------------------------------------
// rendering + diagnostics
// ---------------------------------------------------------------------------

/** Render the field. supersample=2 rasterizes at 2x and downsamples ONCE
 *  (gate-3 note A1 — no other smoothing exists anywhere in the pipeline).
 *  transparent=true leaves the ground unpainted — the painting floats and
 *  its dissolve IS the boundary; grain rides the paint only (source-atop). */
function renderField(strokes, w, h, stamps, colorOf, { grain = null, upTo = strokes.length, supersample = 1, transparent = false } = {}) {
  const ss = supersample;
  const canvas = createCanvas(w * ss, h * ss);
  const ctx = canvas.getContext("2d");
  const scratch = makeScratch();
  if (!transparent) {
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, w * ss, h * ss);
  }
  if (ss !== 1) ctx.scale(ss, ss);
  for (let i = 0; i < upTo; i++) {
    const s = strokes[i];
    const [r, g, b] = colorOf(s, i);
    drawStroke(ctx, s, r, g, b, stamps, scratch);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (grain) applyGrainAtop(ctx, grain, w * ss, h * ss, GRAIN_STRENGTH);
  if (ss === 1) return canvas;
  const out = createCanvas(w, h);
  out.getContext("2d").drawImage(canvas, 0, 0, w * ss, h * ss, 0, 0, w, h);
  return out;
}

/** Flatten a transparent render onto the site paper (for JPG/OG outputs). */
function flattenOnPaper(canvas, w, h) {
  const out = createCanvas(w, h);
  const ctx = out.getContext("2d");
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(canvas, 0, 0);
  return out;
}

/** High-frequency energy (mean |luminance - 4px boxblur|) over a crop —
 *  the local-contrast convergence metric from gate-3 note A5. */
function highPassEnergy(data, stride, imgW, crop) {
  const { x: cx, y: cy, w: cw, h: ch } = crop;
  const lum = new Float32Array(cw * ch);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const p = ((cy + y) * imgW + cx + x) * stride;
      lum[y * cw + x] = 0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2];
    }
  }
  const low = Float32Array.from(lum);
  boxBlur(low, cw, ch, 4, 2);
  let e = 0;
  for (let i = 0; i < lum.length; i++) e += Math.abs(lum[i] - low[i]);
  return e / lum.length;
}

/** % of interior pixels (outside the dissolve band) whose accumulated paint
 *  alpha is effectively opaque — the no-gaps contract (gate-2 rule 1). */
function coverageMetric(strokes, w, h, stamps, upTo) {
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");
  const scratch = makeScratch();
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < upTo; i++) {
    drawStroke(ctx, strokes[i], 255, 255, 255, stamps, scratch);
  }
  const data = ctx.getImageData(0, 0, w, h).data;
  const band = Math.ceil(EDGE_BAND * Math.min(w, h));
  let covered = 0, total = 0;
  for (let y = band; y < h - band; y += 2) {
    for (let x = band; x < w - band; x += 2) {
      total++;
      if (data[(y * w + x) * 4] >= 217) covered++; // ≈ paint alpha ≥ 0.85
    }
  }
  return covered / total;
}

/** Histogram stats: mean RGB + mean saturation, sampled. */
function imageStats(data, w, h, stride) {
  let r = 0, g = 0, b = 0, sat = 0, n = 0;
  for (let y = 0; y < h; y += 3) {
    for (let x = 0; x < w; x += 3) {
      const p = (y * w + x) * stride;
      const pr = data[p], pg = data[p + 1], pb = data[p + 2];
      r += pr;
      g += pg;
      b += pb;
      const mx = Math.max(pr, pg, pb);
      sat += mx > 0 ? (mx - Math.min(pr, pg, pb)) / mx : 0;
      n++;
    }
  }
  return { r: r / n, g: g / n, b: b / n, sat: sat / n };
}

const CROPS = [
  { name: "flags", x: 950, y: 10, w: 460, h: 300 },
  { name: "workers", x: 140, y: 560, w: 460, h: 300 },
  { name: "tower", x: 300, y: 60, w: 460, h: 300 },
];

/**
 * Animated replay preview at real pacing (gate-3 deliverable): the same
 * fast-attack/slow-finish tempo the player will use — count(τ) follows
 * 1-(1-τ)^2.2 — rendered at half res and encoded with ffmpeg-static.
 */
async function renderReplayVideo(ordered, w, h, stamps, grain, seconds, fps, outFile) {
  const scale = 0.5;
  const vw = Math.round((w * scale) / 2) * 2;
  const vh = Math.round((h * scale) / 2) * 2;
  const framesDir = path.join("/tmp", `hero-frames-${path.basename(outFile, ".mp4")}`);
  await mkdir(framesDir, { recursive: true });

  const acc = createCanvas(vw, vh);
  const actx = acc.getContext("2d");
  const scratch = makeScratch();
  actx.fillStyle = PAPER;
  actx.fillRect(0, 0, vw, vh);
  actx.scale(vw / w, vh / h);

  const frame = createCanvas(vw, vh);
  const fctx = frame.getContext("2d");

  const paintFrames = Math.round(seconds * fps);
  const holdFrames = Math.round(0.8 * fps);
  let drawn = 0;
  let fileIdx = 0;
  for (let f = 0; f < paintFrames + holdFrames; f++) {
    const tau = Math.min(1, f / (paintFrames - 1));
    const target = Math.round(ordered.length * (1 - Math.pow(1 - tau, 2.2)));
    while (drawn < target) {
      const s = ordered[drawn++];
      drawStroke(actx, s, s.color[0], s.color[1], s.color[2], stamps, scratch);
    }
    fctx.drawImage(acc, 0, 0);
    applyGrainAtop(fctx, grain, vw, vh, GRAIN_STRENGTH);
    await writeFile(
      path.join(framesDir, `f${String(fileIdx++).padStart(4, "0")}.png`),
      await frame.encode("png"),
    );
  }

  const res = spawnSync(ffmpegPath, [
    "-y", "-framerate", String(fps),
    "-i", path.join(framesDir, "f%04d.png"),
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "21",
    "-movflags", "+faststart",
    outFile,
  ], { stdio: "pipe" });
  if (res.status !== 0) {
    console.warn(`  ffmpeg failed for ${outFile}: ${res.stderr?.toString().slice(-300)}`);
  }
}

async function contactSheet(round, masterImg, renderCanvas, w, h, metrics) {
  const fullW = 720;
  const fullH = Math.round((h / w) * fullW);
  const pad = 16;
  const labelH = 30;
  const cropRowH = CROPS[0].h + labelH;
  const sheetW = pad * 3 + fullW * 2;
  const sheetH = pad * 2 + labelH + fullH + CROPS.length * (cropRowH + pad) + 40;

  const sheet = createCanvas(sheetW, sheetH);
  const ctx = sheet.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, sheetW, sheetH);
  ctx.fillStyle = "#0A2540";
  ctx.font = "16px monospace";

  const masterCanvas = createCanvas(w, h);
  masterCanvas.getContext("2d").drawImage(masterImg, 0, 0);

  ctx.fillText(`round ${round} — master`, pad, pad + 16);
  ctx.fillText("render", pad * 2 + fullW, pad + 16);
  ctx.drawImage(masterCanvas, 0, 0, w, h, pad, pad + labelH, fullW, fullH);
  ctx.drawImage(renderCanvas, 0, 0, w, h, pad * 2 + fullW, pad + labelH, fullW, fullH);

  let yCursor = pad + labelH + fullH + pad;
  for (const c of CROPS) {
    ctx.fillText(`${c.name} (1:1) — master / render`, pad, yCursor + 16);
    ctx.drawImage(masterCanvas, c.x, c.y, c.w, c.h, pad, yCursor + labelH, c.w, c.h);
    ctx.drawImage(renderCanvas, c.x, c.y, c.w, c.h, pad * 2 + c.w, yCursor + labelH, c.w, c.h);
    yCursor += cropRowH + pad;
  }
  ctx.fillText(metrics, pad, yCursor + 10);

  await writeFile(path.join(ROOT, "hero", `contact-sheet-${round}.png`), await sheet.encode("png"));
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  const roundArg = process.argv.indexOf("--round");
  const round = roundArg > -1 ? Number(process.argv[roundArg + 1]) : 1;

  const masterFile = path.join(SRC_DIR, "master.png");
  if (!existsSync(masterFile)) {
    console.error("hero/sources/master.png is required");
    process.exit(1);
  }
  await mkdir(OUT_DIR, { recursive: true });

  console.log("· stamps + grain");
  const stamps = generateStampSprite();
  await writeFile(path.join(OUT_DIR, "brush-stamps.png"), await stamps.encode("png"));
  const grain = generateGrainTile();
  await writeFile(path.join(OUT_DIR, "canvas-grain.png"), await grain.encode("png"));

  console.log("· loading master + analysis fields");
  const master = await loadRaw(masterFile);
  const { w, h } = master;
  const gray = toGray(master);
  const density = edgeDensity(gray, w, h);
  const random = rng(20260611);

  console.log("· toning wash");
  const washRef = await loadRaw(masterFile, 28);
  const wash = generateWash(washRef, w, h, random);

  console.log("· tier 0: tiled base coat (full coverage)");
  const tileGray = toGray(await loadRaw(masterFile, TILE_TIER.r * 0.55));
  const tileFields = { ...orientationField(tileGray, w, h, TILE_TIER.r * 0.9), density };
  const base = tileBaseCoat(master, tileFields, w, h, random);
  console.log(`  ${base.length} base strokes`);

  // working canvas accumulates what the replay will paint
  const work = createCanvas(w, h);
  const wctx = work.getContext("2d");
  const scratch = makeScratch();
  wctx.fillStyle = PAPER;
  wctx.fillRect(0, 0, w, h);
  for (const s of [...wash, ...base]) {
    drawStroke(wctx, s, s.color[0], s.color[1], s.color[2], stamps, scratch);
  }

  const baseCoverage = coverageMetric([...wash, ...base], w, h, stamps, wash.length + base.length);
  console.log(`  base-coat coverage (interior, paint alpha ≥.85): ${(baseCoverage * 100).toFixed(1)}%`);

  console.log("· error-driven refinement");
  const painted = [...base];
  for (let ti = 0; ti < REFINE_TIERS.length; ti++) {
    const tier = { ...REFINE_TIERS[ti], index: ti + 1 };
    const sigma = ti === REFINE_TIERS.length - 1 ? 0 : tier.r * 0.55;
    const ref = await loadRaw(masterFile, sigma);
    const refGray = toGray(ref);
    const fields = { ...orientationField(refGray, w, h, tier.r * 0.9), density };
    const strokes = refineTier(wctx, tier, master, ref, fields, w, h, random);
    for (const s of strokes) {
      drawStroke(wctx, s, s.color[0], s.color[1], s.color[2], stamps, scratch);
    }
    painted.push(...strokes);
    console.log(`  tier r=${tier.r}: ${strokes.length} strokes`);
  }

  const lowMaster = await loadRaw(masterFile, 6);

  // unsharp the finest refine tier against the local low-pass
  for (const s of painted) {
    if (s.tier !== 3) continue;
    const lp = (Math.round(s.y) * w + Math.round(s.x)) * 3;
    for (let ch = 0; ch < 3; ch++) {
      s.color[ch] = clamp255(
        Math.round(lowMaster.data[lp + ch] + (s.color[ch] - lowMaster.data[lp + ch]) * FINE_PUNCH),
      );
    }
  }

  console.log("· crisp-touch tier (hard register, median color, punched)");
  {
    const fineGray = toGray(master);
    const fields = { ...orientationField(fineGray, w, h, 2.5), density };
    const crisp = crispTier(wctx, master, lowMaster, fields, w, h, random, stamps, scratch);
    painted.push(...crisp);
    console.log(`  ${crisp.length} crisp touches`);
  }
  const total = wash.length + painted.length;
  console.log(`  ${total} strokes total`);

  console.log("· ordering (wash → base coat → refinement → accents)");
  const { ordered, accentStart, accentCount } = orderStrokes(wash, painted, random);
  console.log(`  ${accentCount} accents start at ${(accentStart * 100).toFixed(1)}% (contract ≥ 80%)`);

  console.log("· variant color fields (footprint-averaged)");
  const variants = [];
  for (const name of ["dusk", "rain", "snow"]) {
    const file = path.join(SRC_DIR, `variant-${name}.png`);
    if (!existsSync(file)) {
      console.log(`  variant-${name}.png absent — skipped`);
      continue;
    }
    const score = await registrationScore(masterFile, file);
    if (score < 0.35) {
      console.warn(`  WARNING: variant-${name} correlation ${score.toFixed(2)} — misregistered? NOT shipped.`);
      continue;
    }
    const img = await loadRaw(file);
    if (img.w !== w || img.h !== h) {
      console.warn(`  WARNING: variant-${name} is ${img.w}x${img.h} (master ${w}x${h}) — skipped`);
      continue;
    }
    const colors = ordered.map((s) => averageColor(img, s.samples));
    variants.push({ name, colors });
    console.log(`  variant-${name} sampled (registration ${score.toFixed(2)})`);
  }

  // Global value calibration: stamp-alpha layering over paper + the grain
  // overlay drift the render slightly dark; measure on a half-res render and
  // correct every color field with clamped per-channel gains so the render's
  // histogram matches the master's (gate-2 rule 4).
  console.log("· value calibration");
  {
    const cw = Math.round(w / 2), ch = Math.round(h / 2);
    const cal = createCanvas(cw, ch);
    const cctx = cal.getContext("2d");
    const cscratch = makeScratch();
    cctx.fillStyle = PAPER;
    cctx.fillRect(0, 0, cw, ch);
    cctx.scale(0.5, 0.5);
    for (const s of ordered) drawStroke(cctx, s, s.color[0], s.color[1], s.color[2], stamps, cscratch);
    cctx.setTransform(1, 0, 0, 1, 0, 0);
    applyGrainAtop(cctx, grain, cw, ch, GRAIN_STRENGTH);
    const calData = cctx.getImageData(0, 0, cw, ch).data;
    const cs = imageStats(calData, cw, ch, 4);
    const msFull = imageStats(master.data, w, h, 3);
    const gain = [
      Math.min(1.1, Math.max(0.92, msFull.r / cs.r)),
      Math.min(1.1, Math.max(0.92, msFull.g / cs.g)),
      Math.min(1.1, Math.max(0.92, msFull.b / cs.b)),
    ];
    // wet-blend stacking dilutes chroma below what the stroke colors carry;
    // scale chroma so the rendered histogram lands ON the master's (never
    // beyond it — match, not amplify)
    const satGain = Math.min(1.45, Math.max(1, msFull.sat / cs.sat));
    console.log(
      `  per-channel gain ${gain.map((v) => v.toFixed(3)).join(" / ")}, chroma ×${satGain.toFixed(3)}`,
    );
    const apply = (c) => {
      let r = c[0] * gain[0];
      let g = c[1] * gain[1];
      let b = c[2] * gain[2];
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r = lum + (r - lum) * satGain;
      g = lum + (g - lum) * satGain;
      b = lum + (b - lum) * satGain;
      c[0] = clamp255(Math.round(r));
      c[1] = clamp255(Math.round(g));
      c[2] = clamp255(Math.round(b));
    };
    for (const s of ordered) apply(s.color);
    for (const v of variants) for (const c of v.colors) apply(c);
  }

  console.log("· packing strokes.bin");
  const bin = packStrokes(ordered, variants, w, h, wash.length);
  await writeFile(path.join(OUT_DIR, "strokes.bin"), bin);
  const gz = zlib.gzipSync(bin).length;
  const gzKb = Math.round(gz / 1024);
  console.log(
    `  ${Math.round(bin.length / 1024)} KB raw, ${gzKb} KB gzipped (budget ${SIZE_BUDGET_KB} KB) ` +
      `${gz <= SIZE_BUDGET_KB * 1024 ? "OK" : "OVER — note in session log"}`,
  );

  console.log("· rendering final frames (2x supersampled, transparent + flattened)");
  const masterFloat = renderField(ordered, w, h, stamps, (s) => s.color, { grain, supersample: 2, transparent: true });
  await writeFile(path.join(OUT_DIR, "final-master.webp"), await masterFloat.encode("webp", 82));
  const masterCanvas = flattenOnPaper(masterFloat, w, h);
  await writeFile(path.join(OUT_DIR, "final-master.jpg"), await masterCanvas.encode("jpeg", 86));
  for (const v of variants) {
    const float = renderField(ordered, w, h, stamps, (_s, i) => v.colors[i], { grain, supersample: 2, transparent: true });
    await writeFile(path.join(OUT_DIR, `final-${v.name}.webp`), await float.encode("webp", 82));
    await writeFile(path.join(OUT_DIR, `final-${v.name}.jpg`), await flattenOnPaper(float, w, h).encode("jpeg", 84));
  }

  const fullCoverage = coverageMetric(ordered, w, h, stamps, ordered.length);
  console.log(`  full coverage (interior): ${(fullCoverage * 100).toFixed(1)}%`);

  // color fidelity + local-contrast stats
  const renderData = masterCanvas.getContext("2d").getImageData(0, 0, w, h).data;
  const ms = imageStats(master.data, w, h, 3);
  const rs = imageStats(renderData, w, h, 4);
  const hpParts = CROPS.map((c) => {
    const m = highPassEnergy(master.data, 3, w, c);
    const r = highPassEnergy(renderData, 4, w, c);
    return `${c.name} ${(r / m * 100).toFixed(0)}%`;
  });
  const statLine =
    `coverage ${(fullCoverage * 100).toFixed(1)}% | mean RGB master (${ms.r.toFixed(0)},${ms.g.toFixed(0)},${ms.b.toFixed(0)}) ` +
    `render (${rs.r.toFixed(0)},${rs.g.toFixed(0)},${rs.b.toFixed(0)}) | sat master ${(ms.sat * 100).toFixed(1)}% render ${(rs.sat * 100).toFixed(1)}% | ` +
    `high-pass (target ≥80%): ${hpParts.join(", ")} | ${total} strokes, ${gzKb} KB gz`;
  console.log(`  ${statLine}`);

  console.log("· contact sheet");
  const masterImg = await loadImage(masterFile);
  await contactSheet(round, masterImg, masterCanvas, w, h, statLine);

  // og.jpg
  const ogW = 1200, ogH = 630;
  const og = createCanvas(ogW, ogH);
  const ogCtx = og.getContext("2d");
  const scale = Math.max(ogW / w, ogH / h);
  ogCtx.fillStyle = PAPER;
  ogCtx.fillRect(0, 0, ogW, ogH);
  ogCtx.drawImage(masterCanvas, (ogW - w * scale) / 2, (ogH - h * scale) / 2 - h * scale * 0.04, w * scale, h * scale);
  await writeFile(path.join(OUT_DIR, "og.jpg"), await og.encode("jpeg", 84));

  // pentimento layer
  const under = await loadImage(path.join(SRC_DIR, "underdrawing.png"));
  const uc = createCanvas(w, h);
  uc.getContext("2d").drawImage(under, 0, 0);
  await writeFile(path.join(OUT_DIR, "underdrawing.jpg"), await uc.encode("jpeg", 80));

  // order heatmap (early = light, late = dark)
  console.log("· order heatmap");
  const heat = createCanvas(w, h);
  const hctx = heat.getContext("2d");
  const hscratch = makeScratch();
  hctx.fillStyle = "#ffffff";
  hctx.fillRect(0, 0, w, h);
  ordered.forEach((s, i) => {
    const t = i / (ordered.length - 1);
    const v = Math.round(lerp(235, 18, t));
    drawStroke(hctx, { ...s, alpha: 0.9 }, v, v, v, stamps, hscratch);
  });
  await writeFile(path.join(ROOT, "hero", "order-heatmap.png"), await heat.encode("png"));

  console.log("· replay previews (real tempo + fast)");
  await renderReplayVideo(ordered, w, h, stamps, grain, 5.5, 30, path.join(ROOT, "hero", "replay-preview.mp4"));
  await renderReplayVideo(ordered, w, h, stamps, grain, 1.5, 30, path.join(ROOT, "hero", "replay-fast.mp4"));

  console.log(`· done — ${ordered.length} strokes, ${variants.length + 1} color fields, round ${round}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
