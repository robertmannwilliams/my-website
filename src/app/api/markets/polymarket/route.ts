import { NextResponse } from 'next/server';
import { fetchPolymarkets, type PolymarketMarket } from '@/lib/monitor/polymarket';
import { fetchKalshiMarkets } from '@/lib/monitor/kalshi';
import { envelopeFromPayload, readCachedPayload, writeCachedPayload } from '@/lib/monitor/cache';
import { incrementMetric } from '@/lib/monitor/metrics';
import type { SourceCoverageEntry } from '@/lib/monitor/response';

const RESOURCE = 'markets';
const TTL_SECONDS = 5 * 60;

function normalizeKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function mergedMarkets(...sources: PolymarketMarket[][]): PolymarketMarket[] {
  const out: PolymarketMarket[] = [];
  const byKey = new Map<string, PolymarketMarket>();

  for (const source of sources) {
    for (const market of source) {
      const end = new Date(market.endDate);
      const endDay = Number.isFinite(end.getTime())
        ? `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, '0')}-${String(end.getUTCDate()).padStart(2, '0')}`
        : 'na';
      const key = `${normalizeKey(market.title)}|${market.category}|${endDay}`;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, market);
        continue;
      }

      const existingScore = existing.signalScore + Math.log10(Math.max(10, existing.volumeRaw));
      const candidateScore = market.signalScore + Math.log10(Math.max(10, market.volumeRaw));
      if (candidateScore > existingScore) {
        byKey.set(key, market);
      } else if (existing.provider !== market.provider) {
        existing.topicTags = [...new Set([...existing.topicTags, ...market.topicTags])].slice(0, 10);
      }
    }
  }

  out.push(...byKey.values());
  out.sort((a, b) => b.signalScore - a.signalScore);
  return out.slice(0, 140);
}

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
    let polymarketRows: PolymarketMarket[] = [];
    let kalshiRows: PolymarketMarket[] = [];
    const sourceCoverage: SourceCoverageEntry[] = [];

    try {
      polymarketRows = await fetchPolymarkets();
      sourceCoverage.push({
        source: 'Polymarket Gamma API',
        tier: 'tier1' as const,
        weight: 1,
        fetched: polymarketRows.length,
        accepted: polymarketRows.length,
        failed: false,
      });
    } catch {
      sourceCoverage.push({
        source: 'Polymarket Gamma API',
        tier: 'tier1' as const,
        weight: 1,
        fetched: 0,
        accepted: 0,
        failed: true,
      });
    }

    const kalshi = await fetchKalshiMarkets();
    kalshiRows = kalshi.markets;
    if (kalshi.coverage) sourceCoverage.push(kalshi.coverage);

    const markets = mergedMarkets(polymarketRows, kalshiRows);
    await incrementMetric('markets_combined_count', markets.length);

    if (markets.length === 0 && sourceCoverage.some((source) => source.failed)) {
      throw new Error('All market sources failed');
    }

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
