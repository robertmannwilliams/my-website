import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

interface Headline {
  title: string;
  source: string;
  url: string;
  timestamp: string;
  isBreaking: boolean;
}

// In-memory cache
let cachedData: { headlines: Headline[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 10 * 60_000; // 10 minutes

const RSS_FEEDS = [
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', source: 'Al Jazeera' },
  { url: 'https://feeds.npr.org/1001/rss.xml', source: 'NPR' },
  {
    url: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx1YlY4U0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en',
    source: 'Google News',
  },
];

const BREAKING_KEYWORDS = [
  'breaking',
  'urgent',
  'just in',
  'developing',
  'alert',
];

function detectBreaking(title: string): boolean {
  const lower = title.toLowerCase();
  return BREAKING_KEYWORDS.some((kw) => lower.includes(kw));
}

async function fetchFeed(
  feedUrl: string,
  source: string,
): Promise<Headline[]> {
  try {
    const parser = new Parser({
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const feed = await parser.parseURL(feedUrl);

    return (feed.items || []).slice(0, 15).map((item) => ({
      title: (item.title || '').trim(),
      source,
      url: item.link || '',
      timestamp: item.isoDate || item.pubDate || new Date().toISOString(),
      isBreaking: detectBreaking(item.title || ''),
    }));
  } catch {
    return [];
  }
}

async function fetchAllHeadlines(): Promise<Headline[]> {
  const results = await Promise.all(
    RSS_FEEDS.map(({ url, source }) => fetchFeed(url, source)),
  );

  const all = results.flat();

  // Sort by recency
  all.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  // Return last 30
  return all.slice(0, 30);
}

export async function GET() {
  const now = Date.now();

  if (cachedData && now - cachedData.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cachedData.headlines, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=60',
      },
    });
  }

  const headlines = await fetchAllHeadlines();
  cachedData = { headlines, timestamp: now };

  return NextResponse.json(headlines, {
    headers: {
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=60',
    },
  });
}
