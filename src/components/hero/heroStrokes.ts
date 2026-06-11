// Parser for public/hero/strokes.bin (v4) — mirrors scripts/hero-proof.mjs.
// SoA layout documented in scripts/hero-decompose.mjs packStrokes().

export interface StrokeField {
  count: number;
  width: number;
  height: number;
  washCount: number;
  grain: number;
  stamps: { count: number; soft: number; cellW: number; cellH: number };
  variants: string[];
  x: Float32Array;
  y: Float32Array;
  len: Float32Array;
  wid: Float32Array;
  ang: Float32Array;
  bend: Float32Array;
  alpha: Float32Array;
  stamp: Uint8Array;
  vdrift: Float32Array;
  /** Absolute RGB per variant name (deltas already applied). */
  colors: Record<string, Uint8Array>;
}

export function parseStrokes(buf: ArrayBuffer): StrokeField {
  const u8 = new Uint8Array(buf);
  const dv = new DataView(buf);
  if (String.fromCharCode(u8[0], u8[1], u8[2], u8[3]) !== "HERO") {
    throw new Error("bad magic in strokes.bin");
  }
  const headerLen = dv.getUint32(4, true);
  const header = JSON.parse(new TextDecoder().decode(u8.subarray(8, 8 + headerLen)));
  if (header.version !== 4) throw new Error(`expected strokes.bin v4, got v${header.version}`);
  const count: number = header.count;
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

  const colors: Record<string, Uint8Array> = {};
  (header.variants as string[]).forEach((name, vi) => {
    if (vi === 0) {
      colors[name] = u8.slice(o, o + count * 3);
    } else {
      const abs = new Uint8Array(count * 3);
      const masterField = colors[header.variants[0]];
      for (let i = 0; i < count * 3; i++) {
        const d = u8[o + i];
        abs[i] = Math.max(0, Math.min(255, masterField[i] + (d > 127 ? d - 256 : d)));
      }
      colors[name] = abs;
    }
    o += count * 3;
  });

  return {
    count,
    width: header.width,
    height: header.height,
    washCount: header.washCount,
    grain: header.grain ?? 0.035,
    stamps: header.stamps,
    variants: header.variants,
    x, y, len, wid, ang, bend, alpha, stamp, vdrift,
    colors,
  };
}
