import { NextResponse } from 'next/server';
import { fetchClassifiedEvents } from '@/lib/monitor/events';
import { envelopeFromPayload, readCachedPayload, writeCachedPayload } from '@/lib/monitor/cache';
import { incrementMetric } from '@/lib/monitor/metrics';

const RESOURCE = 'events';
const TTL_SECONDS = 10 * 60;

export async function GET() {
  const cached = await readCachedPayload(RESOURCE, TTL_SECONDS);
  if (cached.payload && cached.fresh) {
    await incrementMetric('api_events_cache_hit');
    const response = envelopeFromPayload(cached.payload, cached.ageSeconds, 'HIT');
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=120',
        'X-Cache': 'HIT',
      },
    });
  }

  try {
    const result = await fetchClassifiedEvents();
    const stored = await writeCachedPayload(RESOURCE, result.items, result.sourceCoverage, TTL_SECONDS);
    await incrementMetric('api_events_cache_miss');

    const response = envelopeFromPayload(stored, 0, 'MISS');
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=120',
        'X-Cache': 'MISS',
        'X-Event-Count': String(result.items.length),
      },
    });
  } catch {
    await incrementMetric('api_events_error');

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
