import type { GdeltEvent } from './gdelt';

export interface PolymarketMarket {
  id: string;
  title: string;
  category: MarketCategory;
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
}

export type MarketCategory =
  | 'conflict'
  | 'politics'
  | 'economy'
  | 'climate'
  | 'diplomacy';

// --- Gamma API response shape ---

interface GammaMarket {
  id: string;
  question: string;
  slug: string;
  endDate: string;
  liquidity: string;
  volume: string;
  outcomes: string; // JSON string: '["Yes","No"]'
  outcomePrices: string; // JSON string: '["0.85","0.15"]'
  active: boolean;
  closed: boolean;
}

// --- Exclusion: sports, crypto, entertainment, pop culture ---

const EXCLUDE_KEYWORDS = [
  // Sports
  'nfl', 'nba', 'mlb', 'nhl', 'premier league', 'champions league',
  'f1', 'formula 1', 'ufc', 'boxing', 'tennis', 'golf', 'masters tournament',
  'world cup', 'super bowl', 'world series', 'stanley cup', 'march madness',
  'playoffs', 'mvp award', 'ballon d\'or', 'serie a', 'la liga', 'bundesliga',
  // Crypto
  'bitcoin price', 'ethereum price', 'solana', 'altcoin', 'defi', 'nft',
  'airdrop', 'memecoin', 'token price', 'fdv', 'market cap crypto',
  'stablecoin', 'layer 2', 'cardano', 'dogecoin', 'shiba',
  // Entertainment / pop culture
  'oscar', 'grammy', 'emmy', 'golden globe', 'bachelor', 'survivor',
  'big brother', 'love island', 'box office', 'album', 'movie',
  'tv show', 'netflix', 'spotify', 'youtube', 'tiktok', 'streamer',
  'influencer', 'celebrity', 'kardashian', 'taylor swift',
  // Other irrelevant
  'weather tomorrow', 'puffpaw', 'microstrategy stock',
];

// --- Category classification by keywords ---

const CATEGORY_KEYWORDS: Record<MarketCategory, string[]> = {
  conflict: [
    'war', 'military', 'attack', 'invasion', 'strike', 'clash', 'ceasefire',
    'missile', 'troops', 'airstrike', 'nato', 'nuclear', 'weapon', 'army',
    'conflict', 'houthi', 'hezbollah', 'hamas', 'drone strike', 'casualt',
  ],
  politics: [
    'election', 'president', 'vote', 'resign', 'impeach', 'congress',
    'parliament', 'prime minister', 'governor', 'senator', 'poll',
    'nominee', 'inaugurat', 'cabinet', 'speaker', 'democrat', 'republican',
    'labour', 'conservative', 'party leader',
  ],
  economy: [
    'fed ', 'federal reserve', 'interest rate', 'gdp', 'recession',
    'inflation', 'tariff', 'trade deal', 'ecb', 'bank of', 'imf',
    'world bank', 'debt ceiling', 'shutdown', 'fiscal', 'stimulus',
    'employment', 'jobs report', 'cpi', 'oil price', 'opec',
  ],
  climate: [
    'earthquake', 'hurricane', 'flood', 'wildfire', 'climate',
    'temperature', 'tornado', 'tsunami', 'drought', 'sea level',
    'emission', 'paris agreement', 'carbon',
  ],
  diplomacy: [
    'treaty', 'sanction', 'un ', 'united nations', 'summit', 'diplomatic',
    'ambassador', 'annexation', 'sovereignty', 'border dispute',
    'peace deal', 'negotiations', 'accord', 'alliance',
  ],
};

// --- Static geocoding lookup ---

