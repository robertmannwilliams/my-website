import { NextResponse } from 'next/server';

interface MarketPrice {
  symbol: string;
  name: string;
  price: number | null;
  change_percent: number | null;
  last_updated: string;
}

// In-memory cache
let cachedData: { prices: MarketPrice[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 60_000;

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

  // Return in display order: SPX, DXY, 10Y, WTI, GOLD, VIX, BTC
  const order = ['SPX', 'DXY', '10Y', 'WTI', 'GOLD', 'VIX', 'BTC'];
  const all = [...yahoo, btc];
  return order.map((s) => all.find((p) => p.symbol === s)!);
}

export async function GET() {
  const now = Date.now();

  if (cachedData && now - cachedData.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cachedData.prices, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' },
    });
  }

  const prices = await fetchAllPrices();
  cachedData = { prices, timestamp: now };

  return NextResponse.json(prices, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' },
  });
}
