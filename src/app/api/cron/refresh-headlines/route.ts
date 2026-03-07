import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';

  try {
    const res = await fetch(`${baseUrl}/api/events/headlines`, {
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) return NextResponse.json({ ok: false, status: res.status }, { status: 500 });

    const payload = await res.json();
    return NextResponse.json({
      ok: true,
      count: Array.isArray(payload?.items) ? payload.items.length : 0,
      cacheState: payload?.meta?.cacheState || 'unknown',
      refreshedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
