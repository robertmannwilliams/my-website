import { NextResponse } from 'next/server';
import fallbackData from '@/app/monitor/data/flights.json';
import { envelopeFromPayload, readCachedPayload, writeCachedPayload } from '@/lib/monitor/cache';
import type { FlightTrack } from '@/lib/monitor/types';

const RESOURCE = 'layers:flights';
const TTL_SECONDS = 5 * 60;

interface RegionWindow {
  id: string;
  lamin: number;
  lomin: number;
  lamax: number;
  lomax: number;
  defaultRisk: FlightTrack['riskLevel'];
}

const WINDOWS: RegionWindow[] = [
  { id: 'middle_east', lamin: 20, lomin: 34, lamax: 38, lomax: 60, defaultRisk: 'high' },
  { id: 'eastern_europe', lamin: 42, lomin: 22, lamax: 53, lomax: 41, defaultRisk: 'watch' },
  { id: 'south_china_sea', lamin: 5, lomin: 106, lamax: 24, lomax: 123, defaultRisk: 'watch' },
  { id: 'red_sea', lamin: 10, lomin: 32, lamax: 30, lomax: 46, defaultRisk: 'high' },
];

type OpenSkyState = [
  string | null,
  string | null,
  string | null,
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
  boolean | null,
  number | null,
  number | null,
  number | null,
  unknown,
  number | null,
  string | null,
  boolean | null,
  number | null,
  number | null,
];

interface OpenSkyResponse {
  time?: number;
  states?: OpenSkyState[];
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return null;
}

function toIsoFromUnix(value: number | null): string {
  if (value == null) return new Date().toISOString();
  const ms = value > 1e12 ? value : value * 1000;
  const date = new Date(ms);
  if (!Number.isFinite(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function computeRiskLevel(
  baseRisk: FlightTrack['riskLevel'],
  onGround: boolean,
  altitudeMeters: number | null,
  speedMps: number | null,
): FlightTrack['riskLevel'] {
  if (onGround) return 'monitor';
  if (baseRisk === 'high' && (altitudeMeters ?? 0) > 1200) return 'high';
  if ((speedMps ?? 0) >= 180 || (altitudeMeters ?? 0) > 7000) return baseRisk === 'monitor' ? 'watch' : baseRisk;
  return 'monitor';
}

async function fetchWindow(window: RegionWindow): Promise<OpenSkyState[]> {
  const url = new URL('https://opensky-network.org/api/states/all');
  url.searchParams.set('lamin', String(window.lamin));
  url.searchParams.set('lomin', String(window.lomin));
  url.searchParams.set('lamax', String(window.lamax));
  url.searchParams.set('lomax', String(window.lomax));

  const headers: HeadersInit = { 'User-Agent': 'GlobalMonitor/1.0' };
  if (process.env.OPENSKY_USERNAME && process.env.OPENSKY_PASSWORD) {
    const token = Buffer.from(`${process.env.OPENSKY_USERNAME}:${process.env.OPENSKY_PASSWORD}`).toString('base64');
    headers.Authorization = `Basic ${token}`;
  }

  const res = await fetch(url.toString(), {
    headers,
    signal: AbortSignal.timeout(10_000),
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(`opensky ${res.status}`);
  const payload = await res.json() as OpenSkyResponse;
  return Array.isArray(payload.states) ? payload.states : [];
}

function parseStatesToTracks(states: OpenSkyState[], window: RegionWindow): FlightTrack[] {
  const tracks: FlightTrack[] = [];

  for (const row of states) {
    const icao24 = typeof row[0] === 'string' ? row[0].trim() : '';
    const callsign = typeof row[1] === 'string' ? row[1].trim() : 'UNKNOWN';
    const originCountry = typeof row[2] === 'string' ? row[2].trim() : 'Unknown';
    const lon = numberOrNull(row[5]);
    const lat = numberOrNull(row[6]);
    if (lat == null || lon == null) continue;

    const altitudeMeters = numberOrNull(row[7]) ?? numberOrNull(row[13]);
    const onGround = Boolean(row[8]);
    const speedMps = numberOrNull(row[9]);
    const heading = numberOrNull(row[10]);
    const lastContact = toIsoFromUnix(numberOrNull(row[4]));
    const riskLevel = computeRiskLevel(window.defaultRisk, onGround, altitudeMeters, speedMps);

    tracks.push({
      id: `flt_${icao24 || callsign}_${window.id}`,
      callsign,
      originCountry,
      lat,
      lng: lon,
      altitudeMeters,
      speedMps,
      heading,
      onGround,
      lastContact,
      riskLevel,
      region: window.id,
      source: 'opensky',
    });
  }

  return tracks;
}

async function fetchOpenSkyTracks(): Promise<{ items: FlightTrack[]; failed: boolean; fetched: number }> {
  const deduped = new Map<string, FlightTrack>();
  let fetched = 0;
  let failures = 0;

  await Promise.all(WINDOWS.map(async (window) => {
    try {
      const rows = await fetchWindow(window);
      fetched += rows.length;
      const tracks = parseStatesToTracks(rows, window);
      for (const track of tracks) {
        const key = track.id.split('_').slice(0, 2).join('_');
        const existing = deduped.get(key);
        if (!existing) {
          deduped.set(key, track);
          continue;
        }
        if (new Date(track.lastContact) > new Date(existing.lastContact)) {
          deduped.set(key, track);
        }
      }
    } catch {
      failures += 1;
    }
  }));

  const items = [...deduped.values()]
    .sort((a, b) => new Date(b.lastContact).getTime() - new Date(a.lastContact).getTime())
    .slice(0, 500);

  return {
    items,
    fetched,
    failed: failures === WINDOWS.length,
  };
}

export async function GET() {
  const cached = await readCachedPayload<FlightTrack[]>(RESOURCE, TTL_SECONDS);
  if (cached.payload && cached.fresh) {
    return NextResponse.json(envelopeFromPayload(cached.payload, cached.ageSeconds, 'HIT'), {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=90' },
    });
  }

  const remote = await fetchOpenSkyTracks();
  const fallback = fallbackData as FlightTrack[];
  const items = remote.items.length > 0 ? remote.items : fallback;
  const sourceCoverage = [
    {
      source: 'OpenSky Network',
      tier: 'specialized' as const,
      weight: 0.88,
      fetched: remote.fetched,
      accepted: remote.items.length,
      failed: remote.failed,
    },
    {
      source: 'Fallback flights dataset',
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
