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

export async function GET() {
  const cached = await readCachedPayload<NotamZone[]>(RESOURCE, TTL_SECONDS);
  if (cached.payload && cached.fresh) {
    return NextResponse.json(envelopeFromPayload(cached.payload, cached.ageSeconds, 'HIT'), {
      headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=120' },
    });
  }

  const items = data as NotamZone[];
  const sourceCoverage = [
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
