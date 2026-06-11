// hero-decompose.mjs — offline decomposition of the homepage hero painting
// into an ordered brush-stroke field (spec: hero/HERO.md, Phase 1).
//
// Reads  hero/sources/{master,variant-*,underdrawing}.png
// Writes public/hero/strokes.bin            (JSON header + quantized SoA arrays)
//        public/hero/final-{variant}.jpg    (stroke render baked on site paper)
//        public/hero/og.jpg                 (1200x630 crop of final-master)
//        public/hero/underdrawing.jpg       (pentimento layer, q80)
//
// Run: node scripts/hero-decompose.mjs
//
// The dab geometry here (capsule = roundRect with full-radius ends) MUST stay
// in sync with the browser renderer in src/components/hero/HeroPainting.tsx.

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

const TARGET_STROKES = 12500; // spec window: 8-15k
const ORDER_PASSES = 18;

// ---------------------------------------------------------------------------
// small numeric helpers
// ---------------------------------------------------------------------------

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
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

/** Cheap tileable value noise in [0,1] (for the edge dissolve). */
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
  const tmp = new Float32Array(field.length);
  for (let p = 0; p < passes; p++) {
    // horizontal
    for (let y = 0; y < h; y++) {
      let acc = 0;
      const row = y * w;
      for (let x = -radius; x <= radius; x++) acc += field[row + Math.min(w - 1, Math.max(0, x))];
      const n = radius * 2 + 1;
      for (let x = 0; x < w; x++) {
        tmp[row + x] = acc / n;
        const xAdd = Math.min(w - 1, x + radius + 1);
        const xSub = Math.max(0, x - radius);
        acc += field[row + xAdd] - field[row + xSub];
      }
    }
    // vertical
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let y = -radius; y <= radius; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
      const n = radius * 2 + 1;
      for (let y = 0; y < h; y++) {
        field[y * w + x] = acc / n;
        const yAdd = Math.min(h - 1, y + radius + 1);
        const ySub = Math.max(0, y - radius);
        acc += tmp[yAdd * w + x] - tmp[ySub * w + x];
      }
    }
  }
}

// ---------------------------------------------------------------------------
// image loading + analysis
// ---------------------------------------------------------------------------

async function loadRaw(file) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
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

/** Sobel gradients + magnitude. */
function sobel(gray, w, h) {
  const gx = new Float32Array(w * h);
  const gy = new Float32Array(w * h);
  const mag = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const a = gray[i - w - 1], b = gray[i - w], c = gray[i - w + 1];
      const d = gray[i - 1], f = gray[i + 1];
      const g2 = gray[i + w - 1], h2 = gray[i + w], k = gray[i + w + 1];
      const sx = c + 2 * f + k - (a + 2 * d + g2);
      const sy = g2 + 2 * h2 + k - (a + 2 * b + c);
      gx[i] = sx;
      gy[i] = sy;
      mag[i] = Math.hypot(sx, sy);
    }
  }
  return { gx, gy, mag };
}

/**
 * Structure tensor orientation + coherence. Returns per-pixel angle of the
 * LOCAL EDGE DIRECTION (along contours, i.e. gradient + 90°) in [-PI/2, PI/2),
 * and coherence in [0,1] (how strongly oriented the neighborhood is).
 */
function orientationField(gx, gy, w, h) {
  const jxx = new Float32Array(w * h);
  const jyy = new Float32Array(w * h);
  const jxy = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    jxx[i] = gx[i] * gx[i];
    jyy[i] = gy[i] * gy[i];
    jxy[i] = gx[i] * gy[i];
  }
  boxBlur(jxx, w, h, 5, 3);
  boxBlur(jyy, w, h, 5, 3);
  boxBlur(jxy, w, h, 5, 3);
  const angle = new Float32Array(w * h);
  const coh = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const gradAngle = 0.5 * Math.atan2(2 * jxy[i], jxx[i] - jyy[i]);
    let a = gradAngle + Math.PI / 2; // along the edge
    if (a >= Math.PI / 2) a -= Math.PI;
    angle[i] = a;
    const tr = jxx[i] + jyy[i];
    const det = Math.sqrt((jxx[i] - jyy[i]) ** 2 + 4 * jxy[i] * jxy[i]);
    coh[i] = tr > 1e-6 ? det / tr : 0;
  }
  return { angle, coh };
}

