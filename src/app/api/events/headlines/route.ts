import { NextResponse } from 'next/server';
import { fetchTieredHeadlines } from '@/lib/monitor/headlines';
import { envelopeFromPayload, readCachedPayload, writeCachedPayload } from '@/lib/monitor/cache';
import { incrementMetric } from '@/lib/monitor/metrics';

const RESOURCE = 'headlines';
const TTL_SECONDS = 5 * 60;

export async function GET() {
  const cached = await readCachedPayload(RESOURCE, TTL_SECONDS);
  if (cached.payload && cached.fresh) {
    await incrementMetric('api_headlines_cache_hit');
    const response = envelopeFromPayload(cached.payload, cached.ageSeconds, 'HIT');
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=120',
        'X-Cache': 'HIT',
      },
    });
  }

  try {
    const result = await fetchTieredHeadlines(50);
    const tickerItems = result.items.map((item) => ({
      title: item.title,
      source: item.source,
      url: item.url,
      timestamp: item.timestamp,
      isBreaking: item.isBreaking,
      signalScore: item.signalScore,
    }));

    const stored = await writeCachedPayload(RESOURCE, tickerItems, result.sourceCoverage, TTL_SECONDS);
    await incrementMetric('api_headlines_cache_miss');

    const response = envelopeFromPayload(stored, 0, 'MISS');
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=120',
        'X-Cache': 'MISS',
      },
    });
  } catch {
    await incrementMetric('api_headlines_error');

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
