import { NextResponse } from 'next/server';
import { fetchEarthquakes, type UsgsEarthquake } from '@/lib/monitor/usgs';
import { envelopeFromPayload, readCachedPayload, writeCachedPayload } from '@/lib/monitor/cache';
import { incrementMetric } from '@/lib/monitor/metrics';

const RESOURCE = 'disasters';
const TTL_SECONDS = 10 * 60;

export async function GET() {
  const cached = await readCachedPayload<UsgsEarthquake[]>(RESOURCE, TTL_SECONDS);
  if (cached.payload && cached.fresh) {
    await incrementMetric('api_disasters_cache_hit');
    const response = envelopeFromPayload(cached.payload, cached.ageSeconds, 'HIT');
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=120',
        'X-Cache': 'HIT',
      },
    });
  }

  try {
    const earthquakes = await fetchEarthquakes();
    const sourceCoverage = [
      {
        source: 'USGS',
        tier: 'tier1' as const,
        weight: 1,
        fetched: earthquakes.length,
        accepted: earthquakes.length,
        failed: false,
      },
    ];

    const stored = await writeCachedPayload(RESOURCE, earthquakes, sourceCoverage, TTL_SECONDS);
    await incrementMetric('api_disasters_cache_miss');

    const response = envelopeFromPayload(stored, 0, 'MISS');
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=120',
        'X-Cache': 'MISS',
        'X-Earthquake-Count': String(earthquakes.length),
      },
    });
  } catch {
    await incrementMetric('api_disasters_error');

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
