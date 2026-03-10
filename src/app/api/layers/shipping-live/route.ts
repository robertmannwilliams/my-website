import { NextResponse } from 'next/server';
import fallbackData from '@/app/monitor/data/shipping-live.json';
import { envelopeFromPayload, readCachedPayload, writeCachedPayload } from '@/lib/monitor/cache';
import type { LiveShippingTrack } from '@/lib/monitor/types';

const RESOURCE = 'layers:shipping-live';
const TTL_SECONDS = 5 * 60;

interface Hotspot {
  id: string;
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
  risk: LiveShippingTrack['riskLevel'];
}

const HOTSPOTS: Hotspot[] = [
  { id: 'hormuz', latMin: 24, latMax: 29, lngMin: 54, lngMax: 59, risk: 'high' },
  { id: 'bab-el-mandeb', latMin: 11, latMax: 14.8, lngMin: 42, lngMax: 45, risk: 'high' },
  { id: 'suez', latMin: 29.6, latMax: 31.4, lngMin: 31.8, lngMax: 33.3, risk: 'watch' },
  { id: 'malacca', latMin: 0.8, latMax: 6.5, lngMin: 98.8, lngMax: 104.4, risk: 'monitor' },
  { id: 'taiwan-strait', latMin: 21.8, latMax: 27.2, lngMin: 117, lngMax: 122.8, risk: 'watch' },
];

function inferRegion(lat: number, lng: number): string {
  if (lat > 25 && lat < 50 && lng > -10 && lng < 45) return 'europe';
  if (lat > 10 && lat < 45 && lng > 25 && lng < 75) return 'middle_east';
  if (lat > -35 && lat < 38 && lng > -20 && lng < 55) return 'africa';
  if (lat > 5 && lat < 55 && lng > 60 && lng < 150) return 'asia';
  if (lat > -50 && lat < 15 && lng > -85 && lng < -30) return 'south_america';
  if (lat > 15 && lat < 75 && lng > -170 && lng < -50) return 'north_america';
  if (lat > -50 && lat < 0 && lng > 100 && lng < 180) return 'oceania';
  return 'global';
}

function getRiskLevel(lat: number, lng: number): LiveShippingTrack['riskLevel'] {
  for (const spot of HOTSPOTS) {
    if (lat >= spot.latMin && lat <= spot.latMax && lng >= spot.lngMin && lng <= spot.lngMax) {
      return spot.risk;
    }
  }
  return 'monitor';
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function stringOrNull(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return null;
}

function parseTimestamp(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return new Date().toISOString();
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function pickNumber(record: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = numberOrNull(record[key]);
    if (value != null) return value;
  }
  return null;
}

function pickString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = stringOrNull(record[key]);
    if (value) return value;
  }
  return null;
}

function normalizeTrack(raw: unknown): LiveShippingTrack | null {
  const row = asRecord(raw);
  if (!row) return null;

  const lat = pickNumber(row, ['lat', 'latitude', 'LAT']);
  const lng = pickNumber(row, ['lng', 'lon', 'longitude', 'LON']);
  if (lat == null || lng == null || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

  const mmsi = pickString(row, ['mmsi', 'MMSI', 'id']) || 'unknown';
  const vesselName = pickString(row, ['vesselName', 'name', 'SHIPNAME', 'callsign']) || `Vessel ${mmsi}`;
  const lastSeen = parseTimestamp(pickString(row, ['lastSeen', 'timestamp', 'last_pos_utc', 'last_update']) || '');
  const sogKnots = pickNumber(row, ['sogKnots', 'sog', 'SOG', 'speed']);
  const cog = pickNumber(row, ['cog', 'COG', 'course']);
  const heading = pickNumber(row, ['heading', 'HEADING']);
  const navStatus = pickString(row, ['navStatus', 'NAVSTAT', 'status']) || 'Unknown';
  const riskLevel = getRiskLevel(lat, lng);
  const region = inferRegion(lat, lng);

  return {
    id: `ais_${mmsi}_${Math.round(lat * 100) / 100}_${Math.round(lng * 100) / 100}`,
    mmsi,
    vesselName,
    lat,
    lng,
    sogKnots,
    cog,
    heading,
    navStatus,
    lastSeen,
    riskLevel,
    region,
    source: 'ais',
  };
}

async function fetchRemoteTracks(): Promise<{ items: LiveShippingTrack[]; fetched: number; failed: boolean }> {
  const url = process.env.MONITOR_AIS_SOURCE_URL;
  if (!url) return { items: [], fetched: 0, failed: false };

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'GlobalMonitor/1.0' },
      signal: AbortSignal.timeout(12_000),
      cache: 'no-store',
    });
    if (!res.ok) return { items: [], fetched: 0, failed: true };
    const payload = await res.json();
    if (!Array.isArray(payload)) return { items: [], fetched: 0, failed: true };

    const deduped = new Map<string, LiveShippingTrack>();
    for (const row of payload) {
      const track = normalizeTrack(row);
      if (!track) continue;
      const existing = deduped.get(track.mmsi);
      if (!existing || new Date(track.lastSeen) > new Date(existing.lastSeen)) {
        deduped.set(track.mmsi, track);
      }
    }

    const items = [...deduped.values()]
      .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())
      .slice(0, 1200);

    return {
      items,
      fetched: payload.length,
      failed: false,
    };
  } catch {
    return { items: [], fetched: 0, failed: true };
  }
}

export async function GET() {
  const cached = await readCachedPayload<LiveShippingTrack[]>(RESOURCE, TTL_SECONDS);
  if (cached.payload && cached.fresh) {
    return NextResponse.json(envelopeFromPayload(cached.payload, cached.ageSeconds, 'HIT'), {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=90' },
    });
  }

  const remote = await fetchRemoteTracks();
  const fallback = fallbackData as LiveShippingTrack[];
  const items = remote.items.length > 0 ? remote.items : fallback;
  const sourceCoverage = [
    {
      source: 'AIS live source',
      tier: 'specialized' as const,
      weight: 0.86,
      fetched: remote.fetched,
      accepted: remote.items.length,
      failed: remote.failed,
    },
    {
      source: 'Fallback shipping live dataset',
      tier: 'specialized' as const,
      weight: 0.5,
      fetched: fallback.length,
      accepted: remote.items.length > 0 ? 0 : fallback.length,
      failed: remote.items.length > 0,
    },
  ];

  const stored = await writeCachedPayload(RESOURCE, items, sourceCoverage, TTL_SECONDS);
  return NextResponse.json(envelopeFromPayload(stored, 0, 'MISS'), {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=90' },
  });
}
