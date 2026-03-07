import { NextResponse } from 'next/server';
import data from '@/app/monitor/data/elections.json';
import { envelopeFromPayload, readCachedPayload, writeCachedPayload } from '@/lib/monitor/cache';

interface ElectionItem {
  id: string;
  country: string;
  electionType: string;
  date: string;
  lat: number;
  lng: number;
  importance: 'critical' | 'watch' | 'monitor';
  daysUntil?: number;
}

const RESOURCE = 'layers:elections';
const TTL_SECONDS = 60 * 60;

function enrich(items: ElectionItem[]): ElectionItem[] {
  const now = Date.now();
  return items.map((item) => {
    const daysUntil = Math.ceil((new Date(item.date).getTime() - now) / 86_400_000);
    return { ...item, daysUntil };
  });
}

export async function GET() {
  const cached = await readCachedPayload<ElectionItem[]>(RESOURCE, TTL_SECONDS);
  if (cached.payload && cached.fresh) {
    return NextResponse.json(envelopeFromPayload(cached.payload, cached.ageSeconds, 'HIT'), {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300' },
    });
  }

  const items = enrich(data as ElectionItem[]);
  const sourceCoverage = [
    {
      source: 'Curated election calendar',
      tier: 'specialized' as const,
      weight: 0.85,
      fetched: items.length,
      accepted: items.length,
      failed: false,
    },
  ];

  const stored = await writeCachedPayload(RESOURCE, items, sourceCoverage, TTL_SECONDS);
  return NextResponse.json(envelopeFromPayload(stored, 0, 'MISS'), {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300' },
  });
}
