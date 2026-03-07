export type GeoMatchMethod = 'city' | 'country' | 'region' | 'centroid' | 'none';
export type GeoValidity = 'valid' | 'ambiguous' | 'invalid';

export interface GeoMatch {
  lat: number;
  lng: number;
  confidence: number;
  method: GeoMatchMethod;
  key: string;
  validity: GeoValidity;
  reason: string;
}

interface GeoEntry {
  lat: number;
  lng: number;
  method: Exclude<GeoMatchMethod, 'centroid' | 'none'>;
}

export const REGION_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  middle_east: { lat: 29.5, lng: 45.0 },
  eastern_europe: { lat: 49.5, lng: 31.0 },
  south_china_sea: { lat: 14.5, lng: 114.0 },
  west_pacific: { lat: 24.0, lng: 125.0 },
  global: { lat: 20.0, lng: 0.0 },
};

const LOOKUP: Record<string, GeoEntry> = {
  // Cities
  kyiv: { lat: 50.45, lng: 30.52, method: 'city' },
  moscow: { lat: 55.76, lng: 37.62, method: 'city' },
  tehran: { lat: 35.69, lng: 51.39, method: 'city' },
  jerusalem: { lat: 31.78, lng: 35.22, method: 'city' },
  beirut: { lat: 33.89, lng: 35.5, method: 'city' },
  baghdad: { lat: 33.31, lng: 44.36, method: 'city' },
  washington: { lat: 38.9, lng: -77.04, method: 'city' },
  beijing: { lat: 39.9, lng: 116.4, method: 'city' },
  taipei: { lat: 25.03, lng: 121.57, method: 'city' },
  manila: { lat: 14.6, lng: 120.98, method: 'city' },
  kherson: { lat: 46.63, lng: 32.62, method: 'city' },
  donetsk: { lat: 48.0, lng: 37.8, method: 'city' },
  istanbul: { lat: 41.01, lng: 28.97, method: 'city' },

  // Countries
  ukraine: { lat: 48.38, lng: 31.17, method: 'country' },
  russia: { lat: 55.76, lng: 37.62, method: 'country' },
  iran: { lat: 35.69, lng: 51.39, method: 'country' },
  israel: { lat: 31.05, lng: 34.85, method: 'country' },
  gaza: { lat: 31.35, lng: 34.31, method: 'country' },
  syria: { lat: 34.8, lng: 38.99, method: 'country' },
  lebanon: { lat: 33.85, lng: 35.86, method: 'country' },
  iraq: { lat: 33.22, lng: 43.68, method: 'country' },
  yemen: { lat: 15.55, lng: 48.52, method: 'country' },
  sudan: { lat: 15.5, lng: 32.56, method: 'country' },
  myanmar: { lat: 19.76, lng: 96.07, method: 'country' },
  china: { lat: 39.9, lng: 116.4, method: 'country' },
  taiwan: { lat: 25.03, lng: 121.57, method: 'country' },
  philippines: { lat: 14.6, lng: 120.98, method: 'country' },
  india: { lat: 28.61, lng: 77.21, method: 'country' },
  pakistan: { lat: 33.69, lng: 73.04, method: 'country' },
  turkey: { lat: 39.93, lng: 32.86, method: 'country' },
  nepal: { lat: 28.39, lng: 84.12, method: 'country' },
  colombia: { lat: 4.57, lng: -74.3, method: 'country' },
  colombian: { lat: 4.57, lng: -74.3, method: 'country' },
  cuba: { lat: 21.52, lng: -77.78, method: 'country' },
  cuban: { lat: 21.52, lng: -77.78, method: 'country' },
  us: { lat: 39.83, lng: -98.58, method: 'country' },
  usa: { lat: 39.83, lng: -98.58, method: 'country' },
  'u.s': { lat: 39.83, lng: -98.58, method: 'country' },
  'u.s.': { lat: 39.83, lng: -98.58, method: 'country' },
  'united states': { lat: 39.83, lng: -98.58, method: 'country' },
  america: { lat: 39.83, lng: -98.58, method: 'country' },

  // Regions
  'south china sea': { lat: 14.5, lng: 114.0, method: 'region' },
  'taiwan strait': { lat: 24.2, lng: 119.7, method: 'region' },
  'strait of hormuz': { lat: 26.57, lng: 56.25, method: 'region' },
  'bab el-mandeb': { lat: 12.58, lng: 43.33, method: 'region' },
  'red sea': { lat: 20.0, lng: 38.0, method: 'region' },
  'black sea': { lat: 44.0, lng: 35.0, method: 'region' },
  crimea: { lat: 44.95, lng: 34.1, method: 'region' },
};

