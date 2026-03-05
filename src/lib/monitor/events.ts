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
  | 'conflicts'
  | 'elections'
  | 'economy'
  | 'disasters'
  | 'infrastructure';

export type EventSeverity = 'critical' | 'watch' | 'monitor';

// ---------------------------------------------------------------------------
// RSS Ingestion
// ---------------------------------------------------------------------------

import Parser from 'rss-parser';

interface RawHeadline {
  title: string;
  description: string;
  source: string;
  url: string;
  pubDate: string;
}

const RSS_FEEDS = [
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC' },
  { url: 'https://feeds.npr.org/1004/rss.xml', source: 'NPR' },
  { url: 'https://www.theguardian.com/world/rss', source: 'The Guardian' },
  { url: 'https://www.france24.com/en/rss', source: 'France24' },
  { url: 'https://rss.dw.com/rdf/rss-en-all', source: 'DW' },
  { url: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFp0Y1RjU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en', source: 'Google News (World)' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', source: 'Al Jazeera' },
  { url: 'https://www.scmp.com/rss/91/feed', source: 'SCMP' },
  { url: 'https://www.theafricareport.com/feed/', source: 'The Africa Report' },
];

async function fetchFeed(feedUrl: string, source: string): Promise<RawHeadline[]> {
  try {
    const parser = new Parser({
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (GlobalMonitor/1.0)' },
    });
    const feed = await parser.parseURL(feedUrl);
    return (feed.items || []).slice(0, 50).map((item) => ({
      title: (item.title || '').trim(),
      description: (item.contentSnippet || item.content || '').trim().substring(0, 300),
      source,
      url: item.link || '',
      pubDate: item.isoDate || item.pubDate || new Date().toISOString(),
    }));
  } catch (err) {
    console.warn(`[events] Failed to fetch ${source} feed: ${err}`);
    return [];
  }
}

async function fetchAllRssHeadlines(): Promise<RawHeadline[]> {
  const results = await Promise.all(
    RSS_FEEDS.map(({ url, source }) => fetchFeed(url, source)),
  );
  const all = results.flat();

  // Deduplicate by URL
  const seen = new Set<string>();
  return all.filter((h) => {
    if (!h.url || seen.has(h.url)) return false;
    seen.add(h.url);
    return h.title.length > 0;
  });
}

// ---------------------------------------------------------------------------
// Classification Cache (in-memory, 2-hour TTL)
// ---------------------------------------------------------------------------

interface CachedEvent {
  event: GdeltEvent;
  expiresAt: number;
}

const classifiedCache = new Map<string, CachedEvent>();
const CACHE_TTL = 2 * 60 * 60_000; // 2 hours

function headlineKey(h: RawHeadline): string {
  // Simple hash: normalized title + date prefix
  const norm = h.title.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 60);
  const datePrefix = h.pubDate.substring(0, 10); // YYYY-MM-DD
  return `${norm}:${datePrefix}`;
}

function purgeExpiredCache() {
  const now = Date.now();
  for (const [key, entry] of classifiedCache) {
    if (entry.expiresAt < now) classifiedCache.delete(key);
  }
}

// ---------------------------------------------------------------------------
// Claude Classification
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a geopolitical intelligence analyst classifying news headlines for a global monitoring dashboard used by macro investors and geopolitical analysts. You will receive a batch of recent news headlines from multiple sources. Your job is to:

1. FILTER: Remove anything irrelevant to geopolitical/macro monitoring. Exclude: science/health studies, celebrity news, sports, human interest stories, local crime, lifestyle content, entertainment, technology product launches.

2. DEDUPLICATE AGGRESSIVELY: If two or more headlines describe the same event or situation, merge them into ONE event entry. Even if the wording differs significantly, if they are about the same thing happening in the same place, they are ONE event. Multiple sources reporting the same story = one event with all sources listed. Err on the side of merging — fewer high-quality events is better than duplicates. For example, "US launches anti-drug operation in Ecuador" and "Trump sends troops to Ecuador for drug raid" are the SAME event and must be merged.

