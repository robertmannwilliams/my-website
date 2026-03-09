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

async function fetchRemoteElections(): Promise<ElectionItem[] | null> {
  const url = process.env.MONITOR_ELECTIONS_SOURCE_URL;
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
      .map((row) => row as ElectionItem)
      .filter((row) => (
        typeof row?.id === 'string' &&
        typeof row?.country === 'string' &&
        typeof row?.date === 'string' &&
        Number.isFinite(row?.lat) &&
        Number.isFinite(row?.lng)
      ));
  } catch {
    return null;
  }
}

export async function GET() {
  const cached = await readCachedPayload<ElectionItem[]>(RESOURCE, TTL_SECONDS);
  if (cached.payload && cached.fresh) {
    return NextResponse.json(envelopeFromPayload(cached.payload, cached.ageSeconds, 'HIT'), {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300' },
    });
  }

  const remoteItems = await fetchRemoteElections();
  const fallbackItems = data as ElectionItem[];
  const items = enrich(remoteItems && remoteItems.length > 0 ? remoteItems : fallbackItems);

  const sourceCoverage = remoteItems
    ? [
      {
        source: 'Remote elections source',
        tier: 'specialized' as const,
        weight: 0.9,
        fetched: remoteItems.length,
        accepted: items.length,
        failed: false,
      },
    ]
    : [
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
