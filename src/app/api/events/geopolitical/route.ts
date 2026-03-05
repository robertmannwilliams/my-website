import { NextResponse } from 'next/server';
import { fetchClassifiedEvents, type GdeltEvent } from '@/lib/monitor/events';

// In-memory cache
let cachedData: { events: GdeltEvent[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 15 * 60_000; // 15 minutes

export async function GET() {
  const now = Date.now();

  if (cachedData && cachedData.events.length > 0 && now - cachedData.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cachedData.events, {
      headers: {
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=60',
        'X-Cache': 'HIT',
        'X-Cache-Age': String(Math.round((now - cachedData.timestamp) / 1000)),
      },
    });
  }

  try {
    const events = await fetchClassifiedEvents();
    cachedData = { events, timestamp: now };

    return NextResponse.json(events, {
      headers: {
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=60',
        'X-Cache': 'MISS',
        'X-Event-Count': String(events.length),
      },
    });
  } catch {
    // Return stale cache if available, otherwise empty
    if (cachedData) {
      return NextResponse.json(cachedData.events, {
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
