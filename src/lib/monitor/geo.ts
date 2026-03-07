export type GeoMatchMethod = 'city' | 'country' | 'region' | 'centroid' | 'none';

export interface GeoMatch {
  lat: number;
  lng: number;
  confidence: number;
  method: GeoMatchMethod;
  key: string;
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
  us: { lat: 38.9, lng: -77.04, method: 'country' },
  'united states': { lat: 38.9, lng: -77.04, method: 'country' },
  america: { lat: 38.9, lng: -77.04, method: 'country' },

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

export function geocodeText(text: string): GeoMatch | null {
  const lower = text.toLowerCase();

  for (const key of SORTED_KEYS) {
    if (!lower.includes(key)) continue;
    const hit = LOOKUP[key];
    const confidence = hit.method === 'city' ? 0.92 : hit.method === 'country' ? 0.8 : 0.65;
    return {
      lat: hit.lat,
      lng: hit.lng,
      confidence,
      method: hit.method,
      key,
    };
  }

  return null;
}

export function centroidForRegion(region: keyof typeof REGION_CENTROIDS): GeoMatch {
  const c = REGION_CENTROIDS[region] || REGION_CENTROIDS.global;
  return {
    lat: c.lat,
    lng: c.lng,
    confidence: 0.35,
    method: 'centroid',
    key: region,
  };
}
