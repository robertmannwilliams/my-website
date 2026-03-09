import Parser from 'rss-parser';
import { incrementMetric } from './metrics';
import type { SourceCoverageEntry } from './response';

export interface IngestedHeadline {
  id: string;
  title: string;
  summary: string;
  source: string;
  sourceTier: 'tier1' | 'regional' | 'specialized';
  sourceWeight: number;
  url: string;
  canonicalUrl: string;
  timestamp: string;
  isBreaking: boolean;
  signalScore: number;
  structured?: {
    category?: 'conflicts' | 'elections' | 'economy' | 'disasters' | 'infrastructure';
    severity?: 'critical' | 'watch' | 'monitor';
    status?: 'observed' | 'upcoming' | 'speculative';
    eventTime?: string | null;
    locationHint?: string;
  };
}

interface FeedSource {
  url: string;
  source: string;
  tier: 'tier1' | 'regional' | 'specialized';
  weight: number;
}

interface RawHeadline {
  title: string;
  description: string;
  source: string;
  sourceTier: 'tier1' | 'regional' | 'specialized';
  sourceWeight: number;
  url: string;
  canonicalUrl: string;
  timestamp: string;
  isBreaking: boolean;
}

const BASE_FEEDS: FeedSource[] = [
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC', tier: 'tier1', weight: 1.0 },
  { url: 'https://www.reuters.com/world/rss', source: 'Reuters', tier: 'tier1', weight: 1.0 },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', source: 'Al Jazeera', tier: 'tier1', weight: 0.95 },
  { url: 'https://rss.dw.com/rdf/rss-en-all', source: 'DW', tier: 'tier1', weight: 0.92 },
  { url: 'https://www.theguardian.com/world/rss', source: 'The Guardian', tier: 'tier1', weight: 0.9 },
  { url: 'https://www.france24.com/en/rss', source: 'France24', tier: 'tier1', weight: 0.88 },
  { url: 'https://feeds.npr.org/1004/rss.xml', source: 'NPR World', tier: 'tier1', weight: 0.85 },
  { url: 'https://news.un.org/feed/subscribe/en/news/all/rss.xml', source: 'UN News', tier: 'tier1', weight: 0.9 },
  { url: 'https://reliefweb.int/updates/rss.xml', source: 'ReliefWeb', tier: 'specialized', weight: 0.86 },
  { url: 'https://www.crisisgroup.org/rss.xml', source: 'ICG', tier: 'specialized', weight: 0.82 },
  { url: 'https://travel.state.gov/_res/rss/TAsTWs.xml', source: 'US State Dept Advisories', tier: 'specialized', weight: 0.8 },
  {
    url: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFp0Y1RjU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en',
    source: 'Google News World',
    tier: 'regional',
    weight: 0.7,
  },
  { url: 'https://www.scmp.com/rss/91/feed', source: 'SCMP', tier: 'regional', weight: 0.78 },
  { url: 'https://www.theafricareport.com/feed/', source: 'The Africa Report', tier: 'regional', weight: 0.75 },
  { url: 'https://www.arabnews.com/rss.xml', source: 'Arab News', tier: 'regional', weight: 0.72 },
  { url: 'https://www.rferl.org/api/zip', source: 'RFE/RL', tier: 'specialized', weight: 0.7 },
];

const BREAKING_KEYWORDS = ['breaking', 'urgent', 'just in', 'developing', 'alert'];
const TRACKING_PARAMS = new Set(['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid', 'ocid']);

function detectBreaking(text: string): boolean {
  const lower = text.toLowerCase();
  return BREAKING_KEYWORDS.some((kw) => lower.includes(kw));
}

function canonicalizeUrl(raw: string): string {
  if (!raw) return raw;
  try {
    const url = new URL(raw);
    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }
    url.hash = '';
    return url.toString();
  } catch {
    return raw;
  }
}

function parseTier(input: unknown): FeedSource['tier'] | null {
  if (input === 'tier1' || input === 'regional' || input === 'specialized') return input;
  return null;
}

function parseExtraFeedsFromEnv(): FeedSource[] {
  const raw = process.env.MONITOR_EXTRA_FEEDS_JSON;
  if (!raw || !raw.trim()) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const out: FeedSource[] = [];
    for (const row of parsed) {
      if (!row || typeof row !== 'object') continue;
      const url = typeof row.url === 'string' ? row.url.trim() : '';
      const source = typeof row.source === 'string' ? row.source.trim() : '';
      const tier = parseTier((row as { tier?: unknown }).tier);
      const weightRaw = Number((row as { weight?: unknown }).weight);
      const weight = Number.isFinite(weightRaw) ? Math.max(0.1, Math.min(1.2, weightRaw)) : 0.72;
      if (!url || !source || !tier) continue;
      out.push({ url, source, tier, weight });
    }
    return out;
  } catch {
    return [];
  }
}

