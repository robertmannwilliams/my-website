/**
 * Generates Mapbox SDF glyph PBFs for the atlas map's label fonts
 * (Newsreader + IBM Plex Mono), so the paper-and-ink map style can use the
 * project typefaces instead of Mapbox-hosted DIN.
 *
 * One-time tool: output is committed to public/map-fonts/ and served
 * statically; this script only needs re-running to add fonts or ranges.
 *
 *   npx tsx scripts/build-map-glyphs.ts
 *
 * Approach: render each codepoint at 24px with @napi-rs/canvas (Skia),
 * convert the alpha channel to an SDF with the Felzenszwalb-Huttenlocher
 * euclidean distance transform (ported from @mapbox/tiny-sdf, BSD-2-Clause,
 * (c) Mapbox), and encode the standard glyphs.proto with pbf. Metric
 * conventions verified against Mapbox-hosted "DIN Offc Pro Regular" PBFs:
 * tight bbox + 3px buffer bitmaps, top = ceil(bboxAscent) - fontAscent,
 * left = bbox left bearing, advance = measureText width.
 *
 * Font sources are downloaded from the google/fonts repo (OFL 1.1) into a
 * local cache; the TTFs themselves are not committed.
 */

import { createCanvas, GlobalFonts, type SKRSContext2D } from "@napi-rs/canvas";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PbfWriter } from "pbf";

const SIZE = 24;
const BUFFER = 3;
const RADIUS = 8;
const CUTOFF = 0.25;
const CANVAS = 96; // roomy; glyphs are drawn at (BUFFER, BUFFER + ascent)
const INF = 1e20;

const ROOT = process.cwd();
const CACHE_DIR = join(ROOT, "node_modules", ".cache", "map-fonts-src");
const OUT_DIR = join(ROOT, "public", "map-fonts");

const GOOGLE_FONTS = "https://raw.githubusercontent.com/google/fonts/main/ofl";

interface FontSpec {
  /** Fontstack name referenced by the map style. */
  stack: string;
  /** Source TTF in the google/fonts repo. */
  url: string;
  file: string;
}

const FONTS: FontSpec[] = [
  {
    stack: "Newsreader Regular",
    url: `${GOOGLE_FONTS}/newsreader/Newsreader%5Bopsz%2Cwght%5D.ttf`,
    file: "Newsreader.ttf",
  },
  {
    stack: "Newsreader Italic",
    url: `${GOOGLE_FONTS}/newsreader/Newsreader-Italic%5Bopsz%2Cwght%5D.ttf`,
    file: "NewsreaderItalic.ttf",
  },
  {
    stack: "IBM Plex Mono Regular",
    url: `${GOOGLE_FONTS}/ibmplexmono/IBMPlexMono-Regular.ttf`,
    file: "IBMPlexMono-Regular.ttf",
  },
  {
    stack: "IBM Plex Mono Medium",
    url: `${GOOGLE_FONTS}/ibmplexmono/IBMPlexMono-Medium.ttf`,
    file: "IBMPlexMono-Medium.ttf",
  },
];

// Latin + extensions (incl. Vietnamese), combining marks, general punctuation.
// name_en label fields are overwhelmingly Latin; add ranges here if labels
// ever need more coverage.
const RANGES: Array<[number, number]> = [
  [0, 255],
  [256, 511],
  [512, 767],
  [768, 1023],
  [7680, 7935],
  [8192, 8447],
];

// ---------------------------------------------------------------------------
// Euclidean distance transform, ported from @mapbox/tiny-sdf (BSD-2-Clause).

function edt1d(
  grid: Float64Array,
  offset: number,
  stride: number,
  length: number,
  f: Float64Array,
  v: Uint16Array,
  z: Float64Array,
) {
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  f[0] = grid[offset];

  for (let q = 1, k = 0, s = 0; q < length; q++) {
    f[q] = grid[offset + q * stride];
    const q2 = q * q;
    do {
      const r = v[k];
      s = (f[q] - f[r] + q2 - r * r) / (q - r) / 2;
    } while (s <= z[k] && --k > -1);
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }

  for (let q = 0, k = 0; q < length; q++) {
    while (z[k + 1] < q) k++;
    const r = v[k];
    grid[offset + q * stride] = f[r] + (q - r) * (q - r);
  }
}

