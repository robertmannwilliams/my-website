import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Verify the request is from Vercel Cron (in production)
  const authHeader = request.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Trigger a fresh fetch of geopolitical events by calling our own API
    // This warms the cache for subsequent client requests
    const baseUrl =
      process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';

    const res = await fetch(`${baseUrl}/api/events/geopolitical`, {
      headers: { 'Cache-Control': 'no-cache' },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to refresh', status: res.status },
        { status: 500 },
      );
    }

    const events = await res.json();

    return NextResponse.json({
      ok: true,
      eventCount: Array.isArray(events) ? events.length : 0,
      refreshedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Refresh failed', message: String(err) },
      { status: 500 },
    );
  }
}
