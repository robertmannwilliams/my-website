import { NextResponse } from 'next/server';
import { fetchEarthquakes, type UsgsEarthquake } from '@/lib/monitor/usgs';

let cachedData: { earthquakes: UsgsEarthquake[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 10 * 60_000; // 10 minutes

export async function GET() {
  const now = Date.now();

  if (cachedData && now - cachedData.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cachedData.earthquakes, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=60',
        'X-Cache': 'HIT',
        'X-Cache-Age': String(Math.round((now - cachedData.timestamp) / 1000)),
      },
    });
  }

  try {
    const earthquakes = await fetchEarthquakes();
    cachedData = { earthquakes, timestamp: now };

    return NextResponse.json(earthquakes, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=60',
        'X-Cache': 'MISS',
        'X-Earthquake-Count': String(earthquakes.length),
      },
    });
  } catch {
    if (cachedData) {
      return NextResponse.json(cachedData.earthquakes, {
        headers: {
          'Cache-Control': 'public, s-maxage=60',
          'X-Cache': 'STALE',
        },
      });
    }

    return NextResponse.json([], {
      status: 503,
      headers: { 'Retry-After': '60' },
    });
  }
}
