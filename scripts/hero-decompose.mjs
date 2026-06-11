// hero-decompose.mjs — offline decomposition of the homepage hero painting
// into an ordered brush-stroke field (spec: hero/HERO.md Phase 1, reworked
// per Rob's gate notes 2026-06-11: Hertzmann-style multi-size error-driven
// refinement, structure-tensor orientation everywhere, computed replay order
// with toning wash + forced-late accents, order heatmap).
//
// Reads  hero/sources/{master,variant-*,underdrawing}.png
// Writes public/hero/strokes.bin            (JSON header + quantized SoA arrays)
//        public/hero/final-{variant}.jpg    (stroke render baked on site paper)
//        public/hero/og.jpg                 (1200x630 crop of final-master)
//        public/hero/underdrawing.jpg       (pentimento layer)
//        hero/order-heatmap.png             (replay order: early=light, late=dark)
//
// Run: node scripts/hero-decompose.mjs
//
// The dab geometry (capsule = roundRect with full-radius ends) MUST stay in
// sync with the browser renderer in src/components/hero/HeroPainting.tsx.

import { createCanvas, loadImage } from "@napi-rs/canvas";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import zlib from "node:zlib";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC_DIR = path.join(ROOT, "hero", "sources");
const OUT_DIR = path.join(ROOT, "public", "hero");

/** Site paper the hero dissolves into (homepage background). */
const PAPER = "#eee8da";
const PAPER_RGB = [238, 232, 218];

// Refinement tiers: brush radius (px at source res), error floor a cell must
// exceed to be a candidate (mean RGB distance, 0..441), and a per-tier cap —
// candidates are sorted by error so the cap keeps the WORST regions first.
// Caps land the total in Rob's 25-40k window.
const TIERS = [
  { r: 24, t: 26, cap: 2200 },
  { r: 12, t: 28, cap: 4200 },
  { r: 6, t: 32, cap: 9000 },
  { r: 3, t: 40, cap: 20000 },
];
const WASH_SPACING = 52; // toning-wash grid spacing (px)
const ACCENT_TAIL = 0.15; // accents own the final 15% of the order
const ORDER_PASSES = 8; // spatial sweep passes inside each tier

// ---------------------------------------------------------------------------
// small numeric helpers
// ---------------------------------------------------------------------------

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
const lerp = (a, b, t) => a + (b - a) * t;

/** Deterministic PRNG so re-runs produce identical output (mulberry32). */
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

/** Cheap value noise in [0,1] (edge dissolve modulation). */
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

/** In-place separable box blur on a Float32Array field (3 passes ~ gaussian). */
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

/**
 * Structure tensor orientation + coherence at an integration scale suited to
 * the tier's brush radius — coarse tiers read broad form (the viaduct's axis),
 * fine tiers read local contours (a figure's silhouette). Returns the angle of
 * the local EDGE DIRECTION (gradient + 90°) in [-PI/2, PI/2) and coherence
 * [0,1]. Strokes follow form: horizontal on water, vertical on figures —
 * no global lean anywhere (Rob's gate note #2).
 */
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

/** Edge density field (Sobel magnitude, heavily blurred, p95-normalized). */
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

/** 3x3 per-channel median color (tolerates small variant misregistration). */
function medianColor(img, x, y) {
  const { data, w, h } = img;
  const rs = [], gs = [], bs = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const px = Math.min(w - 1, Math.max(0, x + dx));
      const py = Math.min(h - 1, Math.max(0, y + dy));
      const p = (py * w + px) * 3;
      rs.push(data[p]);
      gs.push(data[p + 1]);
      bs.push(data[p + 2]);
    }
  }
  const med = (arr) => {
    arr.sort((a, b) => a - b);
    return arr[4];
  };
  return [med(rs), med(gs), med(bs)];
}

/** Structural similarity (downsampled luminance correlation) — flags gross
 *  misregistration of a variant. */
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
// dab rendering (kept in sync with HeroPainting.tsx)
// ---------------------------------------------------------------------------