function edt(
  data: Float64Array,
  width: number,
  height: number,
  f: Float64Array,
  v: Uint16Array,
  z: Float64Array,
) {
  for (let x = 0; x < width; x++) edt1d(data, x, width, height, f, v, z);
  for (let y = 0; y < height; y++) edt1d(data, y * width, 1, width, f, v, z);
}

// ---------------------------------------------------------------------------

interface GlyphRecord {
  id: number;
  bitmap: Uint8Array | null;
  width: number;
  height: number;
  left: number;
  top: number;
  advance: number;
}

function renderGlyph(
  ctx: SKRSContext2D,
  scratch: {
    gridOuter: Float64Array;
    gridInner: Float64Array;
    f: Float64Array;
    v: Uint16Array;
    z: Float64Array;
  },
  codePoint: number,
  fontAscent: number,
): GlyphRecord | null {
  const char = String.fromCodePoint(codePoint);
  const m = ctx.measureText(char);
  if (!m) return null;

  const advance = Math.round(m.width);
  // actualBoundingBoxLeft is positive when ink extends left of the origin.
  const inkLeft = Math.floor(-m.actualBoundingBoxLeft);
  const inkRight = Math.ceil(m.actualBoundingBoxRight);
  const ascent = Math.ceil(m.actualBoundingBoxAscent);
  const descent = Math.ceil(m.actualBoundingBoxDescent);
  const glyphWidth = inkRight - inkLeft;
  const glyphHeight = ascent + descent;

  const hasInk = glyphWidth > 0 && glyphHeight > 0;
  if (!hasInk && advance <= 0) return null;
  if (!hasInk) {
    // Whitespace: advance only.
    return { id: codePoint, bitmap: null, width: 0, height: 0, left: 0, top: 0, advance };
  }
  if (glyphWidth + 2 * BUFFER > CANVAS || glyphHeight + 2 * BUFFER > CANVAS) {
    console.warn(`  ! skipping oversized glyph U+${codePoint.toString(16)}`);
    return null;
  }

  const width = glyphWidth + 2 * BUFFER;
  const height = glyphHeight + 2 * BUFFER;

  ctx.clearRect(0, 0, CANVAS, CANVAS);
  ctx.fillText(char, BUFFER - inkLeft, BUFFER + ascent);
  const img = ctx.getImageData(0, 0, width, height);

  const { gridOuter, gridInner, f, v, z } = scratch;
  const len = width * height;
  for (let i = 0; i < len; i++) {
    const a = img.data[4 * i + 3] / 255; // alpha
    gridOuter[i] = a === 1 ? 0 : a === 0 ? INF : Math.max(0, 0.5 - a) ** 2;
    gridInner[i] = a === 1 ? INF : a === 0 ? 0 : Math.max(0, a - 0.5) ** 2;
  }

  // The scratch grids are CANVAS² but edt works on a width×height view; copy
  // into tight arrays to keep strides simple.
  const outer = new Float64Array(len);
  const inner = new Float64Array(len);
  outer.set(gridOuter.subarray(0, len));
  inner.set(gridInner.subarray(0, len));
  edt(outer, width, height, f, v, z);
  edt(inner, width, height, f, v, z);

  const bitmap = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    const d = Math.sqrt(outer[i]) - Math.sqrt(inner[i]);
    bitmap[i] = Math.max(0, Math.min(255, Math.round(255 - 255 * (d / RADIUS + CUTOFF))));
  }

  return {
    id: codePoint,
    bitmap,
    width: glyphWidth,
    height: glyphHeight,
    left: inkLeft,
    top: ascent - fontAscent,
    advance,
  };
}

// ---------------------------------------------------------------------------
// glyphs.proto encoding

function encodeFontstack(name: string, range: string, glyphs: GlyphRecord[]): Uint8Array {
  const pbf = new PbfWriter();
  pbf.writeMessage(1, (stack: { name: string; range: string; glyphs: GlyphRecord[] }, w: PbfWriter) => {
    w.writeStringField(1, stack.name);
    w.writeStringField(2, stack.range);
    for (const g of stack.glyphs) {
      w.writeMessage(3, (glyph: GlyphRecord, gw: PbfWriter) => {
        gw.writeVarintField(1, glyph.id);
        if (glyph.bitmap) gw.writeBytesField(2, glyph.bitmap);
        gw.writeVarintField(3, glyph.width);
        gw.writeVarintField(4, glyph.height);
        gw.writeSVarintField(5, glyph.left);
        gw.writeSVarintField(6, glyph.top);
        gw.writeVarintField(7, glyph.advance);
      }, g);
    }
  }, { name, range, glyphs });
  return pbf.finish();
}