3. CLASSIFY each unique event with:
   - title: A clean, concise event title (not a copy of any headline)
   - summary: 1-2 sentence summary of the event
   - category: One of: conflicts, elections, economy, disasters, infrastructure
   - severity: One of: critical, watch, monitor
     - critical: Active military operations, coups, major attacks, market-moving policy changes, major natural disasters with casualties
     - watch: Escalating tensions, significant political events, sanctions announcements, meaningful protests, developing disasters
     - monitor: Diplomatic meetings, routine elections, minor protests, policy discussions
   - latitude: Best approximate latitude for this event
   - longitude: Best approximate longitude for this event
   - locationName: Human-readable location (e.g. 'Kherson, Ukraine' or 'Strait of Hormuz')
   - country: ISO country code
   - relevance: 1-10 score for how important this is for a geopolitical/macro monitoring dashboard
   - sources: Array of {name, url} for each headline that reported this event

Return ONLY valid JSON. No preamble, no markdown backticks. Return an array of event objects. Only include events with relevance >= 6.`;

interface ClaudeEvent {
  title: string;
  summary: string;
  category: string;
  severity: string;
  latitude: number;
  longitude: number;
  locationName: string;
  country: string;
  relevance: number;
  sources: { name: string; url: string }[];
}

async function classifyWithClaude(headlines: RawHeadline[]): Promise<ClaudeEvent[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[events] ANTHROPIC_API_KEY not set — skipping classification');
    return [];
  }

  const formatted = headlines
    .map((h) => `[${h.source}] ${h.title}${h.description ? ' - ' + h.description : ''}`)
    .join('\n');

  const userMessage = `Here are ${headlines.length} recent headlines from global news sources. Classify them.\n\n${formatted}`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[events] Claude API ${res.status}: ${text.substring(0, 200)}`);
      return [];
    }

    const data = await res.json();
    let content: string = data.content?.[0]?.text || '';
    if (!content) return [];

    // Strip markdown code fences if present
    content = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

    const parsed: ClaudeEvent[] = JSON.parse(content);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (err) {
    console.error('[events] Claude classification error:', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Batching — split large headline sets into chunks for Claude API limits
// ---------------------------------------------------------------------------

const BATCH_SIZE = 150;

async function classifyInBatches(headlines: RawHeadline[]): Promise<ClaudeEvent[]> {
  if (headlines.length <= BATCH_SIZE) {
    return classifyWithClaude(headlines);
  }

  const results: ClaudeEvent[] = [];
  for (let i = 0; i < headlines.length; i += BATCH_SIZE) {
    const chunk = headlines.slice(i, i + BATCH_SIZE);
    console.log(`[events] Classifying batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(headlines.length / BATCH_SIZE)} (${chunk.length} headlines)`);
    const batch = await classifyWithClaude(chunk);
    results.push(...batch);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function toneFromSeverity(severity: EventSeverity): number {
  return severity === 'critical' ? -8 : severity === 'watch' ? -4 : 0;
}

function severityRank(s: EventSeverity): number {
  return s === 'critical' ? 3 : s === 'watch' ? 2 : 1;
}

// Haversine distance in km between two lat/lng points
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLng = (lng2 - lng1) * toRad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Post-classification dedup: merge events with same category, overlapping
// sources, and coordinates within 200km of each other.
function deduplicateClassifiedEvents(events: ClaudeEvent[]): ClaudeEvent[] {
  const merged: ClaudeEvent[] = [];
  const consumed = new Set<number>();

  for (let i = 0; i < events.length; i++) {
    if (consumed.has(i)) continue;
    const base = { ...events[i], sources: [...(events[i].sources || [])] };

    for (let j = i + 1; j < events.length; j++) {
      if (consumed.has(j)) continue;
      const other = events[j];

      // Must be same category
      if (base.category !== other.category) continue;

      // Must be within 200km
      const dist = haversineKm(
        base.latitude || 0, base.longitude || 0,
        other.latitude || 0, other.longitude || 0,
      );
      if (dist > 200) continue;

      // Check for overlapping sources OR very similar titles
      const baseSourceNames = new Set(base.sources.map((s) => s.name));
      const otherSources = other.sources || [];
      const hasOverlap = otherSources.some((s) => baseSourceNames.has(s.name));

      // Also check title similarity — normalize and compare first 30 chars
      const normBase = base.title.toLowerCase().replace(/[^a-z0-9 ]/g, '').substring(0, 40);
      const normOther = other.title.toLowerCase().replace(/[^a-z0-9 ]/g, '').substring(0, 40);
      const titleSimilar = normBase === normOther ||
        normBase.includes(normOther.substring(0, 20)) ||
        normOther.includes(normBase.substring(0, 20));

      if (!hasOverlap && !titleSimilar) continue;

      // Merge: keep the event with higher relevance as base, combine sources
      consumed.add(j);
      if ((other.relevance || 0) > (base.relevance || 0)) {
        base.title = other.title;
        base.summary = other.summary;
        base.relevance = other.relevance;
      }
      // Merge source lists, dedup by URL
      const seenUrls = new Set(base.sources.map((s) => s.url));
      for (const src of otherSources) {
        if (!seenUrls.has(src.url)) {
          base.sources.push(src);
          seenUrls.add(src.url);
        }
      }
    }

    merged.push(base);
  }

  console.log(`[events] Post-dedup: ${events.length} → ${merged.length} events`);
  return merged;
}

function toGdeltEvent(ce: ClaudeEvent, index: number): GdeltEvent {
  const severity = (['critical', 'watch', 'monitor'].includes(ce.severity)
    ? ce.severity
    : 'monitor') as EventSeverity;
  const category = (['conflicts', 'elections', 'economy', 'disasters', 'infrastructure'].includes(ce.category)
    ? ce.category
    : 'conflicts') as EventCategory;

  return {
    id: `rss_${index}_${Date.now()}`,
    title: ce.title,
    category,
    severity,
    lat: ce.latitude || 0,
    lng: ce.longitude || 0,
    timestamp: new Date().toISOString(),
    summary: ce.summary || ce.title,
    sources: Array.isArray(ce.sources) ? ce.sources.slice(0, 5) : [],
    tone: toneFromSeverity(severity),
    region: inferRegion(ce.latitude || 0, ce.longitude || 0),
  };
}

// ---------------------------------------------------------------------------
// Main Pipeline
// ---------------------------------------------------------------------------

export async function fetchClassifiedEvents(): Promise<GdeltEvent[]> {
  // 1. Fetch all RSS
  const headlines = await fetchAllRssHeadlines();
  console.log(`[events] Fetched ${headlines.length} RSS headlines`);

  // 2. Purge expired cache entries
  purgeExpiredCache();

  // 3. Separate new vs cached headlines
  const newHeadlines: RawHeadline[] = [];
  const cachedKeys: string[] = [];

  for (const h of headlines) {
    const key = headlineKey(h);
    if (classifiedCache.has(key)) {
      cachedKeys.push(key);
    } else {
      newHeadlines.push(h);
    }
  }

  console.log(`[events] ${cachedKeys.length} cached, ${newHeadlines.length} new headlines to classify`);

  // 4. Classify new headlines with Claude (if any)
  if (newHeadlines.length > 0) {
    const rawClassified = await classifyInBatches(newHeadlines);
    console.log(`[events] Claude returned ${rawClassified.length} classified events`);
    const classified = deduplicateClassifiedEvents(rawClassified);

    const now = Date.now();

    // Map classified events back to headline keys for caching
    // Each classified event may come from multiple headlines — cache each source headline
    for (let i = 0; i < classified.length; i++) {
      const event = toGdeltEvent(classified[i], i);
      const cacheEntry: CachedEvent = { event, expiresAt: now + CACHE_TTL };

      // Cache by event title as key (the event itself is what we cache)
      const eventKey = `evt:${event.title.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 60)}`;
      classifiedCache.set(eventKey, cacheEntry);

      // Also mark each source headline as "classified" so we don't re-send it
      for (const src of classified[i].sources || []) {
        const matchingHeadline = newHeadlines.find((h) => h.url === src.url);
        if (matchingHeadline) {
          classifiedCache.set(headlineKey(matchingHeadline), cacheEntry);
        }
      }
    }

    // Mark remaining new headlines as "classified" (even if Claude filtered them out)
    // so we don't re-send them next time
    for (const h of newHeadlines) {
      const key = headlineKey(h);
      if (!classifiedCache.has(key)) {
        // Sentinel entry — headline was sent but Claude deemed it irrelevant
        classifiedCache.set(key, {
          event: null as unknown as GdeltEvent,
          expiresAt: now + CACHE_TTL,
        });
      }
    }
  }

  // 5. Collect all valid cached events
  const events: GdeltEvent[] = [];
  const seenTitles = new Set<string>();

  for (const entry of classifiedCache.values()) {
    if (!entry.event) continue; // sentinel entries
    const titleKey = entry.event.title.toLowerCase();
    if (seenTitles.has(titleKey)) continue;
    seenTitles.add(titleKey);
    events.push(entry.event);
  }

  // 6. Sort by severity then recency
  events.sort((a, b) => {
    const sevDiff = severityRank(b.severity) - severityRank(a.severity);
    if (sevDiff !== 0) return sevDiff;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return events.slice(0, 200);
}