export function drawDab(ctx, x, y, len, wid, angle, r, g, b, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.beginPath();
  ctx.roundRect(-len / 2, -wid / 2, len, wid, wid / 2);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// stroke generation
// ---------------------------------------------------------------------------

/** Painterly alpha falloff toward the canvas edges, applied at placement so
 *  the working canvas (which drives the error refinement) is the truth.
 *  Returns the dissolved alpha, or 0 if the stroke should be skipped. */
function dissolveAlpha(x, y, w, h, alpha) {
  const band = 0.085 * Math.min(w, h);
  const d = Math.min(x, y, w - x, h - y) / band;
  if (d >= 1) return alpha;
  const noise = valueNoise2(x * 0.016, y * 0.016);
  const a = alpha * Math.pow(clamp01(d + (noise - 0.5) * 0.55), 1.5);
  return a < 0.05 ? 0 : a;
}

/**
 * Toning wash (Rob's order rule a): a dedicated opening tier of very pale,
 * low-opacity broad strokes covering the whole canvas, so no intermediate
 * frame ever shows raw paper holes. Colors are the heavily blurred master
 * pulled most of the way toward paper.
 */
function generateWash(blurred, w, h, random) {
  const strokes = [];
  for (let gy = WASH_SPACING / 2; gy < h + WASH_SPACING / 2; gy += WASH_SPACING) {
    for (let gx = WASH_SPACING / 2; gx < w + WASH_SPACING / 2; gx += WASH_SPACING) {
      const x = Math.min(w - 2, gx + (random() - 0.5) * WASH_SPACING * 0.6);
      const y = Math.min(h - 2, gy + (random() - 0.5) * WASH_SPACING * 0.6);
      const p = (Math.round(y) * w + Math.round(x)) * 3;
      const mix = 0.62; // toward paper
      const color = [
        clamp255(Math.round(lerp(blurred.data[p], PAPER_RGB[0], mix))),
        clamp255(Math.round(lerp(blurred.data[p + 1], PAPER_RGB[1], mix))),
        clamp255(Math.round(lerp(blurred.data[p + 2], PAPER_RGB[2], mix))),
      ];
      const alpha = dissolveAlpha(x, y, w, h, lerp(0.42, 0.55, random()));
      if (alpha === 0) continue;
      const wid = WASH_SPACING * lerp(1.05, 1.35, random());
      strokes.push({
        x, y,
        wid,
        len: wid * lerp(1.5, 2.1, random()),
        angle: (random() - 0.5) * Math.PI, // no lean: fully scattered
        color,
        alpha,
        tier: -1,
        coh: 0,
        density: 0,
      });
    }
  }
  return strokes;
}

/**
 * One Hertzmann refinement tier: compare the working canvas against the
 * tier-blurred reference on a grid of the brush radius; where a cell's mean
 * error exceeds the tier threshold, place a stroke at the cell's worst pixel,
 * colored and oriented from the tier-scale fields, then paint it onto the
 * working canvas so later tiers only fix what still reads wrong.
 */
function refineTier(ctx, tier, ref, fields, w, h, random) {
  const { r, t, cap } = tier;
  const canvasData = ctx.getImageData(0, 0, w, h).data; // RGBA
  const refData = ref.data; // RGB
  const grid = Math.max(2, Math.round(r * 1.15));

  // pass 1: score every grid cell against the tier reference
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

  // pass 2: worst cells first, up to the tier cap
  candidates.sort((a, b) => b.err - a.err);
  const strokes = [];
  for (const cand of candidates) {
    if (strokes.length >= cap) break;
    const { wx, wy } = cand;
    const i = wy * w + wx;
    const coh = fields.coh[i];
    const density = fields.density[i];
    const wid = r * 2 * lerp(0.85, 1.15, random());
    const len = wid * (1.5 + 2.2 * coh) * lerp(0.85, 1.15, random());
    // form-following: tensor angle where the neighborhood is coherent,
    // fully random where it is not — never a global lean
    const angle =
      coh > 0.09
        ? fields.angle[i] + (random() - 0.5) * lerp(0.55, 0.12, clamp01(coh * 1.6))
        : (random() - 0.5) * Math.PI;
    const p3 = i * 3;
    const color = [refData[p3], refData[p3 + 1], refData[p3 + 2]];
    const alpha = dissolveAlpha(wx, wy, w, h, lerp(0.92, 1, random()));
    if (alpha === 0) continue;

    const s = { x: wx, y: wy, wid, len, angle, color, alpha, tier: tier.index, coh, density };
    strokes.push(s);
    drawDab(ctx, s.x, s.y, s.len, s.wid, s.angle, color[0], color[1], color[2], alpha);
  }
  return strokes;
}

// ---------------------------------------------------------------------------
// replay ordering (Rob's gate note #3 — computed, no hand-made map)
// ---------------------------------------------------------------------------

/** Accent test: high-saturation warm (the red/orange flag, bunting, train
 *  hues) OR darkest value decile (set by caller) — forced into the tail. */
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
  return hue <= 55 || hue >= 330; // reds through oranges
}

