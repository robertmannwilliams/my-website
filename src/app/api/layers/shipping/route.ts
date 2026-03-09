import { NextResponse } from 'next/server';
import data from '@/app/monitor/data/shipping-chokepoints.json';
import { envelopeFromPayload, readCachedPayload, writeCachedPayload } from '@/lib/monitor/cache';

interface Chokepoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  vesselCount: number;
  tankerCount: number;
  containerCount: number;
  riskLevel: 'high' | 'watch' | 'monitor';
}

const RESOURCE = 'layers:shipping';
const TTL_SECONDS = 10 * 60;

async function fetchRemoteShipping(): Promise<Chokepoint[] | null> {
  const url = process.env.MONITOR_SHIPPING_SOURCE_URL;
  if (!url) return null;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'GlobalMonitor/1.0' },
      signal: AbortSignal.timeout(12_000),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const payload = await res.json();
    if (!Array.isArray(payload)) return null;
    return payload
      .map((row) => row as Chokepoint)
      .filter((row) => (
        typeof row?.id === 'string' &&
        typeof row?.name === 'string' &&
        Number.isFinite(row?.lat) &&
        Number.isFinite(row?.lng)
      ));
  } catch {
    return null;
  }
}

export async function GET() {
  const cached = await readCachedPayload<Chokepoint[]>(RESOURCE, TTL_SECONDS);
  if (cached.payload && cached.fresh) {
    return NextResponse.json(envelopeFromPayload(cached.payload, cached.ageSeconds, 'HIT'), {
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=120' },
    });
  }

  const remoteItems = await fetchRemoteShipping();
  const fallbackItems = data as Chokepoint[];
  const items = remoteItems && remoteItems.length > 0 ? remoteItems : fallbackItems;

  const sourceCoverage = remoteItems
    ? [
      {
        source: 'Remote shipping source',
        tier: 'specialized' as const,
        weight: 0.9,
        fetched: remoteItems.length,
        accepted: items.length,
        failed: false,
      },
    ]
    : [
    {
      source: 'Open AIS aggregate',
      tier: 'specialized' as const,
      weight: 0.8,
      fetched: items.length,
      accepted: items.length,
      failed: false,
    },
    ];

  const stored = await writeCachedPayload(RESOURCE, items, sourceCoverage, TTL_SECONDS);
  return NextResponse.json(envelopeFromPayload(stored, 0, 'MISS'), {
    headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=120' },
  });
}