const GEO_LOOKUP: Record<string, { lat: number; lng: number }> = {
  // Conflict zones
  'ukraine': { lat: 48.38, lng: 31.17 },
  'kyiv': { lat: 50.45, lng: 30.52 },
  'kherson': { lat: 46.63, lng: 32.62 },
  'crimea': { lat: 44.95, lng: 34.10 },
  'donbas': { lat: 48.00, lng: 37.80 },
  'donetsk': { lat: 48.00, lng: 37.80 },
  'zaporizhzhia': { lat: 47.84, lng: 35.14 },
  'gaza': { lat: 31.35, lng: 34.31 },
  'israel': { lat: 31.05, lng: 34.85 },
  'palestine': { lat: 31.90, lng: 35.20 },
  'west bank': { lat: 31.95, lng: 35.30 },
  'syria': { lat: 34.80, lng: 38.99 },
  'yemen': { lat: 15.55, lng: 48.52 },
  'houthi': { lat: 15.35, lng: 44.21 },
  'sudan': { lat: 15.50, lng: 32.56 },
  'myanmar': { lat: 19.76, lng: 96.07 },
  'afghanistan': { lat: 33.94, lng: 67.71 },
  'libya': { lat: 26.34, lng: 17.23 },
  'somalia': { lat: 5.15, lng: 46.20 },
  'ethiopia': { lat: 9.15, lng: 40.49 },
  'iraq': { lat: 33.22, lng: 43.68 },
  'lebanon': { lat: 33.85, lng: 35.86 },

  // Major countries
  'united states': { lat: 38.90, lng: -77.04 },
  'us ': { lat: 38.90, lng: -77.04 },
  'u.s.': { lat: 38.90, lng: -77.04 },
  'america': { lat: 38.90, lng: -77.04 },
  'china': { lat: 39.90, lng: 116.40 },
  'russia': { lat: 55.76, lng: 37.62 },
  'india': { lat: 28.61, lng: 77.21 },
  'japan': { lat: 35.68, lng: 139.69 },
  'germany': { lat: 52.52, lng: 13.41 },
  'france': { lat: 48.86, lng: 2.35 },
  'uk': { lat: 51.51, lng: -0.13 },
  'united kingdom': { lat: 51.51, lng: -0.13 },
  'britain': { lat: 51.51, lng: -0.13 },
  'canada': { lat: 45.42, lng: -75.70 },
  'australia': { lat: -35.28, lng: 149.13 },
  'brazil': { lat: -15.79, lng: -47.88 },
  'mexico': { lat: 19.43, lng: -99.13 },
  'south korea': { lat: 37.57, lng: 126.98 },
  'north korea': { lat: 39.02, lng: 125.75 },
  'iran': { lat: 35.69, lng: 51.39 },
  'saudi arabia': { lat: 24.71, lng: 46.68 },
  'turkey': { lat: 39.93, lng: 32.86 },
  'egypt': { lat: 30.04, lng: 31.24 },
  'pakistan': { lat: 33.69, lng: 73.04 },
  'south africa': { lat: -25.75, lng: 28.19 },
  'nigeria': { lat: 9.06, lng: 7.49 },
  'indonesia': { lat: -6.21, lng: 106.85 },
  'philippines': { lat: 14.60, lng: 120.98 },
  'vietnam': { lat: 21.03, lng: 105.85 },
  'thailand': { lat: 13.76, lng: 100.50 },
  'poland': { lat: 52.23, lng: 21.01 },
  'italy': { lat: 41.90, lng: 12.50 },
  'spain': { lat: 40.42, lng: -3.70 },
  'argentina': { lat: -34.60, lng: -58.38 },
  'colombia': { lat: 4.71, lng: -74.07 },
  'venezuela': { lat: 10.48, lng: -66.90 },
  'cuba': { lat: 23.11, lng: -82.37 },
  'kenya': { lat: -1.29, lng: 36.82 },

  // Geopolitical entities / hotspots
  'taiwan': { lat: 25.03, lng: 121.57 },
  'taipei': { lat: 25.03, lng: 121.57 },
  'south china sea': { lat: 14.50, lng: 114.00 },
  'greenland': { lat: 64.17, lng: -51.74 },
  'arctic': { lat: 71.00, lng: -8.00 },
  'hong kong': { lat: 22.32, lng: 114.17 },
  'kashmir': { lat: 34.08, lng: 74.80 },
  'balkans': { lat: 42.70, lng: 21.00 },
  'baltic': { lat: 56.95, lng: 24.11 },

  // Political figures → their capital
  'trump': { lat: 38.90, lng: -77.04 },
  'biden': { lat: 38.90, lng: -77.04 },
  'putin': { lat: 55.76, lng: 37.62 },
  'xi jinping': { lat: 39.90, lng: 116.40 },
  'modi': { lat: 28.61, lng: 77.21 },
  'macron': { lat: 48.86, lng: 2.35 },
  'starmer': { lat: 51.51, lng: -0.13 },
  'scholz': { lat: 52.52, lng: 13.41 },
  'netanyahu': { lat: 31.78, lng: 35.22 },
  'zelensky': { lat: 50.45, lng: 30.52 },
  'erdogan': { lat: 39.93, lng: 32.86 },
  'lula': { lat: -15.79, lng: -47.88 },
  'milei': { lat: -34.60, lng: -58.38 },
  'maduro': { lat: 10.48, lng: -66.90 },
  'kim jong': { lat: 39.02, lng: 125.75 },

  // Institutions
  'fed ': { lat: 38.89, lng: -77.05 },
  'federal reserve': { lat: 38.89, lng: -77.05 },
  'ecb': { lat: 50.11, lng: 8.68 },
  'european central bank': { lat: 50.11, lng: 8.68 },
  'nato': { lat: 50.88, lng: 4.43 },
  'eu ': { lat: 50.85, lng: 4.35 },
  'european union': { lat: 50.85, lng: 4.35 },
  'imf': { lat: 38.90, lng: -77.04 },
  'world bank': { lat: 38.90, lng: -77.04 },
  'opec': { lat: 48.21, lng: 16.37 },
  'brics': { lat: 39.90, lng: 116.40 },

  // Cities
  'washington': { lat: 38.90, lng: -77.04 },
  'beijing': { lat: 39.90, lng: 116.40 },
  'moscow': { lat: 55.76, lng: 37.62 },
  'london': { lat: 51.51, lng: -0.13 },
  'paris': { lat: 48.86, lng: 2.35 },
  'berlin': { lat: 52.52, lng: 13.41 },
  'tokyo': { lat: 35.68, lng: 139.69 },
  'new delhi': { lat: 28.61, lng: 77.21 },
  'jerusalem': { lat: 31.78, lng: 35.22 },
  'tehran': { lat: 35.69, lng: 51.39 },
  'riyadh': { lat: 24.71, lng: 46.68 },
  'ankara': { lat: 39.93, lng: 32.86 },
  'seoul': { lat: 37.57, lng: 126.98 },
  'pyongyang': { lat: 39.02, lng: 125.75 },
};