// ---------------------------------------------------------------------------

async function fetchFont(spec: FontSpec): Promise<string> {
  const path = join(CACHE_DIR, spec.file);
  if (!existsSync(path)) {
    console.log(`  downloading ${spec.file}…`);
    const res = await fetch(spec.url);
    if (!res.ok) throw new Error(`download failed: ${spec.url} → ${res.status}`);
    writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  }
  return path;
}

function asciiProof(g: GlyphRecord) {
  if (!g.bitmap) return;
  const w = g.width + 2 * BUFFER;
  const h = g.height + 2 * BUFFER;
  for (let y = 0; y < h; y += 2) {
    let row = "  ";
    for (let x = 0; x < w; x++) {
      const a = g.bitmap[y * w + x];
      row += a > 217 ? "#" : a > 191 ? "+" : a > 150 ? "." : " ";
    }
    console.log(row);
  }
}

async function main() {
  mkdirSync(CACHE_DIR, { recursive: true });

  const skipControl = (cp: number) =>
    cp < 32 || (cp >= 0x7f && cp <= 0x9f) || (cp >= 0xd800 && cp <= 0xdfff);

  for (const spec of FONTS) {
    const ttf = await fetchFont(spec);
    const alias = spec.stack.replace(/[^a-zA-Z]/g, "");
    GlobalFonts.register(readFileSync(ttf), alias);

    const canvas = createCanvas(CANVAS, CANVAS);
    const ctx = canvas.getContext("2d");
    ctx.font = `${SIZE}px ${alias}`;
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "black";

    const probe = ctx.measureText("Hg");
    const fontAscent = Math.round(
      Number.isFinite(probe.fontBoundingBoxAscent)
        ? probe.fontBoundingBoxAscent
        : SIZE * 0.8,
    );

    const scratch = {
      gridOuter: new Float64Array(CANVAS * CANVAS),
      gridInner: new Float64Array(CANVAS * CANVAS),
      f: new Float64Array(CANVAS),
      v: new Uint16Array(CANVAS),
      z: new Float64Array(CANVAS + 1),
    };

    const stackDir = join(OUT_DIR, spec.stack);
    mkdirSync(stackDir, { recursive: true });

    let total = 0;
    let bytes = 0;
    for (const [start, end] of RANGES) {
      const glyphs: GlyphRecord[] = [];
      for (let cp = start; cp <= end; cp++) {
        if (skipControl(cp)) continue;
        const g = renderGlyph(ctx, scratch, cp, fontAscent);
        if (g) glyphs.push(g);
      }
      const encoded = encodeFontstack(spec.stack, `${start}-${end}`, glyphs);
      writeFileSync(join(stackDir, `${start}-${end}.pbf`), encoded);
      total += glyphs.length;
      bytes += encoded.length;
    }
    console.log(
      `✓ ${spec.stack}: ${total} glyphs across ${RANGES.length} ranges, ` +
      `${(bytes / 1024).toFixed(0)} KB (ascent ${fontAscent})`,
    );

    if (spec.stack === "Newsreader Regular") {
      const sample = renderGlyph(ctx, scratch, "A".codePointAt(0)!, fontAscent);
      if (sample) {
        console.log(`  proof "A": w=${sample.width} h=${sample.height} left=${sample.left} top=${sample.top} adv=${sample.advance}`);
        asciiProof(sample);
      }
    }
  }

  writeFileSync(
    join(OUT_DIR, "README.md"),
    `# Map label glyphs

SDF glyph PBFs for the /aistack map style, generated by
\`scripts/build-map-glyphs.ts\` from Newsreader and IBM Plex Mono
(both licensed under the SIL Open Font License 1.1, via google/fonts).
Do not edit by hand; re-run the script to regenerate.
`,
  );
  console.log(`\nDone → ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