/** Percentile of a Float32Array (sampled, for normalization). */
function percentile(field, p) {
  const n = 4096;
  const step = Math.max(1, Math.floor(field.length / n));
  const sample = [];
  for (let i = 0; i < field.length; i += step) sample.push(field[i]);
  sample.sort((a, b) => a - b);
  return sample[Math.min(sample.length - 1, Math.floor(p * sample.length))];
}

/** 3x3 per-channel median color at (x, y). */
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

/** Structural similarity check between master and a variant (edge-map
 *  correlation on a downsample) — flags gross misregistration. */
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
// stroke sampling
// ---------------------------------------------------------------------------

/**
 * Variable-density dart throwing: spacing radius shrinks where edge density
 * is high (figures, scaffolds) and grows where it is calm (sky, water), so
 * calm regions get few broad strokes and detailed regions many small ones.
 */
function sampleStrokes(master, fields, random) {
  const { w, h } = master;
  const { density, angle, coh } = fields;

  const R_MIN = 4.2;
  const R_MAX = 27;
  const radiusAt = (x, y) => {
    const d = density[y * w + x];
    return lerp(R_MAX, R_MIN, Math.pow(d, 0.7));
  };

  // hash grid for neighborhood queries
  const cell = R_MIN;
  const gw = Math.ceil(w / cell);
  const gh = Math.ceil(h / cell);
  const grid = new Map(); // cellIndex -> array of point indices
  const pts = [];

  const fits = (x, y, r) => {
    const reach = Math.ceil((r + R_MAX) / cell);
    const cx = Math.floor(x / cell);
    const cy = Math.floor(y / cell);
    for (let oy = -reach; oy <= reach; oy++) {
      for (let ox = -reach; ox <= reach; ox++) {
        const gx2 = cx + ox, gy2 = cy + oy;
        if (gx2 < 0 || gy2 < 0 || gx2 >= gw || gy2 >= gh) continue;
        const bucket = grid.get(gy2 * gw + gx2);
        if (!bucket) continue;
        for (const pi of bucket) {
          const p = pts[pi];
          const minDist = Math.min(r, p.r) * 0.82;
          const dx = p.x - x, dy = p.y - y;
          if (dx * dx + dy * dy < minDist * minDist) return false;
        }
      }
    }
    return true;
  };

  let misses = 0;
  const maxDarts = 1_400_000;
  for (let dart = 0; dart < maxDarts && pts.length < TARGET_STROKES; dart++) {
    const x = random() * (w - 2) + 1;
    const y = random() * (h - 2) + 1;
    const xi = Math.round(x), yi = Math.round(y);
    const r = radiusAt(xi, yi);
    if (!fits(x, y, r)) {
      if (++misses > 220_000 && pts.length > 8000) break; // acceptance stalled inside spec window
      continue;
    }
    const idx = pts.length;
    pts.push({ x, y, r });
    const key = Math.floor(y / cell) * gw + Math.floor(x / cell);
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(idx);
  }

  // geometry + color per accepted point
  const strokes = pts.map((p) => {
    const xi = Math.round(p.x), yi = Math.round(p.y);
    const i = yi * w + xi;
    const c = coh[i];
    const width = p.r * 1.5 * lerp(0.85, 1.25, random());
    const length = width * (1.7 + 1.6 * c) * lerp(0.85, 1.2, random());
    // strokes follow contours where the neighborhood is coherent; in calm
    // fields they relax toward a loose diagonal hatch (painter's habit)
    let a;
    if (c < 0.08) {
      a = -0.35 + (random() - 0.5) * 1.1;
    } else {
      const jitter = (random() - 0.5) * lerp(0.7, 0.16, clamp01(c * 2));
      a = angle[i] + jitter;
    }
    return {
      x: p.x,
      y: p.y,
      len: length,
      wid: width,
      angle: a,
      color: medianColor(master, xi, yi),
      density: fields.density[i],
      alpha: lerp(0.88, 1, random()),
    };
  });

  return strokes;
}

// ---------------------------------------------------------------------------
// ordering + edge dissolve
// ---------------------------------------------------------------------------

