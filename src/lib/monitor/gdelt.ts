export interface GdeltEvent {
  id: string;
  title: string;
  category: EventCategory;
  severity: EventSeverity;
  lat: number;
  lng: number;
  timestamp: string;
  summary: string;
  sources: { name: string; url: string }[];
  tone: number;
  region: string;
}

export type EventCategory =
  | 'conflict'
  | 'politics'
  | 'disaster'
  | 'economy'
  | 'protest'
  | 'diplomacy';

export type EventSeverity = 'critical' | 'watch' | 'monitor';

interface GdeltGeoFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: {
    name?: string;
    html?: string;
    urls?: string;
    shareimage?: string;
    tone?: number;
    count?: number;
    [key: string]: unknown;
  };
}

interface GdeltGeoResponse {
  type: 'FeatureCollection';
  features: GdeltGeoFeature[];
}

// GDELT theme queries by category
const THEME_QUERIES: Record<string, string> = {
  conflict:
    'theme:MILITARY OR theme:KILL OR theme:ARMED_CONFLICT OR theme:TAX_WEAPONS',
  protest: 'theme:PROTEST OR theme:REBELLION OR theme:CIVIL_UNREST',
  politics:
    'theme:ELECTION OR theme:COUP OR theme:IMPEACH OR theme:LEGISLATION',
  disaster:
    'theme:NATURAL_DISASTER OR theme:EARTHQUAKE OR theme:FLOOD OR theme:HURRICANE',
  diplomacy: 'theme:SANCTION OR theme:DIPLOMATIC OR theme:TREATY OR theme:UN',
  economy: 'theme:ECON_BANKRUPTCY OR theme:ECON_DEBT OR theme:ECON_INFLATION',
};

// Keywords that indicate critical severity
const CRITICAL_KEYWORDS = [
  'kill',
  'attack',
  'strike',
  'bomb',
  'coup',
  'invasion',
  'massacre',
  'assassination',
  'war',
  'missile',
];
const WATCH_KEYWORDS = [
  'protest',
  'sanction',
  'threaten',
  'escalat',
  'tension',
  'deploy',
  'evacuate',
  'warning',
  'crisis',
];

function extractTitle(html: string): string {
  // GDELT html property contains an anchor tag with the title
  const match = html.match(/<a[^>]*>([^<]+)<\/a>/);
  if (match) return match[1].trim();
  // Fallback: strip all HTML
  return html.replace(/<[^>]+>/g, '').trim().substring(0, 120);
}

function extractSources(
  urls: string,
  html: string,
): { name: string; url: string }[] {
  const urlList = urls
    ? urls.split(/;/)
        .map((u) => u.trim())
        .filter(Boolean)
    : [];

  return urlList.slice(0, 3).map((url) => {
    let name = 'Unknown';
    try {
      const hostname = new URL(url).hostname.replace('www.', '');
      name = hostname.split('.')[0];
      name = name.charAt(0).toUpperCase() + name.slice(1);
    } catch {
      // Use fallback
    }
    return { name, url };
  });
}

function classifySeverity(
  tone: number,
  title: string,
  category: string,
): EventSeverity {
  const lower = title.toLowerCase();

  // Critical: very negative tone or critical keywords
  if (tone < -7 || CRITICAL_KEYWORDS.some((kw) => lower.includes(kw))) {
    return 'critical';
  }

  // Watch: moderately negative tone or watch keywords
  if (
    (tone >= -7 && tone < -3) ||
    WATCH_KEYWORDS.some((kw) => lower.includes(kw))
  ) {
    return 'watch';
  }

  // Categories that default to higher severity
  if (category === 'conflict') return 'watch';

  return 'monitor';
}

function classifyCategory(
  queryCategory: string,
  title: string,
): EventCategory {
  if (queryCategory !== 'all') return queryCategory as EventCategory;

  const lower = title.toLowerCase();
  if (
    CRITICAL_KEYWORDS.some((kw) => lower.includes(kw)) ||
    lower.includes('military')
  )
    return 'conflict';
  if (lower.includes('protest') || lower.includes('demonstrat'))
    return 'protest';
  if (lower.includes('elect') || lower.includes('vote') || lower.includes('coup'))
    return 'politics';
  if (
    lower.includes('earthquake') ||
    lower.includes('flood') ||
    lower.includes('hurricane') ||
    lower.includes('disaster')
  )
    return 'disaster';
  if (lower.includes('sanction') || lower.includes('diplom'))
    return 'diplomacy';
  return 'politics';
}

