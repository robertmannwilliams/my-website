import { hashFingerprint, type IngestedHeadline } from './headlines';
import type { SourceCoverageEntry } from './response';

type StructuredCategory = 'conflicts' | 'elections' | 'economy' | 'disasters' | 'infrastructure';
type StructuredSeverity = 'critical' | 'watch' | 'monitor';
type StructuredStatus = 'observed' | 'upcoming' | 'speculative';

interface StructuredSignalRow {
  id?: string;
  title: string;
  summary?: string;
  category?: StructuredCategory;
  severity?: StructuredSeverity;
  status?: StructuredStatus;
  eventTime?: string | null;
  locationHint?: string;
  source?: string;
  sourceUrl?: string;
  timestamp?: string;
  confidence?: number;
}

interface StructuredSourceResult {
  items: IngestedHeadline[];
  sourceCoverage: SourceCoverageEntry[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseEventTime(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return null;
  return parsed.toISOString();
}

function parseTimestamp(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return new Date().toISOString();
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

function isCategory(value: unknown): value is StructuredCategory {
  return value === 'conflicts'
    || value === 'elections'
    || value === 'economy'
    || value === 'disasters'
    || value === 'infrastructure';
}

function isSeverity(value: unknown): value is StructuredSeverity {
  return value === 'critical' || value === 'watch' || value === 'monitor';
}

function isStatus(value: unknown): value is StructuredStatus {
  return value === 'observed' || value === 'upcoming' || value === 'speculative';
}

function normalizeStructuredRows(rows: unknown[]): StructuredSignalRow[] {
  const out: StructuredSignalRow[] = [];

  for (const raw of rows) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Partial<StructuredSignalRow>;
    const title = typeof row.title === 'string' ? row.title.trim() : '';
    if (!title) continue;

    out.push({
      id: typeof row.id === 'string' ? row.id.trim() : undefined,
      title,
      summary: typeof row.summary === 'string' ? row.summary.trim() : undefined,
      category: isCategory(row.category) ? row.category : undefined,
      severity: isSeverity(row.severity) ? row.severity : undefined,
      status: isStatus(row.status) ? row.status : undefined,
      eventTime: parseEventTime(row.eventTime),
      locationHint: typeof row.locationHint === 'string' ? row.locationHint.trim() : undefined,
      source: typeof row.source === 'string' ? row.source.trim() : undefined,
      sourceUrl: typeof row.sourceUrl === 'string' ? row.sourceUrl.trim() : undefined,
      timestamp: parseTimestamp(row.timestamp),
      confidence: Number.isFinite(Number(row.confidence)) ? Number(row.confidence) : undefined,
    });
  }

  return out;
}

function fromRows(rows: StructuredSignalRow[], sourceName: string): IngestedHeadline[] {
  return rows.map((row) => {
    const confidence = clamp(row.confidence ?? 0.9, 0.2, 1);
    const summaryParts = [row.summary || 'Structured event signal.'];
    if (row.status) summaryParts.push(`Status: ${row.status}.`);
    if (row.eventTime) summaryParts.push(`Event time: ${row.eventTime}.`);
    if (row.locationHint) summaryParts.push(`Location: ${row.locationHint}.`);
    const summary = summaryParts.join(' ');

    const seed = row.id || `${row.title}|${row.sourceUrl || sourceName}|${row.timestamp}`;
    const id = `str_${hashFingerprint(seed)}`;

    return {
      id,
      title: row.title,
      summary,
      source: row.source || sourceName,
      sourceTier: 'specialized',
      sourceWeight: confidence,
      url: row.sourceUrl || '#',
      canonicalUrl: row.sourceUrl || `structured://${id}`,
      timestamp: row.timestamp || new Date().toISOString(),
      isBreaking: row.severity === 'critical',
      signalScore: 2.4 + confidence * 1.6,
      structured: {
        category: row.category,
        severity: row.severity,
        status: row.status,
        eventTime: row.eventTime || null,
        locationHint: row.locationHint,
      },
    } satisfies IngestedHeadline;
  });
}

function fromEnvJson(): StructuredSignalRow[] {
  const raw = process.env.MONITOR_STRUCTURED_EVENTS_JSON;
  if (!raw || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return normalizeStructuredRows(parsed);
  } catch {
    return [];
  }
}

async function fromRemoteUrl(): Promise<StructuredSignalRow[]> {
  const url = process.env.MONITOR_STRUCTURED_EVENTS_URL;
  if (!url) return [];

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'GlobalMonitor/1.0' },
      signal: AbortSignal.timeout(12_000),
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const payload = await res.json();
    if (!Array.isArray(payload)) return [];
    return normalizeStructuredRows(payload);
  } catch {
    return [];
  }
}

export async function fetchStructuredSignals(limit: number = 48): Promise<StructuredSourceResult> {
  const [remoteRows, envRows] = await Promise.all([
    fromRemoteUrl(),
    Promise.resolve(fromEnvJson()),
  ]);

  const allRows = [...remoteRows, ...envRows];
  if (allRows.length === 0) {
    return {
      items: [],
      sourceCoverage: [],
    };
  }

  const dedupedById = new Map<string, StructuredSignalRow>();
  for (const row of allRows) {
    const key = row.id || `${row.title.toLowerCase()}|${row.sourceUrl || ''}|${row.timestamp || ''}`;
    if (!dedupedById.has(key)) dedupedById.set(key, row);
  }

  const normalized = [...dedupedById.values()].slice(0, limit);
  const items = fromRows(normalized, 'Structured Signals');

  const sourceCoverage: SourceCoverageEntry[] = [
    {
      source: 'Structured event source',
      tier: 'specialized',
      weight: 0.95,
      fetched: allRows.length,
      accepted: items.length,
      failed: false,
    },
  ];

  return { items, sourceCoverage };
}