function sortedLookupKeys(): string[] {
  return Object.keys(LOOKUP).sort((a, b) => b.length - a.length);
}

const SORTED_KEYS = sortedLookupKeys();

function escapeRegex(raw: string): string {
  return raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const LOOKUP_PATTERNS = SORTED_KEYS.map((key) => ({
  key,
  entry: LOOKUP[key],
  pattern: new RegExp(`(^|[^a-z0-9])${escapeRegex(key).replace(/\s+/g, '\\s+')}(?=$|[^a-z0-9])`, 'gi'),
}));

const US_KEYS = new Set(['us', 'usa', 'u.s', 'u.s.', 'united states', 'america']);

interface GeoHit {
  key: string;
  entry: GeoEntry;
  index: number;
}

function baseConfidenceFor(method: GeoMatchMethod): number {
  if (method === 'city') return 0.92;
  if (method === 'country') return 0.8;
  if (method === 'region') return 0.65;
  if (method === 'centroid') return 0.35;
  return 0;
}

function contextBonus(normalized: string, index: number): number {
  const left = normalized.slice(Math.max(0, index - 28), index);
  const right = normalized.slice(index, Math.min(normalized.length, index + 32));
  let score = 0;

  if (/\b(in|near|at|inside|around|from|across|off)\s*$/i.test(left)) score += 16;
  if (/\b(on|against|toward|towards|to)\s*$/i.test(left)) score += 10;
  if (/\b(election|elections|president|parliament)\b/i.test(right)) score += 6;
  if (/\bstrike|attack|conflict|war\b/i.test(left + right)) score += 5;

  return score;
}

export function geocodeText(text: string): GeoMatch | null {
  const normalized = text
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, ' ');

  const hits: GeoHit[] = [];
  for (const { key, entry, pattern } of LOOKUP_PATTERNS) {
    pattern.lastIndex = 0;
    let match = pattern.exec(normalized);
    while (match) {
      const lead = match[1] ?? '';
      const index = Math.max(0, match.index + lead.length);
      hits.push({ key, entry, index });
      if (pattern.lastIndex === match.index) pattern.lastIndex += 1;
      match = pattern.exec(normalized);
    }
  }

  if (hits.length === 0) return null;

  const nonUsCountryHits = hits.filter((hit) => hit.entry.method === 'country' && !US_KEYS.has(hit.key)).length;

  const scored = hits.map((hit) => {
    const context = contextBonus(normalized, hit.index);
    const base =
      hit.entry.method === 'city'
        ? 120
        : hit.entry.method === 'country'
          ? 92
          : 66;
    const positionBonus = Math.max(0, 24 - hit.index / 35);
    const usPenalty = US_KEYS.has(hit.key) && nonUsCountryHits > 0 ? 28 : 0;
    const regionPenalty =
      hit.entry.method === 'region' &&
      hits.some((other) => other.entry.method === 'city' || other.entry.method === 'country')
        ? 10
        : 0;
    const score = base + context + positionBonus - usPenalty - regionPenalty;
    return { ...hit, score, context };
  });

  scored.sort((a, b) => b.score - a.score || a.index - b.index);

  const best = scored[0];
  const second = scored[1];
  const confidenceBase = baseConfidenceFor(best.entry.method);
  const adjustedConfidence = Math.max(
    0.35,
    Math.min(0.95, confidenceBase + best.context / 120),
  );

  const ambiguous =
    Boolean(second) &&
    second.key !== best.key &&
    Math.abs(best.score - second.score) < 8 &&
    best.entry.method === second.entry.method;

  if (ambiguous) {
    return {
      lat: best.entry.lat,
      lng: best.entry.lng,
      confidence: Math.max(0.45, adjustedConfidence - 0.18),
      method: best.entry.method,
      key: best.key,
      validity: 'ambiguous',
      reason: `multiple plausible matches (${best.key} vs ${second?.key})`,
    };
  }

  return {
    lat: best.entry.lat,
    lng: best.entry.lng,
    confidence: adjustedConfidence,
    method: best.entry.method,
    key: best.key,
    validity: 'valid',
    reason: `matched ${best.key} (${best.entry.method})`,
  };
}

export function centroidForRegion(region: keyof typeof REGION_CENTROIDS): GeoMatch {
  const c = REGION_CENTROIDS[region] || REGION_CENTROIDS.global;
  return {
    lat: c.lat,
    lng: c.lng,
    confidence: 0.35,
    method: 'centroid',
    key: region,
    validity: 'invalid',
    reason: `fallback centroid (${region})`,
  };
}
