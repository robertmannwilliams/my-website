import type { GdeltEvent } from './events';
import { centroidForRegion, geocodeText, type GeoMatchMethod } from './geo';
import { incrementMetric } from './metrics';

export interface PolymarketMarket {
  id: string;
  title: string;
  category: MarketCategory;
  categoryNormalized: MarketCategory;
  probability: number;
  volume: string;
  volumeRaw: number;
  lat: number;
  lng: number;
  url: string;
  lastUpdated: string;
  outcomes: string[];
  outcomePrices: number[];
  liquidity: number;
  endDate: string;
  geoConfidence: number;
  geoMethod: GeoMatchMethod;
  isMapPlottable: boolean;
  signalScore: number;
  topicTags: string[];
  mapPriority: number;
  linkConfidence?: number;
  linkReason?: string[];
  geoValidity: 'valid' | 'ambiguous' | 'invalid';
  geoReason: string;
}

export type MarketCategory =
  | 'conflict'
  | 'politics'
  | 'economy'
  | 'climate'
  | 'diplomacy';

interface GammaMarket {
  id: string;
  question: string;
  slug: string;
  endDate: string;
  liquidity: string;
  volume: string;
  outcomes: string;
  outcomePrices: string;
  active: boolean;
  closed: boolean;
}

const EXCLUDE_KEYWORDS = [
  'nfl', 'nba', 'mlb', 'nhl', 'premier league', 'champions league',
  'f1', 'formula 1', 'ufc', 'boxing', 'tennis', 'golf', 'masters tournament',
  'world cup', 'super bowl', 'world series', 'stanley cup', 'march madness',
  'bitcoin price', 'ethereum price', 'solana', 'altcoin', 'defi', 'nft',
  'memecoin', 'stablecoin', 'dogecoin',
  'oscar', 'grammy', 'emmy', 'golden globe',
  'movie', 'tv show', 'streamer', 'influencer',
  'weather tomorrow',
];

const GEOPOLITICAL_HINTS = [
  'war', 'election', 'president', 'prime minister', 'fed', 'ecb', 'tariff',
  'sanction', 'treaty', 'ceasefire', 'missile', 'troops', 'nuclear',
  'ukraine', 'russia', 'iran', 'israel', 'china', 'taiwan', 'middle east',
];

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'will', 'would',
  'could', 'should', 'after', 'before', 'about', 'over', 'under', 'near', 'amid',
  'a', 'an', 'to', 'of', 'in', 'on', 'at', 'by', 'or', 'is', 'are', 'be', 'as',
  'us', 'u.s', 'any', 'more', 'less', 'than', 'how', 'what', 'who', 'when', 'where',
]);

const CATEGORY_KEYWORDS: Record<MarketCategory, string[]> = {
  conflict: [
    'war', 'military', 'attack', 'invasion', 'strike', 'clash', 'ceasefire',
    'missile', 'troops', 'airstrike', 'nato', 'nuclear', 'weapon', 'army',
    'conflict', 'houthi', 'hezbollah', 'hamas', 'drone strike', 'frontline',
  ],
  politics: [
    'election', 'president', 'vote', 'resign', 'impeach', 'congress',
    'parliament', 'prime minister', 'governor', 'senator', 'poll',
    'nominee', 'inaugurat', 'cabinet', 'speaker', 'democrat', 'republican',
    'party leader', 'coalition',
  ],
  economy: [
    'fed ', 'federal reserve', 'interest rate', 'gdp', 'recession',
    'inflation', 'tariff', 'trade deal', 'ecb', 'bank of', 'imf',
    'world bank', 'debt ceiling', 'shutdown', 'fiscal', 'stimulus',
    'employment', 'jobs report', 'cpi', 'oil price', 'opec', 'yield',
  ],
  climate: [
    'earthquake', 'hurricane', 'flood', 'wildfire', 'climate',
    'temperature', 'tornado', 'tsunami', 'drought', 'sea level',
    'emission', 'paris agreement', 'carbon',
  ],
  diplomacy: [
    'treaty', 'sanction', 'un ', 'united nations', 'summit', 'diplomatic',
    'ambassador', 'annexation', 'sovereignty', 'border dispute',
    'peace deal', 'negotiations', 'accord', 'alliance', 'g7', 'g20',
  ],
};

function isExcluded(question: string): boolean {
  const lower = question.toLowerCase();
  return EXCLUDE_KEYWORDS.some((kw) => lower.includes(kw));
}

function classifyCategory(question: string): MarketCategory | null {
  const lower = question.toLowerCase();

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS) as [MarketCategory, string[]][]) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return cat;
    }
  }

  if (GEOPOLITICAL_HINTS.some((kw) => lower.includes(kw))) {
    return 'diplomacy';
  }

  return null;
}

function looksGeopolitical(question: string): boolean {
  const lower = question.toLowerCase();
  return GEOPOLITICAL_HINTS.some((kw) => lower.includes(kw));
}

export function formatVolume(vol: number): string {
  if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `$${(vol / 1_000).toFixed(0)}K`;
  return `$${vol.toFixed(0)}`;
}