function inferRegion(lat: number, lng: number): string {
  if (lat > 25 && lat < 50 && lng > -10 && lng < 45) return 'europe';
  if (lat > 10 && lat < 45 && lng > 25 && lng < 75) return 'middle_east';
  if (lat > -35 && lat < 38 && lng > -20 && lng < 55) return 'africa';
  if (lat > 5 && lat < 55 && lng > 60 && lng < 150) return 'asia';
  if (lat > -50 && lat < 15 && lng > -85 && lng < -30) return 'south_america';
  if (lat > 15 && lat < 75 && lng > -170 && lng < -50) return 'north_america';
  if (lat > -50 && lat < 0 && lng > 100 && lng < 180) return 'oceania';
  return 'global';
}

async function fetchGdeltCategory(
  category: string,
  query: string,
  maxPoints: number = 50,
): Promise<GdeltEvent[]> {
  const url = new URL('https://api.gdeltproject.org/api/v2/geo/geo');
  url.searchParams.set('query', query);
  url.searchParams.set('mode', 'PointData');
  url.searchParams.set('format', 'GeoJSON');
  url.searchParams.set('timespan', '24h');
  url.searchParams.set('maxpoints', String(maxPoints));

  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(12000),
    headers: { 'User-Agent': 'GlobalMonitor/1.0' },
  });

  if (!res.ok) throw new Error(`GDELT ${res.status}`);

  const data: GdeltGeoResponse = await res.json();

  return (data.features || [])
    .filter((f) => f.geometry?.coordinates?.length === 2)
    .map((f, i) => {
      const [lng, lat] = f.geometry.coordinates;
      const props = f.properties;
      const tone = props.tone ?? 0;
      const html = props.html ?? props.name ?? '';
      const title = extractTitle(html) || props.name || 'Unknown event';
      const eventCategory = classifyCategory(category, title);

      return {
        id: `gdelt_${category}_${i}_${Date.now()}`,
        title,
        category: eventCategory,
        severity: classifySeverity(tone, title, eventCategory),
        lat,
        lng,
        timestamp: new Date().toISOString(),
        summary: title,
        sources: extractSources(props.urls ?? '', html),
        tone,
        region: inferRegion(lat, lng),
      };
    });
}

function deduplicateEvents(events: GdeltEvent[]): GdeltEvent[] {
  const seen = new Map<string, GdeltEvent>();

  for (const event of events) {
    // Create a location bucket (rounded to ~0.5 degree)
    const locKey = `${Math.round(event.lat * 2) / 2},${Math.round(event.lng * 2) / 2}`;
    // Simple title similarity: use first 40 chars
    const titleKey = event.title.toLowerCase().substring(0, 40);
    const dedupKey = `${locKey}:${titleKey}`;

    const existing = seen.get(dedupKey);
    if (
      !existing ||
      severityRank(event.severity) > severityRank(existing.severity)
    ) {
      seen.set(dedupKey, event);
    }
  }

  return Array.from(seen.values());
}

function severityRank(s: EventSeverity): number {
  return s === 'critical' ? 3 : s === 'watch' ? 2 : 1;
}

export async function fetchAllGdeltEvents(): Promise<GdeltEvent[]> {
  const categories = Object.entries(THEME_QUERIES);

  const results = await Promise.allSettled(
    categories.map(([cat, query]) => fetchGdeltCategory(cat, query, 30)),
  );

  const allEvents: GdeltEvent[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allEvents.push(...result.value);
    }
  }

  // Deduplicate and sort by severity then recency
  const deduped = deduplicateEvents(allEvents);
  deduped.sort((a, b) => {
    const sevDiff = severityRank(b.severity) - severityRank(a.severity);
    if (sevDiff !== 0) return sevDiff;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return deduped.slice(0, 200);
}