function orderStrokes(wash, painted, random) {
  // darkest value decile across painted strokes
  const values = painted.map((s) => Math.max(s.color[0], s.color[1], s.color[2]));
  const sortedV = [...values].sort((a, b) => a - b);
  const darkCut = sortedV[Math.floor(sortedV.length * 0.1)];

  const accents = [];
  const middle = [];
  painted.forEach((s, i) => {
    if (isWarmAccent(s.color) || values[i] <= darkCut) accents.push(s);
    else middle.push(s);
  });

  // The warm-accent rule is absolute (nothing red/orange before the 80% mark)
  // but the dark decile is the flexible class: if the combined tail would
  // start before 80%, demote the lightest dark accents back into the middle.
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

  // middle: background-to-foreground inside each size tier — light early,
  // calm early, sky early; loose spatial sweeps + jitter inside each pass
  const jitterKey = (s) => {
    const v = Math.sin(s.x * 12.9898 + s.y * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  const tierGroups = new Map();
  for (const s of middle) {
    if (!tierGroups.has(s.tier)) tierGroups.set(s.tier, []);
    tierGroups.get(s.tier).push(s);
  }
  const orderedMiddle = [];
  for (const tierIdx of [...tierGroups.keys()].sort((a, b) => a - b)) {
    const group = tierGroups.get(tierIdx);
    const scored = group.map((s) => {
      const lum = (0.2126 * s.color[0] + 0.7152 * s.color[1] + 0.0722 * s.color[2]) / 255;
      const score =
        0.45 * (1 - lum) + 0.3 * s.density + 0.25 * (s.y / 1000);
      return { s, score };
    });
    scored.sort((a, b) => a.score - b.score);
    const n = scored.length;
    for (let p = 0; p < ORDER_PASSES; p++) {
      const from = Math.floor((p / ORDER_PASSES) * n);
      const to = Math.floor(((p + 1) / ORDER_PASSES) * n);
      const pass = scored.slice(from, to);
      const dir = p % 2 === 0 ? 1 : -1;
      pass.sort(
        (a, b) =>
          dir * (a.s.x + a.s.y * 0.3) + (jitterKey(a.s) - 0.5) * 260 -
          (dir * (b.s.x + b.s.y * 0.3) + (jitterKey(b.s) - 0.5) * 260),
      );
      orderedMiddle.push(...pass.map((e) => e.s));
    }
  }

  // accents: dark masses settle in first, warm color lands at the very end;
  // generation order is preserved within each class so overlaps stay correct
  const darkAccents = accents.filter((s) => !isWarmAccent(s.color));
  const warmAccents = accents.filter((s) => isWarmAccent(s.color));
  const softShuffle = (arr) => {
    for (let i = 0; i < arr.length; i++) {
      const j = Math.min(arr.length - 1, i + Math.floor(random() * 24));
      if (arr[i].tier === arr[j].tier) [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const ordered = [
    ...wash,
    ...orderedMiddle,
    ...softShuffle(darkAccents),
    ...softShuffle(warmAccents),
  ];

  // verify the accent tail actually fits the contract (final ~15%)
  const accentStart = (wash.length + orderedMiddle.length) / ordered.length;
  return { ordered, accentStart, accentCount: accents.length };
}

// ---------------------------------------------------------------------------
// packing
// ---------------------------------------------------------------------------

function packStrokes(strokes, variants, w, h, washCount) {
  const count = strokes.length;
  const header = {
    version: 2,
    count,
    width: w,
    height: h,
    washCount,
    variants: ["master", ...variants.map((v) => v.name)],
    // SoA layout: x u16 (px*8), y u16 (px*8), len u8 (px*2), wid u8 (px*2),
    // angle u8 (-PI/2..PI/2), alpha u8, master rgb u8*3, then per extra
    // variant rgb stored as int8 DELTAS from master (gzip-friendly).
    fields: ["x16", "y16", "len8", "wid8", "ang8", "alpha8", "rgb8", "drgb8"],
  };
  const headerBytes = Buffer.from(JSON.stringify(header), "utf8");
  const payload = Buffer.alloc(count * (2 + 2 + 1 + 1 + 1 + 1 + 3) + count * 3 * variants.length);

  let o = 0;
  for (const s of strokes) payload.writeUInt16LE(Math.round(s.x * 8), (o += 2) - 2);
  for (const s of strokes) payload.writeUInt16LE(Math.round(s.y * 8), (o += 2) - 2);
  for (const s of strokes) payload.writeUInt8(Math.min(255, Math.round(s.len * 2)), o++);
  for (const s of strokes) payload.writeUInt8(Math.min(255, Math.round(s.wid * 2)), o++);
  for (const s of strokes) {
    let a = s.angle;
    while (a < -Math.PI / 2) a += Math.PI;
    while (a >= Math.PI / 2) a -= Math.PI;
    payload.writeUInt8(Math.round(((a + Math.PI / 2) / Math.PI) * 255), o++);
  }
  for (const s of strokes) payload.writeUInt8(Math.round(s.alpha * 255), o++);
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
// main
// ---------------------------------------------------------------------------

function renderField(strokes, w, h, colorOf) {
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);
  strokes.forEach((s, i) => {
    const [r, g, b] = colorOf(s, i);
    drawDab(ctx, s.x, s.y, s.len, s.wid, s.angle, r, g, b, s.alpha);
  });
  return canvas;
}

async function main() {
  const masterFile = path.join(SRC_DIR, "master.png");
  if (!existsSync(masterFile)) {
    console.error("hero/sources/master.png is required");
    process.exit(1);
  }
  await mkdir(OUT_DIR, { recursive: true });

  console.log("· loading master + analysis fields");
  const master = await loadRaw(masterFile);
  const { w, h } = master;
  const gray = toGray(master);
  const density = edgeDensity(gray, w, h);

  const random = rng(20260611);

  console.log("· toning wash");
  const washRef = await loadRaw(masterFile, 28);
  const wash = generateWash(washRef, w, h, random);
  console.log(`  ${wash.length} wash strokes`);

  // working canvas accumulates exactly what the replay will paint
  const work = createCanvas(w, h);
  const wctx = work.getContext("2d");
  wctx.fillStyle = PAPER;
  wctx.fillRect(0, 0, w, h);
  for (const s of wash) {
    drawDab(wctx, s.x, s.y, s.len, s.wid, s.angle, s.color[0], s.color[1], s.color[2], s.alpha);
  }

  console.log("· error-driven refinement");
  const painted = [];
  const tierRefs = []; // kept for variant resampling at matching blur
  for (let ti = 0; ti < TIERS.length; ti++) {
    const tier = { ...TIERS[ti], index: ti };
    const sigma = Math.max(0.4, tier.r * 0.55);
    const ref = await loadRaw(masterFile, ti === TIERS.length - 1 ? 0 : sigma);
    tierRefs.push({ sigma: ti === TIERS.length - 1 ? 0 : sigma });
    const refGray = toGray(ref);
    const fields = {
      ...orientationField(refGray, w, h, tier.r * 0.9),
      density,
    };
    const strokes = refineTier(wctx, tier, ref, fields, w, h, random);
    painted.push(...strokes);
    console.log(`  tier r=${tier.r}: ${strokes.length} strokes`);
  }
  const total = wash.length + painted.length;
  console.log(`  ${total} strokes total ${total < 25000 || total > 40000 ? "(OUTSIDE 25-40k window)" : "(in 25-40k window)"}`);

  console.log("· ordering (wash → background-to-foreground → accents)");
  const { ordered, accentStart, accentCount } = orderStrokes(wash, painted, random);
  console.log(
    `  ${accentCount} accent strokes start at ${(accentStart * 100).toFixed(1)}% ` +
      `(contract: ≥ 80%; tail target ~${100 - ACCENT_TAIL * 100}%)`,
  );

  console.log("· variant color fields");
  const variantNames = ["dusk", "rain", "snow"];
  const variants = [];
  for (const name of variantNames) {
    const file = path.join(SRC_DIR, `variant-${name}.png`);
    if (!existsSync(file)) {
      console.log(`  variant-${name}.png absent — skipped`);
      continue;
    }
    const score = await registrationScore(masterFile, file);
    if (score < 0.35) {
      console.warn(
        `  WARNING: variant-${name}.png structural correlation ${score.toFixed(2)} — ` +
          `grossly misregistered? Flagging for Rob; NOT shipped.`,
      );
      continue;
    }
    // sample at each stroke's tier-matched blur so broad strokes take area
    // color and fine strokes take local color, exactly like the master pass
    const colors = new Array(ordered.length);
    const bySigma = new Map();
    ordered.forEach((s, i) => {
      const sigma = s.tier === -1 ? 28 : tierRefs[s.tier].sigma;
      if (!bySigma.has(sigma)) bySigma.set(sigma, []);
      bySigma.get(sigma).push(i);
    });
    for (const [sigma, idxs] of bySigma) {
      const img = await loadRaw(file, sigma);
      if (img.w !== w || img.h !== h) {
        console.warn(`  WARNING: variant-${name}.png is ${img.w}x${img.h}, master is ${w}x${h} — skipped`);
        bySigma.clear();
        break;
      }
      for (const i of idxs) {
        const s = ordered[i];
        colors[i] =
          sigma === 0
            ? medianColor(img, Math.round(s.x), Math.round(s.y))
            : (() => {
                const p = (Math.round(s.y) * w + Math.round(s.x)) * 3;
                return [img.data[p], img.data[p + 1], img.data[p + 2]];
              })();
      }
    }
    if (bySigma.size === 0) continue;
    variants.push({ name, colors });
    console.log(`  variant-${name} sampled (registration ${score.toFixed(2)})`);
  }

  console.log("· packing strokes.bin");
  const bin = packStrokes(ordered, variants, w, h, wash.length);
  await writeFile(path.join(OUT_DIR, "strokes.bin"), bin);
  const gz = zlib.gzipSync(bin).length;
  console.log(
    `  ${(bin.length / 1024).toFixed(0)} KB raw, ${(gz / 1024).toFixed(0)} KB gzipped ` +
      `(budget 600 KB) ${gz <= 600 * 1024 ? "OK" : "OVER BUDGET"}`,
  );

  console.log("· rendering final frames");
  const masterCanvas = renderField(ordered, w, h, (s) => s.color);
  await writeFile(path.join(OUT_DIR, "final-master.jpg"), await masterCanvas.encode("jpeg", 84));
  for (const v of variants) {
    const canvas = renderField(ordered, w, h, (_s, i) => v.colors[i]);
    await writeFile(path.join(OUT_DIR, `final-${v.name}.jpg`), await canvas.encode("jpeg", 84));
  }

  // og.jpg — 1200x630 crop, slight up-bias toward the flags
  const ogW = 1200, ogH = 630;
  const og = createCanvas(ogW, ogH);
  const ogCtx = og.getContext("2d");
  const scale = Math.max(ogW / w, ogH / h);
  ogCtx.fillStyle = PAPER;
  ogCtx.fillRect(0, 0, ogW, ogH);
  ogCtx.drawImage(
    masterCanvas,
    (ogW - w * scale) / 2,
    (ogH - h * scale) / 2 - h * scale * 0.04,
    w * scale,
    h * scale,
  );
  await writeFile(path.join(OUT_DIR, "og.jpg"), await og.encode("jpeg", 84));

  // pentimento layer
  const under = await loadImage(path.join(SRC_DIR, "underdrawing.png"));
  const uc = createCanvas(w, h);
  uc.getContext("2d").drawImage(under, 0, 0);
  await writeFile(path.join(OUT_DIR, "underdrawing.jpg"), await uc.encode("jpeg", 80));

  // order heatmap for Rob: early = light, late = dark
  console.log("· order heatmap");
  const heat = createCanvas(w, h);
  const hctx = heat.getContext("2d");
  hctx.fillStyle = "#ffffff";
  hctx.fillRect(0, 0, w, h);
  ordered.forEach((s, i) => {
    const t = i / (ordered.length - 1);
    const v = Math.round(lerp(235, 18, t));
    drawDab(hctx, s.x, s.y, s.len, s.wid, s.angle, v, v, v, 0.9);
  });
  await writeFile(path.join(ROOT, "hero", "order-heatmap.png"), await heat.encode("png"));

  console.log(`· done — ${ordered.length} strokes, ${variants.length + 1} color fields`);
}

// Run only when executed directly (hero-proof.mjs imports drawDab from here).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
