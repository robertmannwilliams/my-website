import { NextResponse } from 'next/server';
import { envelopeFromPayload, readCachedPayload, writeCachedPayload } from '@/lib/monitor/cache';
import { incrementMetric } from '@/lib/monitor/metrics';

interface MarketPrice {
  symbol: string;
  name: string;
  price: number | null;
  change_percent: number | null;
  last_updated: string;
}

const RESOURCE = 'prices';
const TTL_SECONDS = 60;

const YAHOO_SYMBOLS: Record<string, { ticker: string; name: string }> = {
  SPX: { ticker: '%5EGSPC', name: 'S&P 500' },
  DXY: { ticker: 'DX-Y.NYB', name: 'US Dollar Index' },
  '10Y': { ticker: '%5ETNX', name: '10Y Treasury' },
  WTI: { ticker: 'CL%3DF', name: 'WTI Crude' },
  GOLD: { ticker: 'GC%3DF', name: 'Gold' },
  VIX: { ticker: '%5EVIX', name: 'CBOE VIX' },
};

async function fetchYahooPrice(
  symbol: string,
  ticker: string,
  name: string,
): Promise<MarketPrice> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=1d&interval=1d`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) throw new Error(`Yahoo ${res.status}`);

    const data = await res.json();
    const meta = data.chart?.result?.[0]?.meta;
    if (!meta) throw new Error('No meta');

    const price = meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose ?? meta.previousClose;
    const change_percent =
      prevClose && prevClose !== 0
        ? ((price - prevClose) / prevClose) * 100
        : null;

    return {
      symbol,
      name,
      price,
      change_percent,
      last_updated: new Date().toISOString(),
    };
  } catch {
    return {
      symbol,
      name,
      price: null,
      change_percent: null,
      last_updated: new Date().toISOString(),
    };
  }
}

async function fetchBTCPrice(): Promise<MarketPrice> {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true',
      { signal: AbortSignal.timeout(8000) },
    );

    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);

    const data = await res.json();
    return {
      symbol: 'BTC',
      name: 'Bitcoin',
      price: data.bitcoin?.usd ?? null,
      change_percent: data.bitcoin?.usd_24h_change ?? null,
      last_updated: new Date().toISOString(),
    };
  } catch {
    return {
      symbol: 'BTC',
      name: 'Bitcoin',
      price: null,
      change_percent: null,
      last_updated: new Date().toISOString(),
    };
  }
}

async function fetchAllPrices(): Promise<MarketPrice[]> {
  const yahooPromises = Object.entries(YAHOO_SYMBOLS).map(
    ([symbol, { ticker, name }]) => fetchYahooPrice(symbol, ticker, name),
  );

  const [btc, ...yahoo] = await Promise.all([
    fetchBTCPrice(),
    ...yahooPromises,
  ]);

  const order = ['SPX', 'DXY', '10Y', 'WTI', 'GOLD', 'VIX', 'BTC'];
  const all = [...yahoo, btc];
  return order.map((s) => all.find((p) => p.symbol === s)!).filter(Boolean);
}

export async function GET() {
  const cached = await readCachedPayload<MarketPrice[]>(RESOURCE, TTL_SECONDS);
  if (cached.payload && cached.fresh) {
    await incrementMetric('api_prices_cache_hit');
    const response = envelopeFromPayload(cached.payload, cached.ageSeconds, 'HIT');
    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' },
    });
  }

  try {
    const prices = await fetchAllPrices();
    const sourceCoverage = [
      {
        source: 'Yahoo Finance',
        tier: 'tier1' as const,
        weight: 1,
        fetched: prices.filter((p) => p.symbol !== 'BTC').length,
        accepted: prices.filter((p) => p.symbol !== 'BTC').length,
        failed: false,
      },
      {
        source: 'CoinGecko',
        tier: 'tier1' as const,
        weight: 1,
        fetched: 1,
        accepted: prices.some((p) => p.symbol === 'BTC') ? 1 : 0,
        failed: false,
      },
    ];

    const stored = await writeCachedPayload(RESOURCE, prices, sourceCoverage, TTL_SECONDS);
    await incrementMetric('api_prices_cache_miss');

    const response = envelopeFromPayload(stored, 0, 'MISS');
    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' },
    });
  } catch {
    await incrementMetric('api_prices_error');

    if (cached.payload) {
      const response = envelopeFromPayload(cached.payload, cached.ageSeconds, 'STALE');
      return NextResponse.json(response, {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' },
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
