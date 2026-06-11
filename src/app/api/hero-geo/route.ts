// Coarse visitor location for the hero's weather variant (hero/HERO.md §3).
// Reads Vercel's IP-geo headers — city-level only, nothing stored, no
// permission prompt; the client falls back to NYC when absent (local dev,
// non-Vercel hosts). Kept as a route handler so the homepage stays static.

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const lat = parseFloat(req.headers.get("x-vercel-ip-latitude") ?? "");
  const lng = parseFloat(req.headers.get("x-vercel-ip-longitude") ?? "");
  const rawCity = req.headers.get("x-vercel-ip-city") ?? "";
  let city = "";
  try {
    city = decodeURIComponent(rawCity);
  } catch {
    city = rawCity;
  }
  const valid = Number.isFinite(lat) && Number.isFinite(lng);
  return NextResponse.json(
    valid ? { lat, lng, city } : { lat: null, lng: null, city: null },
    { headers: { "cache-control": "private, no-store" } },
  );
}
