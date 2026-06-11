// hero-proof.mjs — renders the decomposed stroke field at 20/50/80/100%
// completion into one wide strip for Rob's gate review (hero/HERO.md Phase 1).
// Reads the real shipped artifacts (strokes.bin + brush-stamps.png) so the
// strip is exactly what the browser player will paint.
//
// Run after hero-decompose.mjs:  node scripts/hero-proof.mjs
// Writes hero/proof-strip.png

import { createCanvas, loadImage } from "@napi-rs/canvas";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { applyGrainAtop, drawStroke, generateGrainTile, makeScratch } from "./hero-brush.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const BIN = path.join(ROOT, "public", "hero", "strokes.bin");
const STAMPS = path.join(ROOT, "public", "hero", "brush-stamps.png");
const OUT = path.join(ROOT, "hero", "proof-strip.png");

const PAPER = "#eee8da";
const INK = "#0A2540";
const STAGES = [0.2, 0.5, 0.8, 1.0];
const PANEL_W = 720;

/** Parse strokes.bin v3 (mirrors the player's parser). */
export function parseStrokes(buf) {
  const u8 = new Uint8Array(buf.buffer ?? buf, buf.byteOffset ?? 0, buf.length ?? buf.byteLength);
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  if (String.fromCharCode(u8[0], u8[1], u8[2], u8[3]) !== "HERO") {
    throw new Error("bad magic in strokes.bin");
  }
  const headerLen = dv.getUint32(4, true);
  const header = JSON.parse(Buffer.from(u8.subarray(8, 8 + headerLen)).toString("utf8"));
  if (header.version !== 4) throw new Error(`expected strokes.bin v4, got v${header.version}`);
  const { count } = header;
  let o = 8 + headerLen;

  const x = new Float32Array(count);
  const y = new Float32Array(count);
  for (let i = 0; i < count; i++, o += 2) x[i] = dv.getUint16(o, true) / 8;
  for (let i = 0; i < count; i++, o += 2) y[i] = dv.getUint16(o, true) / 8;
  const len = new Float32Array(count);
  const wid = new Float32Array(count);
  const ang = new Float32Array(count);
  const bend = new Float32Array(count);
  const alpha = new Float32Array(count);
  const stamp = new Uint8Array(count);
  const vdrift = new Float32Array(count);
  for (let i = 0; i < count; i++) len[i] = u8[o++] / 1.5;
  for (let i = 0; i < count; i++) wid[i] = u8[o++] / 1.5;
  for (let i = 0; i < count; i++) ang[i] = (u8[o++] / 255) * Math.PI - Math.PI / 2;
  for (let i = 0; i < count; i++) {
    const p = u8[o++];
    alpha[i] = (p >> 4) / 15;
    stamp[i] = p & 15;
  }
  for (let i = 0; i < count; i++) {
    const p = u8[o++];
    bend[i] = ((p >> 4) / 15) * 2 - 1;
    vdrift[i] = ((p & 15) / 15) * 2 - 1;
  }
  // master colors raw; later variants are int8 deltas from master
  const fields = {};
  header.variants.forEach((name, vi) => {
    if (vi === 0) {
      fields[name] = u8.subarray(o, o + count * 3);
    } else {
      const abs = new Uint8Array(count * 3);
      const masterField = fields[header.variants[0]];
      for (let i = 0; i < count * 3; i++) {
        const d = u8[o + i];
        abs[i] = Math.max(0, Math.min(255, masterField[i] + (d > 127 ? d - 256 : d)));
      }
      fields[name] = abs;
    }
    o += count * 3;
  });
  return { header, x, y, len, wid, ang, bend, alpha, stamp, vdrift, fields };
}

async function main() {
  const buf = await readFile(BIN);
  const s = parseStrokes(buf);
  const { width: W, height: H } = s.header;
  const colors = s.fields.master;
  const stamps = await loadImage(STAMPS);
  const grain = generateGrainTile();

  const scale = PANEL_W / W;
  const panelH = Math.round(H * scale);
  const gutter = 14;
  const labelH = 34;
  const stripW = PANEL_W * STAGES.length + gutter * (STAGES.length + 1);
  const stripH = panelH + labelH + gutter * 2;

  const strip = createCanvas(stripW, stripH);
  const ctx = strip.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, stripW, stripH);

  STAGES.forEach((stage, idx) => {
    const panel = createCanvas(PANEL_W, panelH);
    const pctx = panel.getContext("2d");
    const scratch = makeScratch();
    pctx.fillStyle = PAPER;
    pctx.fillRect(0, 0, PANEL_W, panelH);
    pctx.scale(scale, scale);
    const upTo = Math.floor(s.header.count * stage);
    for (let i = 0; i < upTo; i++) {
      const c = i * 3;
      drawStroke(
        pctx,
        { x: s.x[i], y: s.y[i], len: s.len[i], wid: s.wid[i], angle: s.ang[i],
          bend: s.bend[i], alpha: s.alpha[i], stamp: s.stamp[i], vdrift: s.vdrift[i] },
        colors[c], colors[c + 1], colors[c + 2],
        stamps, scratch,
      );
    }
    if (stage === 1) applyGrainAtop(pctx, grain, W, H, s.header.grain ?? 0.05);
    const px = gutter + idx * (PANEL_W + gutter);
    ctx.drawImage(panel, px, gutter);
    ctx.fillStyle = INK;
    ctx.font = "16px monospace";
    ctx.fillText(`${Math.round(stage * 100)}%  ·  ${upTo.toLocaleString()} strokes`, px, gutter + panelH + 24);
  });

  await writeFile(OUT, await strip.encode("png"));
  console.log(`· wrote hero/proof-strip.png (${stripW}x${stripH})`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