/** Optional 4-tone order map; white paints first, black last. */
async function loadOrderMap(file, w, h) {
  if (!existsSync(file)) return null;
  const { data, info } = await sharp(file)
    .resize(w, h, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

function orderStrokes(strokes, orderMap, w, h, random) {
  let scored;
  if (orderMap) {
    scored = strokes.map((s) => {
      const v = orderMap.data[Math.round(s.y) * w + Math.round(s.x)] / 255;
      return { s, score: 1 - v + (random() - 0.5) * 0.12 };
    });
  } else {
    // washes -> masses -> street -> accents: light first, gray before vivid,
    // calm before detailed.
    scored = strokes.map((s) => {
      const [r, g, b] = s.color;
      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      const mx = Math.max(r, g, b) / 255;
      const mn = Math.min(r, g, b) / 255;
      const sat = mx > 0.001 ? (mx - mn) / mx : 0;
      const score = 0.45 * (1 - lum) + 0.25 * sat + 0.3 * s.density;
      return { s, score };
    });
  }

  scored.sort((a, b) => a.score - b.score);

  // bucket into passes, then order each pass spatially (a loose lateral sweep
  // with alternating direction) so the brush works regions, not random pixels
  const n = scored.length;
  const out = [];
  for (let p = 0; p < ORDER_PASSES; p++) {
    const from = Math.floor((p / ORDER_PASSES) * n);
    const to = Math.floor(((p + 1) / ORDER_PASSES) * n);
    const pass = scored.slice(from, to);
    const dir = p % 2 === 0 ? 1 : -1;
    pass.sort((a, b) => {
      const ka = dir * (a.s.x + a.s.y * 0.35) + (randKey(a) - 0.5) * 220;
      const kb = dir * (b.s.x + b.s.y * 0.35) + (randKey(b) - 0.5) * 220;
      return ka - kb;
    });
    out.push(...pass.map((e) => e.s));
  }
  return out;

  function randKey(e) {
    // stable per-stroke jitter (hash of position) so sort comparator is consistent
    const v = Math.sin(e.s.x * 12.9898 + e.s.y * 78.233) * 43758.5453;
    return v - Math.floor(v);
  }
}

/** Painterly alpha falloff toward the canvas edges (noise-modulated). */
function applyEdgeDissolve(strokes, w, h) {
  const band = 0.085 * Math.min(w, h);
  const kept = [];
  for (const s of strokes) {
    const d = Math.min(s.x, s.y, w - s.x, h - s.y) / band;
    if (d < 1) {
      const noise = valueNoise2(s.x * 0.016, s.y * 0.016);
      const a = clamp01(d + (noise - 0.5) * 0.55);
      s.alpha *= Math.pow(a, 1.5);
      if (s.alpha < 0.05) continue;
    }
    kept.push(s);
  }
  return kept;
}

// ---------------------------------------------------------------------------
// rendering (kept in sync with HeroPainting.tsx)
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

function renderField(strokes, w, h, colorOf, upTo = strokes.length) {
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < upTo; i++) {
    const s = strokes[i];
    const [r, g, b] = colorOf(s, i);
    drawDab(ctx, s.x, s.y, s.len, s.wid, s.angle, r, g, b, s.alpha);
  }
  return canvas;
}

// ---------------------------------------------------------------------------
// binary packing
// ---------------------------------------------------------------------------

function packStrokes(strokes, variants, w, h) {
  const count = strokes.length;
  const header = {
    version: 1,
    count,
    width: w,
    height: h,
    variants: ["master", ...variants.map((v) => v.name)],
    // SoA layout, in order: x u16 (px*8), y u16 (px*8), len u8 (px*2),
    // wid u8 (px*2), angle u8 (0..255 over -PI/2..PI/2), alpha u8,
    // then per variant: r,g,b u8 * count
    fields: ["x16", "y16", "len8", "wid8", "ang8", "alpha8", "rgb8"],
  };
  const headerBytes = Buffer.from(JSON.stringify(header), "utf8");

  const fixed = count * (2 + 2 + 1 + 1 + 1 + 1);
  const colors = count * 3 * (1 + variants.length);
  const payload = Buffer.alloc(fixed + colors);

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
      const c = v.colors[i];
      payload.writeUInt8(c[0], o++);
      payload.writeUInt8(c[1], o++);
      payload.writeUInt8(c[2], o++);
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

async function main() {
  const masterFile = path.join(SRC_DIR, "master.png");
  if (!existsSync(masterFile)) {
    console.error("hero/sources/master.png is required");
    process.exit(1);
  }
  await mkdir(OUT_DIR, { recursive: true });

  console.log("· loading master");
  const master = await loadRaw(masterFile);
  const { w, h } = master;

  console.log("· analyzing (sobel, structure tensor, density)");
  const gray = toGray(master);
  const { gx, gy, mag } = sobel(gray, w, h);
  const { angle, coh } = orientationField(gx, gy, w, h);
  const density = Float32Array.from(mag);
  boxBlur(density, w, h, 14, 3);
  const p95 = percentile(density, 0.95);
  for (let i = 0; i < density.length; i++) density[i] = clamp01(density[i] / p95);

  console.log("· sampling strokes");
  const random = rng(20260611);
  let strokes = sampleStrokes(master, { density, angle, coh }, random);
  console.log(`  ${strokes.length} strokes sampled`);
  if (strokes.length < 8000 || strokes.length > 15000) {
    console.warn(`  WARNING: outside the 8-15k spec window`);
  }

  console.log("· ordering");
  const orderMap = await loadOrderMap(path.join(SRC_DIR, "order-map.png"), w, h);
  if (orderMap) console.log("  using order-map.png");
  strokes = orderStrokes(strokes, orderMap, w, h, random);

  console.log("· edge dissolve");
  strokes = applyEdgeDissolve(strokes, w, h);
  console.log(`  ${strokes.length} strokes after dissolve`);

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
    const img = await loadRaw(file);
    if (img.w !== w || img.h !== h) {
      console.warn(`  WARNING: variant-${name}.png is ${img.w}x${img.h}, master is ${w}x${h} — skipped`);
      continue;
    }
    const colors = strokes.map((s) => medianColor(img, Math.round(s.x), Math.round(s.y)));
    variants.push({ name, colors });
    console.log(`  variant-${name} sampled (registration ${score.toFixed(2)})`);
  }

  console.log("· packing strokes.bin");
  const bin = packStrokes(strokes, variants, w, h);
  await writeFile(path.join(OUT_DIR, "strokes.bin"), bin);
  const gz = zlib.gzipSync(bin).length;
  console.log(
    `  ${(bin.length / 1024).toFixed(0)} KB raw, ${(gz / 1024).toFixed(0)} KB gzipped ` +
      `(budget 600 KB) ${gz <= 600 * 1024 ? "OK" : "OVER BUDGET"}`,
  );

  console.log("· rendering final frames");
  const masterCanvas = renderField(strokes, w, h, (s) => s.color);
  await writeFile(
    path.join(OUT_DIR, "final-master.jpg"),
    await masterCanvas.encode("jpeg", 84),
  );
  for (const v of variants) {
    const canvas = renderField(strokes, w, h, (_s, i) => v.colors[i]);
    await writeFile(path.join(OUT_DIR, `final-${v.name}.jpg`), await canvas.encode("jpeg", 84));
  }

  // og.jpg — 1200x630 center crop of the final master frame
  const ogW = 1200, ogH = 630;
  const og = createCanvas(ogW, ogH);
  const ogCtx = og.getContext("2d");
  const scale = Math.max(ogW / w, ogH / h);
  ogCtx.fillStyle = PAPER;
  ogCtx.fillRect(0, 0, ogW, ogH);
  ogCtx.drawImage(
    masterCanvas,
    (ogW - w * scale) / 2,
    (ogH - h * scale) / 2 - h * scale * 0.04, // slight up-bias toward the flags
    w * scale,
    h * scale,
  );
  await writeFile(path.join(OUT_DIR, "og.jpg"), await og.encode("jpeg", 84));

  // pentimento layer for the player
  const under = await loadImage(path.join(SRC_DIR, "underdrawing.png"));
  const uc = createCanvas(w, h);
  uc.getContext("2d").drawImage(under, 0, 0);
  await writeFile(path.join(OUT_DIR, "underdrawing.jpg"), await uc.encode("jpeg", 80));

  console.log(`· done — ${strokes.length} strokes, ${variants.length + 1} color fields`);
}

// Run only when executed directly (hero-proof.mjs imports drawDab from here).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
