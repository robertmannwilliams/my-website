import { NextResponse } from 'next/server';
import { fetchPolymarkets, type PolymarketMarket } from '@/lib/monitor/polymarket';

let cachedData: { markets: PolymarketMarket[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 30 * 60_000; // 30 minutes

export async function GET() {
  const now = Date.now();

  if (cachedData && now - cachedData.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cachedData.markets, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=60',
        'X-Cache': 'HIT',
        'X-Cache-Age': String(Math.round((now - cachedData.timestamp) / 1000)),
      },
    });
  }

  try {
    const markets = await fetchPolymarkets();
    cachedData = { markets, timestamp: now };

    return NextResponse.json(markets, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=60',
        'X-Cache': 'MISS',
        'X-Market-Count': String(markets.length),
      },
    });
  } catch {
    if (cachedData) {
      return NextResponse.json(cachedData.markets, {
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
