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

export async function GET() {
  const cached = await readCachedPayload<Chokepoint[]>(RESOURCE, TTL_SECONDS);
  if (cached.payload && cached.fresh) {
    return NextResponse.json(envelopeFromPayload(cached.payload, cached.ageSeconds, 'HIT'), {
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=120' },
    });
  }

  const items = data as Chokepoint[];
  const sourceCoverage = [
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
