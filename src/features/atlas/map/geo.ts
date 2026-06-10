// Great-circle interpolation for the draw_links ink lines. The lines are
// annotations on a drafting sheet, not flight paths — but a straight line in
// mercator reads wrong across an ocean, so we sample the great circle.

export type LngLat = [number, number];

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

function toVector([lng, lat]: LngLat): [number, number, number] {
  const φ = lat * RAD;
  const λ = lng * RAD;
  return [Math.cos(φ) * Math.cos(λ), Math.cos(φ) * Math.sin(λ), Math.sin(φ)];
}

function toLngLat([x, y, z]: [number, number, number]): LngLat {
  return [Math.atan2(y, x) * DEG, Math.atan2(z, Math.hypot(x, y)) * DEG];
}

/** Sample `steps + 1` points along the great circle from a to b (inclusive). */
export function greatCirclePoints(a: LngLat, b: LngLat, steps = 48): LngLat[] {
  const va = toVector(a);
  const vb = toVector(b);
  const dot = Math.min(1, Math.max(-1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]));
  const ω = Math.acos(dot);
  if (ω < 1e-6) return [a, b];
  const sinω = Math.sin(ω);
  const points: LngLat[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const k0 = Math.sin((1 - t) * ω) / sinω;
    const k1 = Math.sin(t * ω) / sinω;
    points.push(
      toLngLat([
        k0 * va[0] + k1 * vb[0],
        k0 * va[1] + k1 * vb[1],
        k0 * va[2] + k1 * vb[2],
      ]),
    );
  }
  // Unwrap longitudes so the path doesn't jump at the antimeridian.
  for (let i = 1; i < points.length; i++) {
    let lng = points[i][0];
    const prev = points[i - 1][0];
    while (lng - prev > 180) lng -= 360;
    while (lng - prev < -180) lng += 360;
    points[i] = [lng, points[i][1]];
  }
  return points;
}