function getFeeds(): FeedSource[] {
  const merged = [...BASE_FEEDS, ...parseExtraFeedsFromEnv()];
  const deduped: FeedSource[] = [];
  const seen = new Set<string>();

  for (const feed of merged) {
    const key = `${feed.source.toLowerCase()}|${canonicalizeUrl(feed.url).toLowerCase()}`;
    if (!feed.url || !feed.source || seen.has(key)) continue;
    seen.add(key);
    deduped.push(feed);
  }

  return deduped;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function simpleHash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

function computeSignalScore(raw: RawHeadline): number {
  const ageHours = Math.max(0, (Date.now() - new Date(raw.timestamp).getTime()) / 3_600_000);
  const recencyBoost = Math.max(0, 1.5 - ageHours / 24);
  const breakingBoost = raw.isBreaking ? 0.6 : 0;
  const titleLen = Math.min(1, raw.title.length / 120);
  return raw.sourceWeight * 2 + recencyBoost + breakingBoost + titleLen;
}

async function fetchFeed(feed: FeedSource): Promise<{ rows: RawHeadline[]; coverage: SourceCoverageEntry }> {
  const parser = new Parser({
    timeout: 10_000,
    headers: { 'User-Agent': 'GlobalMonitor/1.0' },
  });

  const started = Date.now();
  try {
    const rss = await parser.parseURL(feed.url);
    const rows: RawHeadline[] = (rss.items || []).slice(0, 60).map((item) => {
      const title = (item.title || '').trim();
      const description = (item.contentSnippet || item.content || '').trim().slice(0, 420);
      const url = item.link || '';
      const canonicalUrl = canonicalizeUrl(url);
      const timestamp = item.isoDate || item.pubDate || new Date().toISOString();
      return {
        title,
        description,
        source: feed.source,
        sourceTier: feed.tier,
        sourceWeight: feed.weight,
        url,
        canonicalUrl,
        timestamp,
        isBreaking: detectBreaking(`${title} ${description}`),
      };
    }).filter((r) => r.title.length > 0 && r.url.length > 0);

    await incrementMetric('ingest_feed_success');

    return {
      rows,
      coverage: {
        source: feed.source,
        tier: feed.tier,
        weight: feed.weight,
        fetched: rows.length,
        accepted: rows.length,
        failed: false,
        latencyMs: Date.now() - started,
      },
    };
  } catch {
    await incrementMetric('ingest_feed_failure');
    return {
      rows: [],
      coverage: {
        source: feed.source,
        tier: feed.tier,
        weight: feed.weight,
        fetched: 0,
        accepted: 0,
        failed: true,
        latencyMs: Date.now() - started,
      },
    };
  }
}

function dedupeRawHeadlines(rows: RawHeadline[]): RawHeadline[] {
  const seenByUrl = new Set<string>();
  const seenByText = new Set<string>();
  const result: RawHeadline[] = [];

  for (const row of rows) {
    const titleKey = normalizeText(row.title).slice(0, 120);
    const summaryKey = normalizeText(row.description).slice(0, 160);
    const textKey = `${titleKey}|${summaryKey}`;
    const urlKey = row.canonicalUrl || row.url;

    if (urlKey && seenByUrl.has(urlKey)) continue;
    if (seenByText.has(textKey)) continue;

    if (urlKey) seenByUrl.add(urlKey);
    seenByText.add(textKey);
    result.push(row);
  }

  return result;
}

export interface HeadlinesIngestResult {
  items: IngestedHeadline[];
  sourceCoverage: SourceCoverageEntry[];
}

export async function fetchTieredHeadlines(limit: number = 120): Promise<HeadlinesIngestResult> {
  const feeds = getFeeds();
  const results = await Promise.all(feeds.map((feed) => fetchFeed(feed)));
  const coverage = results.map((r) => r.coverage);
  const raw = dedupeRawHeadlines(results.flatMap((r) => r.rows));

  const items = raw
    .map((row) => {
      const normalized = normalizeText(`${row.title} ${row.description}`);
      const signalScore = computeSignalScore(row);
      const id = simpleHash(`${row.canonicalUrl}|${normalized.slice(0, 140)}`);
      return {
        id,
        title: row.title,
        summary: row.description,
        source: row.source,
        sourceTier: row.sourceTier,
        sourceWeight: row.sourceWeight,
        url: row.url,
        canonicalUrl: row.canonicalUrl,
        timestamp: row.timestamp,
        isBreaking: row.isBreaking,
        signalScore,
      } satisfies IngestedHeadline;
    })
    .sort((a, b) => {
      if (b.signalScore !== a.signalScore) return b.signalScore - a.signalScore;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    })
    .slice(0, limit);

  // Coverage accepted counts after dedupe/truncation
  const acceptedBySource = new Map<string, number>();
  for (const h of items) {
    acceptedBySource.set(h.source, (acceptedBySource.get(h.source) || 0) + 1);
  }
  for (const entry of coverage) {
    entry.accepted = acceptedBySource.get(entry.source) || 0;
  }

  await incrementMetric('ingest_headlines_total', items.length);
  return { items, sourceCoverage: coverage };
}

export function headlineTextForClassification(h: IngestedHeadline): string {
  return `${h.title}${h.summary ? ` — ${h.summary}` : ''}`;
}

export function normalizeForSimilarity(input: string): string {
  return normalizeText(input);
}

export function hashFingerprint(input: string): string {
  return simpleHash(input);
}
