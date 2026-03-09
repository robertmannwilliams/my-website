import { NextResponse } from 'next/server';
import data from '@/app/monitor/data/notams.json';
import { envelopeFromPayload, readCachedPayload, writeCachedPayload } from '@/lib/monitor/cache';

interface NotamZone {
  id: string;
  name: string;
  authority: string;
  reason: string;
  effectiveFrom: string;
  effectiveTo: string;
  coordinates: [number, number][];
}

const RESOURCE = 'layers:notams';
const TTL_SECONDS = 15 * 60;

async function fetchRemoteNotams(): Promise<NotamZone[] | null> {
  const url = process.env.MONITOR_NOTAM_SOURCE_URL;
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
      .map((row) => row as NotamZone)
      .filter((row) => (
        typeof row?.id === 'string' &&
        typeof row?.name === 'string' &&
        Array.isArray(row?.coordinates) &&
        row.coordinates.length >= 3
      ));
  } catch {
    return null;
  }
}

export async function GET() {
  const cached = await readCachedPayload<NotamZone[]>(RESOURCE, TTL_SECONDS);
  if (cached.payload && cached.fresh) {
    return NextResponse.json(envelopeFromPayload(cached.payload, cached.ageSeconds, 'HIT'), {
      headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=120' },
    });
  }

  const remoteItems = await fetchRemoteNotams();
  const fallbackItems = data as NotamZone[];
  const items = remoteItems && remoteItems.length > 0 ? remoteItems : fallbackItems;

  const sourceCoverage = remoteItems
    ? [
      {
        source: 'Remote NOTAM source',
        tier: 'specialized' as const,
        weight: 0.92,
        fetched: remoteItems.length,
        accepted: items.length,
        failed: false,
      },
    ]
    : [
    {
      source: 'Curated NOTAM feed',
      tier: 'specialized' as const,
      weight: 0.85,
      fetched: items.length,
      accepted: items.length,
      failed: false,
    },
    ];

  const stored = await writeCachedPayload(RESOURCE, items, sourceCoverage, TTL_SECONDS);
  return NextResponse.json(envelopeFromPayload(stored, 0, 'MISS'), {
    headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=120' },
  });
}