function parseJsonField<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

interface QueryConfig {
  volumeMin: number;
  pages: number;
  label: string;
}

async function fetchQuery(config: QueryConfig): Promise<GammaMarket[]> {
  const rows: GammaMarket[] = [];

  for (let offset = 0; offset < config.pages * 100; offset += 100) {
    const url = new URL('https://gamma-api.polymarket.com/markets');
    url.searchParams.set('closed', 'false');
    url.searchParams.set('order', 'volume');
    url.searchParams.set('ascending', 'false');
    url.searchParams.set('volume_num_min', String(config.volumeMin));
    url.searchParams.set('limit', '100');
    url.searchParams.set('offset', String(offset));

    try {
      const res = await fetch(url.toString(), {
        signal: AbortSignal.timeout(12_000),
        headers: { 'User-Agent': 'GlobalMonitor/1.0' },
      });
      if (!res.ok) break;
      const page: GammaMarket[] = await res.json();
      if (page.length === 0) break;
      rows.push(...page);
    } catch {
      break;
    }
  }

  await incrementMetric(`markets_query_${config.label}`, rows.length);
  return rows;
}

function geocodeForMarket(title: string, category: MarketCategory): {
  lat: number;
  lng: number;
  geoConfidence: number;
  geoMethod: GeoMatchMethod;
  isMapPlottable: boolean;
  geoValidity: 'valid' | 'ambiguous' | 'invalid';
  geoReason: string;
} {
  const precise = geocodeText(title);
  if (precise) {
    const isMapPlottable =
      precise.validity === 'valid' &&
      (precise.method === 'city' || precise.method === 'country') &&
      precise.confidence >= 0.72;
    return {
      lat: precise.lat,
      lng: precise.lng,
      geoConfidence: precise.confidence,
      geoMethod: precise.method,
      isMapPlottable,
      geoValidity: precise.validity,
      geoReason: precise.reason,
    };
  }

  if (category === 'conflict' || category === 'diplomacy') {
    const c = centroidForRegion('middle_east');
    return {
      lat: c.lat,
      lng: c.lng,
      geoConfidence: c.confidence,
      geoMethod: c.method,
      isMapPlottable: false,
      geoValidity: c.validity,
      geoReason: c.reason,
    };
  }

  if (category === 'economy') {
    const c = centroidForRegion('global');
    return {
      lat: c.lat,
      lng: c.lng,
      geoConfidence: c.confidence,
      geoMethod: c.method,
      isMapPlottable: false,
      geoValidity: c.validity,
      geoReason: c.reason,
    };
  }

  if (category === 'climate') {
    const c = centroidForRegion('global');
    return {
      lat: c.lat,
      lng: c.lng,
      geoConfidence: c.confidence,
      geoMethod: c.method,
      isMapPlottable: false,
      geoValidity: c.validity,
      geoReason: c.reason,
    };
  }

  const c = centroidForRegion('global');
  return {
    lat: c.lat,
    lng: c.lng,
    geoConfidence: c.confidence,
    geoMethod: c.method,
    isMapPlottable: false,
    geoValidity: c.validity,
    geoReason: c.reason,
  };
}

export function marketSignalScore(market: PolymarketMarket): number {
  const volumeScore = Math.max(0, Math.log10(Math.max(100, market.volumeRaw)) - 2);
  const liquidityScore = Math.max(0, Math.log10(Math.max(100, market.liquidity)) - 2);
  const geoScore = market.geoConfidence * 3;
  const geoBonus = market.geoMethod === 'city' ? 1.1 : market.geoMethod === 'country' ? 0.45 : -0.4;
  const categoryBonus =
    market.category === 'conflict' || market.category === 'diplomacy' ? 0.6 : 0.25;

  return volumeScore + liquidityScore + geoScore + geoBonus + categoryBonus;
}

function normalizedTokens(text: string): string[] {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
  return [...new Set(tokens)];
}

export function isHighSignalMapMarket(market: PolymarketMarket): boolean {
  if (!market.isMapPlottable) return false;
  if (market.geoValidity !== 'valid') return false;
  if (market.geoConfidence < 0.62) return false;

  // Country-level geocoding is useful but noisier; require stronger market activity.
  if (
    market.geoMethod === 'country' &&
    market.volumeRaw < 50_000 &&
    market.liquidity < 20_000
  ) {
    return false;
  }

  // Keep low-liquidity/low-volume contracts off-map unless confidence is very high.
  if (market.volumeRaw < 5_000 && market.liquidity < 5_000 && market.geoConfidence < 0.8) {
    return false;
  }

  return marketSignalScore(market) >= 3.9;
}

