import { NextResponse } from 'next/server';

interface RefreshResult {
  ok: boolean;
  count: number;
  cacheState: string;
  status?: number;
}

async function refreshOne(baseUrl: string, path: string): Promise<RefreshResult> {
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) return { ok: false, count: 0, cacheState: 'error', status: res.status };
    const payload = await res.json();
    const count = Array.isArray(payload?.items) ? payload.items.length : 0;
    return {
      ok: true,
      count,
      cacheState: payload?.meta?.cacheState || 'unknown',
    };
  } catch {
    return { ok: false, count: 0, cacheState: 'error' };
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';

  const [flights, notams, shipping, shippingLive, elections] = await Promise.all([
    refreshOne(baseUrl, '/api/layers/flights'),
    refreshOne(baseUrl, '/api/layers/notams'),
    refreshOne(baseUrl, '/api/layers/shipping'),
    refreshOne(baseUrl, '/api/layers/shipping-live'),
    refreshOne(baseUrl, '/api/layers/elections'),
  ]);

  const ok = flights.ok && notams.ok && shipping.ok && shippingLive.ok && elections.ok;
  const status = ok ? 200 : 500;

  return NextResponse.json({
    ok,
    flights,
    notams,
    shipping,
    shippingLive,
    elections,
    refreshedAt: new Date().toISOString(),
  }, { status });
}