// --- Helpers ---

function isExcluded(question: string): boolean {
  const lower = question.toLowerCase();
  return EXCLUDE_KEYWORDS.some((kw) => lower.includes(kw));
}

function classifyCategory(question: string): MarketCategory | null {
  const lower = question.toLowerCase();

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return cat as MarketCategory;
    }
  }

  return null; // Not a relevant category
}

function geocode(question: string): { lat: number; lng: number } | null {
  const lower = question.toLowerCase();

  // Check longest keys first to prefer specific matches (e.g. "south korea" over "korea")
  const sortedKeys = Object.keys(GEO_LOOKUP).sort((a, b) => b.length - a.length);

  for (const key of sortedKeys) {
    if (lower.includes(key)) {
      return GEO_LOOKUP[key];
    }
  }

  return null;
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

// --- Main fetch ---

export async function fetchPolymarkets(): Promise<PolymarketMarket[]> {
  const allMarkets: GammaMarket[] = [];

  // Fetch up to 3 pages of 100
  for (let offset = 0; offset < 300; offset += 100) {
    const url = new URL('https://gamma-api.polymarket.com/markets');
    url.searchParams.set('closed', 'false');
    url.searchParams.set('order', 'volume');
    url.searchParams.set('ascending', 'false');
    url.searchParams.set('volume_num_min', '10000');
    url.searchParams.set('limit', '100');
    url.searchParams.set('offset', String(offset));

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(12000),
      headers: { 'User-Agent': 'GlobalMonitor/1.0' },
    });

    if (!res.ok) break;
    const page: GammaMarket[] = await res.json();
    if (page.length === 0) break;
    allMarkets.push(...page);
  }

  const results: PolymarketMarket[] = [];

  for (const m of allMarkets) {
    if (!m.active || m.closed) continue;
    if (isExcluded(m.question)) continue;

    const category = classifyCategory(m.question);
    if (!category) continue;

    const coords = geocode(m.question);
    if (!coords) continue;

    const outcomes = parseJsonField<string[]>(m.outcomes, ['Yes', 'No']);
    const outcomePrices = parseJsonField<string[]>(m.outcomePrices, ['0.5', '0.5'])
      .map(Number);

    const volumeRaw = parseFloat(m.volume) || 0;

    results.push({
      id: `poly_${m.id}`,
      title: m.question,
      category,
      probability: outcomePrices[0] ?? 0.5,
      volume: formatVolume(volumeRaw),
      volumeRaw,
      lat: coords.lat,
      lng: coords.lng,
      url: `https://polymarket.com/event/${m.slug}`,
      lastUpdated: new Date().toISOString(),
      outcomes,
      outcomePrices,
      liquidity: parseFloat(m.liquidity) || 0,
      endDate: m.endDate,
    });
  }

  // Sort by volume descending, cap at 50
  results.sort((a, b) => b.volumeRaw - a.volumeRaw);
  return results.slice(0, 50);
}

// --- Related markets helper ---

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
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
  return markets.filter((m) => haversineKm(event.lat, event.lng, m.lat, m.lng) <= radiusKm);
}
