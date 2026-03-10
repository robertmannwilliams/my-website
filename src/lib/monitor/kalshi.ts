import {
  classifyCategory,
  formatVolume,
  geocodeForMarket,
  looksGeopolitical,
  marketSignalScore,
  normalizedTokens,
  type PolymarketMarket,
} from './polymarket';
import { incrementMetric } from './metrics';
import type { SourceCoverageEntry } from './response';

interface KalshiMarketRaw {
  ticker?: string;
  title?: string;
  subtitle?: string;
  status?: string;
  expiration_time?: string;
  close_time?: string;
  updated_time?: string;
  volume?: number | string;
  volume_24h?: number | string;
  open_interest?: number | string;
  liquidity_dollars?: number | string;
  liquidity?: number | string;
  yes_bid?: number | string;
  yes_ask?: number | string;
  last_price?: number | string;
  yes_bid_dollars?: number | string;
  yes_ask_dollars?: number | string;
  last_price_dollars?: number | string;
  market_url?: string;
}

interface KalshiMarketsResponse {
  markets?: KalshiMarketRaw[];
  cursor?: string | null;
}

export interface KalshiFeedResult {
  markets: PolymarketMarket[];
  coverage: SourceCoverageEntry | null;
}

function envEnabled(): boolean {
  const raw = (process.env.MONITOR_ENABLE_KALSHI || '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeProbability(value: number): number {
  const raw = value > 1.5 ? value / 100 : value;
  return clamp(raw, 0.01, 0.99);
}

function readProbability(row: KalshiMarketRaw): number {
  const candidates = [
    numberOrNull(row.last_price_dollars),
    numberOrNull(row.yes_ask_dollars),
    numberOrNull(row.yes_bid_dollars),
    numberOrNull(row.last_price),
    numberOrNull(row.yes_ask),
    numberOrNull(row.yes_bid),
  ].filter((value): value is number => value != null);

  if (candidates.length === 0) return 0.5;
  return normalizeProbability(candidates[0]);
}

function asIso(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return null;
  return parsed.toISOString();
}

function endpointBase(): string {
  const configured = process.env.MONITOR_KALSHI_BASE_URL;
  if (configured && configured.trim()) return configured.replace(/\/$/, '');
  return 'https://api.elections.kalshi.com/trade-api/v2';
}

async function fetchPage(cursor: string | null): Promise<KalshiMarketsResponse | null> {
  const url = new URL(`${endpointBase()}/markets`);
  url.searchParams.set('status', 'open');
  url.searchParams.set('limit', '200');
  if (cursor) url.searchParams.set('cursor', cursor);

  try {
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'GlobalMonitor/1.0' },
      signal: AbortSignal.timeout(12_000),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json() as KalshiMarketsResponse;
  } catch {
    return null;
  }
}

function toMarkets(rows: KalshiMarketRaw[]): PolymarketMarket[] {
  const out: PolymarketMarket[] = [];

  for (const row of rows) {
    const title = typeof row.title === 'string' ? row.title.trim() : '';
    if (!title) continue;

    const text = `${title} ${typeof row.subtitle === 'string' ? row.subtitle : ''}`.trim();
    const category = classifyCategory(text);
    if (!category && !looksGeopolitical(text)) continue;
    const finalCategory = category || 'diplomacy';

    const geo = geocodeForMarket(text, finalCategory);
    const volumeRaw = numberOrNull(row.volume_24h) ?? numberOrNull(row.volume) ?? numberOrNull(row.open_interest) ?? 0;
    const liquidityRaw = numberOrNull(row.liquidity_dollars) ?? numberOrNull(row.liquidity) ?? 0;
    const probability = readProbability(row);
    const ticker = typeof row.ticker === 'string' && row.ticker.trim() ? row.ticker.trim() : `unknown-${out.length}`;
    const endDate = asIso(row.expiration_time) || asIso(row.close_time) || new Date().toISOString();
    const updatedAt = asIso(row.updated_time) || new Date().toISOString();
    const url = typeof row.market_url === 'string' && row.market_url.trim()
      ? row.market_url.trim()
      : `https://kalshi.com/markets/${encodeURIComponent(ticker)}`;

    out.push({
      id: `kalshi_${ticker}`,
      provider: 'kalshi',
      title: text,
      category: finalCategory,
      categoryNormalized: finalCategory,
      probability,
      volume: formatVolume(volumeRaw),
      volumeRaw,
      lat: geo.lat,
      lng: geo.lng,
      url,
      lastUpdated: updatedAt,
      outcomes: ['Yes', 'No'],
      outcomePrices: [probability, 1 - probability],
      liquidity: liquidityRaw,
      endDate,
      geoConfidence: geo.geoConfidence,
      geoMethod: geo.geoMethod,
      isMapPlottable: geo.isMapPlottable,
      signalScore: 0,
      topicTags: normalizedTokens(text).slice(0, 8),
      mapPriority: 0,
      geoValidity: geo.geoValidity,
      geoReason: geo.geoReason,
    });
  }

  for (const market of out) {
    market.signalScore = marketSignalScore(market);
    market.mapPriority = market.signalScore;
  }

  out.sort((a, b) => b.signalScore - a.signalScore);
  return out;
}

export async function fetchKalshiMarkets(): Promise<KalshiFeedResult> {
  if (!envEnabled()) {
    return { markets: [], coverage: null };
  }

  const rows: KalshiMarketRaw[] = [];
  let cursor: string | null = null;
  let pages = 0;
  let hadFailure = false;

  while (pages < 5) {
    const page = await fetchPage(cursor);
    if (!page) {
      hadFailure = true;
      break;
    }
    const pageRows = Array.isArray(page.markets) ? page.markets : [];
    rows.push(...pageRows);
    pages += 1;
    cursor = page.cursor || null;
    if (!cursor || pageRows.length === 0) break;
  }

  const markets = toMarkets(rows).slice(0, 120);
  await incrementMetric('markets_kalshi_raw_count', rows.length);
  await incrementMetric('markets_kalshi_final_count', markets.length);

  const coverage: SourceCoverageEntry = {
    source: 'Kalshi Trade API',
    tier: 'tier1',
    weight: 0.9,
    fetched: rows.length,
    accepted: markets.length,
    failed: hadFailure && rows.length === 0,
  };

  return { markets, coverage };
}
