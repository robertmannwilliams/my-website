import { NextResponse } from 'next/server';
import { fetchPolymarkets, type PolymarketMarket } from '@/lib/monitor/polymarket';
import { envelopeFromPayload, readCachedPayload, writeCachedPayload } from '@/lib/monitor/cache';
import { incrementMetric } from '@/lib/monitor/metrics';

const RESOURCE = 'markets';
const TTL_SECONDS = 5 * 60;

export async function GET() {
  const cached = await readCachedPayload<PolymarketMarket[]>(RESOURCE, TTL_SECONDS);
  if (cached.payload && cached.fresh) {
    await incrementMetric('api_markets_cache_hit');
    const response = envelopeFromPayload(cached.payload, cached.ageSeconds, 'HIT');
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=120',
        'X-Cache': 'HIT',
      },
    });
  }

  try {
    const markets = await fetchPolymarkets();
    const sourceCoverage = [
      {
        source: 'Polymarket Gamma API',
        tier: 'tier1' as const,
        weight: 1,
        fetched: markets.length,
        accepted: markets.length,
        failed: false,
      },
    ];

    const stored = await writeCachedPayload(RESOURCE, markets, sourceCoverage, TTL_SECONDS);
    await incrementMetric('api_markets_cache_miss');

    const response = envelopeFromPayload(stored, 0, 'MISS');
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=120',
        'X-Cache': 'MISS',
        'X-Market-Count': String(markets.length),
      },
    });
  } catch {
    await incrementMetric('api_markets_error');

    if (cached.payload) {
      const response = envelopeFromPayload(cached.payload, cached.ageSeconds, 'STALE');
      return NextResponse.json(response, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          'X-Cache': 'STALE',
        },
      });
    }

    return NextResponse.json(
      {
        items: [],
        meta: {
          generatedAt: new Date().toISOString(),
          freshnessSeconds: 0,
          cacheState: 'BYPASS',
          pipelineVersion: 'monitor-v1',
          sourceCoverage: [],
        },
      },
      {
        status: 503,
        headers: { 'Retry-After': '60' },
      },
    );
  }
}