export async function fetchPolymarkets(): Promise<PolymarketMarket[]> {
  const queryResults = await Promise.all([
    fetchQuery({ volumeMin: 10_000, pages: 4, label: 'high' }),
    fetchQuery({ volumeMin: 1_000, pages: 6, label: 'broad' }),
  ]);

  const allMarkets = queryResults.flat();
  await incrementMetric('markets_raw_count', allMarkets.length);

  const dedupMap = new Map<string, GammaMarket>();
  for (const m of allMarkets) {
    if (!dedupMap.has(m.id)) dedupMap.set(m.id, m);
  }

  const uniqueMarkets = [...dedupMap.values()];

  const results: PolymarketMarket[] = [];

  for (const m of uniqueMarkets) {
    if (!m.active || m.closed) continue;
    if (isExcluded(m.question)) continue;

    const category = classifyCategory(m.question);
    if (!category) {
      if (!looksGeopolitical(m.question)) continue;
    }

    const finalCategory = category || 'diplomacy';

    const geo = geocodeForMarket(m.question, finalCategory);

    const outcomes = parseJsonField<string[]>(m.outcomes, ['Yes', 'No']);
    const outcomePrices = parseJsonField<string[]>(m.outcomePrices, ['0.5', '0.5']).map(Number);

    const volumeRaw = parseFloat(m.volume) || 0;
    const liquidityRaw = parseFloat(m.liquidity) || 0;

    results.push({
      id: `poly_${m.id}`,
      title: m.question,
      category: finalCategory,
      categoryNormalized: finalCategory,
      probability: outcomePrices[0] ?? 0.5,
      volume: formatVolume(volumeRaw),
      volumeRaw,
      lat: geo.lat,
      lng: geo.lng,
      url: `https://polymarket.com/event/${m.slug}`,
      lastUpdated: new Date().toISOString(),
      outcomes,
      outcomePrices,
      liquidity: liquidityRaw,
      endDate: m.endDate,
      geoConfidence: geo.geoConfidence,
      geoMethod: geo.geoMethod,
      isMapPlottable: geo.isMapPlottable,
      signalScore: 0,
      topicTags: normalizedTokens(m.question).slice(0, 8),
      mapPriority: 0,
      geoValidity: geo.geoValidity,
      geoReason: geo.geoReason,
    });
  }

  for (const market of results) {
    market.signalScore = marketSignalScore(market);
    market.mapPriority = market.signalScore;
  }

  results.sort((a, b) => b.signalScore - a.signalScore);

  await incrementMetric('markets_final_count', results.length);
  return results.slice(0, 120);
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findRelatedMarkets(
  event: GdeltEvent,
  markets: PolymarketMarket[],
  radiusKm: number = 500,
): PolymarketMarket[] {
  const eventText = `${event.title} ${event.summary || ''}`;
  const eventTokens = normalizedTokens(eventText);
  const eventTokenSet = new Set(eventTokens);
  const eventTags = event.topicTags && event.topicTags.length > 0 ? event.topicTags : eventTokens.slice(0, 10);

  const categoryRadius = event.category === 'conflicts'
    ? 380
    : event.category === 'economy'
      ? 1200
      : event.category === 'elections'
        ? 700
        : event.category === 'disasters'
          ? 850
          : radiusKm;

  const minTopicScore = event.category === 'economy' ? 0.09 : 0.12;
  const minGeoScore = event.category === 'economy' ? 0.08 : 0.12;

  const nearby = markets
    .filter((m) => isHighSignalMapMarket(m))
    .map((m) => {
      const dist = haversineKm(event.lat, event.lng, m.lat, m.lng);
      const geoScore = Math.max(0, 1 - dist / categoryRadius);

      const mTokens = m.topicTags.length > 0 ? m.topicTags : normalizedTokens(m.title);
      let overlap = 0;
      for (const token of mTokens) {
        if (eventTokenSet.has(token)) overlap++;
      }
      const denom = Math.max(1, Math.min(12, eventTags.length + mTokens.length - overlap));
      const topicScore = overlap / denom;
      const linkConfidence = topicScore * 0.66 + geoScore * 0.34;
      const linkReason = [
        ...(topicScore >= minTopicScore ? ['topic_match'] : []),
        ...(geoScore >= minGeoScore ? ['geo_match'] : []),
      ];
      return {
        market: m,
        dist,
        topicScore,
        geoScore,
        linkConfidence,
        linkReason,
        overlapTokens: mTokens.filter((token) => eventTokenSet.has(token)).slice(0, 3),
      };
    })
    .filter((row) => (
      row.dist <= categoryRadius &&
      row.topicScore >= minTopicScore &&
      row.geoScore >= minGeoScore &&
      row.linkConfidence >= 0.24
    ));

  nearby.sort((a, b) => {
    const scoreDelta = b.linkConfidence - a.linkConfidence;
    if (scoreDelta !== 0) return scoreDelta;
    return b.market.signalScore - a.market.signalScore;
  });

  const deduped: PolymarketMarket[] = [];
  const seen = new Set<string>();

  for (const row of nearby) {
    const market = row.market;
    const locationBucket = `${Math.round(market.lat * 2) / 2}|${Math.round(market.lng * 2) / 2}`;
    const key = `${market.category}|${locationBucket}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push({
      ...market,
      linkConfidence: row.linkConfidence,
      linkReason: row.linkReason,
      topicTags: row.overlapTokens.length > 0 ? row.overlapTokens : market.topicTags.slice(0, 2),
    });
    if (deduped.length >= 5) break;
  }

  return deduped;
}
