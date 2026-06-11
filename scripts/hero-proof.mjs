// hero-proof.mjs — renders the decomposed stroke field at 20/50/80/100%
// completion into one wide strip for Rob's gate review (hero/HERO.md Phase 1).
//
// Reads  public/hero/strokes.bin  (run hero-decompose.mjs first)
// Writes hero/proof-strip.png
//
// Run: node scripts/hero-proof.mjs

import { createCanvas } from "@napi-rs/canvas";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { drawDab } from "./hero-decompose.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const BIN = path.join(ROOT, "public", "hero", "strokes.bin");
const OUT = path.join(ROOT, "hero", "proof-strip.png");

const PAPER = "#eee8da";
const INK = "#0A2540";
const STAGES = [0.2, 0.5, 0.8, 1.0];
const PANEL_W = 720;

export function parseStrokes(buf) {
  const u8 = new Uint8Array(buf.buffer ?? buf, buf.byteOffset ?? 0, buf.length ?? buf.byteLength);
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  if (String.fromCharCode(u8[0], u8[1], u8[2], u8[3]) !== "HERO") {
    throw new Error("bad magic in strokes.bin");
  }
  const headerLen = dv.getUint32(4, true);
  const header = JSON.parse(Buffer.from(u8.subarray(8, 8 + headerLen)).toString("utf8"));
  const { count } = header;
  let o = 8 + headerLen;

  const x = new Float32Array(count);
  const y = new Float32Array(count);
  for (let i = 0; i < count; i++, o += 2) x[i] = dv.getUint16(o, true) / 8;
  for (let i = 0; i < count; i++, o += 2) y[i] = dv.getUint16(o, true) / 8;
  const len = new Float32Array(count);
  const wid = new Float32Array(count);
  const ang = new Float32Array(count);
  const alpha = new Float32Array(count);
  for (let i = 0; i < count; i++) len[i] = u8[o++] / 2;
  for (let i = 0; i < count; i++) wid[i] = u8[o++] / 2;
  for (let i = 0; i < count; i++) ang[i] = (u8[o++] / 255) * Math.PI - Math.PI / 2;
  for (let i = 0; i < count; i++) alpha[i] = u8[o++] / 255;
  const fields = {};
  for (const name of header.variants) {
    fields[name] = u8.subarray(o, o + count * 3);
    o += count * 3;
  }
  return { header, x, y, len, wid, ang, alpha, fields };
}

async function main() {
  const buf = await readFile(BIN);
  const s = parseStrokes(buf);
  const { width: W, height: H } = s.header;
  const colors = s.fields.master;

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
    pctx.fillStyle = PAPER;
    pctx.fillRect(0, 0, PANEL_W, panelH);
    pctx.scale(scale, scale);
    const upTo = Math.floor(s.header.count * stage);
    for (let i = 0; i < upTo; i++) {
      const c = i * 3;
      drawDab(
        pctx, s.x[i], s.y[i], s.len[i], s.wid[i], s.ang[i],
        colors[c], colors[c + 1], colors[c + 2], s.alpha[i],
      );
    }
    const px = gutter + idx * (PANEL_W + gutter);
    ctx.drawImage(panel, px, gutter);
    ctx.fillStyle = INK;
    ctx.font = "16px monospace";
    ctx.fillText(
      `${Math.round(stage * 100)}%  ·  ${upTo.toLocaleString()} strokes`,
      px,
      gutter + panelH + 24,
    );
  });

  await writeFile(OUT, await strip.encode("png"));
  console.log(`· wrote hero/proof-strip.png (${stripW}x${stripH})`);
}

import { pathToFileURL } from "node:url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
