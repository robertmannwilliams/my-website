import { centroidForRegion, geocodeText, type GeoMatch } from './geo';
import {
  fetchTieredHeadlines,
  hashFingerprint,
  headlineTextForClassification,
  normalizeForSimilarity,
  type IngestedHeadline,
} from './headlines';
import { monitorGetJson, monitorSetJson } from './cache';
import { getMetric, incrementMetric } from './metrics';
import { findRelatedMarkets, type PolymarketMarket } from './polymarket';
import type { SourceCoverageEntry } from './response';

export interface GdeltEvent {
  id: string;
  canonicalId: string;
  title: string;
  category: EventCategory;
  severity: EventSeverity;
  lat: number;
  lng: number;
  timestamp: string;
  summary: string;
  sources: { name: string; url: string }[];
  sourceCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  classificationConfidence: number;
  classificationMethod: ClassificationMethod;
  status: EventStatus;
  actors: string[];
  eventTime: string | null;
  fingerprint: string;
  tone: number;
  region: string;
  signalScore: number;
  topicTags: string[];
  mapPriority: number;
  linkConfidence?: number;
  geoValidity: 'valid' | 'ambiguous' | 'invalid';
  geoReason: string;
  evidenceIds: string[];
  scenarioIds: string[];
}

export interface EventEvidence {
  id: string;
  eventId: string;
  source: string;
  url: string;
  title: string;
  summary: string;
  publishedAt: string;
  sourceWeight: number;
}

export interface EventScenario {
  id: string;
  eventId: string;
  marketId: string;
  title: string;
  probability: number;
  volume: string;
  volumeRaw: number;
  category: string;
  url: string;
  linkConfidence: number;
  topicTags: string[];
}

export interface GeopoliticalEventsPayload {
  events: GdeltEvent[];
  evidence: EventEvidence[];
  scenarios: EventScenario[];
}

export type EventCategory =
  | 'conflicts'
  | 'elections'
  | 'economy'
  | 'disasters'
  | 'infrastructure';

export type EventSeverity = 'critical' | 'watch' | 'monitor';
export type EventStatus = 'observed' | 'upcoming' | 'speculative';
export type ClassificationMethod = 'rules' | 'llm' | 'hybrid';

const CLASSIFIED_CLUSTER_TTL = 72 * 60 * 60; // 72h
const MAX_EVENTS = 200;

const DAILY_LLM_LIMIT = Number(process.env.MONITOR_LLM_DAILY_LIMIT || 220);
const INTERVAL_LLM_LIMIT = Number(process.env.MONITOR_LLM_INTERVAL_LIMIT || 30);

const IRRELEVANT_KEYWORDS = [
  'celebrity',
  'box office',
  'football',
  'nba',
  'mlb',
  'nfl',
  'soccer',
  'music awards',
  'movie review',
  'fashion week',
  'recipe',
  'health tips',
  'lifestyle',
  'iphone',
  'android update',
  'video game',
];

const HIGH_IMPACT_KEYWORDS = [
  'missile',
  'airstrike',
  'invasion',
  'military',
  'nuclear',
  'sanction',
  'ceasefire',
  'default',
  'rate decision',
  'earthquake',
  'hurricane',
  'strait of hormuz',
  'suez',
  'shipping lane',
];

const CATEGORY_RULES: Record<EventCategory, string[]> = {
  conflicts: [
    'war',
    'military',
    'troops',
    'missile',
    'attack',
    'airstrike',
    'ceasefire',
    'drone',
    'clash',
    'border',
    'hostage',
    'invasion',
    'navy',
    'artillery',
    'frontline',
  ],
  elections: [
    'election',
    'vote',
    'ballot',
    'parliament',
    'prime minister',
    'president',
    'poll',
    'coalition',
    'referendum',
    'campaign',
  ],
  economy: [
    'inflation',
    'gdp',
    'recession',
    'interest rate',
    'fed',
    'ecb',
    'tariff',
    'trade',
    'currency',
    'bond',
    'oil price',
    'fiscal',
    'debt',
    'central bank',
  ],
  disasters: [
    'earthquake',
    'tsunami',
    'hurricane',
    'cyclone',
    'wildfire',
    'flood',
    'volcano',
    'drought',
  ],
  infrastructure: [
    'pipeline',
    'grid',
    'power plant',
    'port',
    'shipping',
    'strait',
    'cable',
    'airspace',
    'notam',
    'rail',
    'canal',
  ],
};

const CRITICAL_KEYWORDS = [
  'invasion',
  'missile',
  'airstrike',
  'coup',
  'major earthquake',
  'tsunami warning',
  'nuclear',
  'blockade',
  'martial law',
  'assassinated',
];

const WATCH_KEYWORDS = [
  'sanction',
  'escalation',
  'troops',
  'military drill',
  'protest',
  'warning',
  'tension',
  'strike',
  'talks stalled',
];

const UPCOMING_KEYWORDS = [
  'scheduled',
  'set to',
  'to be held',
  'planned',
  'expected to',
  'upcoming',
  'deadline',
  'summit',
  'vote on',
];

const SPECULATIVE_KEYWORDS = [
  'will ',
  'could ',
  'might ',
  'may ',
  'if ',
  'likely to',
  'odds',
  'chance',
  'what if',
];

const MONTH_DATE_PATTERN =
  /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:,\s*\d{4})?\b/i;
const ISO_DATE_PATTERN = /\b\d{4}-\d{2}-\d{2}(?:[ t]\d{2}:\d{2}(?::\d{2})?(?:z|[+-]\d{2}:?\d{2})?)?\b/i;

const SPECULATIVE_PATTERNS: RegExp[] = [
  /\?/i,
  /^\s*will\s+/i,
  /^\s*could\s+/i,
  /^\s*might\s+/i,
  /^\s*may\s+/i,
  /\bodds?\b/i,
  /\bchance\b/i,
  /\bwhat\s+if\b/i,
  /\bwhether\b/i,
];

const UPCOMING_PATTERNS = UPCOMING_KEYWORDS.map((kw) => new RegExp(`\\b${kw.trim().replace(/\s+/g, '\\s+')}\\b`, 'i'));

const ACTOR_STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'of',
  'in',
  'on',
  'to',
  'for',
  'from',
  'with',
  'by',
  'after',
  'before',
  'amid',
  'new',
  'global',
  'middle',
  'east',
  'north',
  'south',
  'west',
  'east',
  'week',
  'month',
  'year',
  'today',
  'tomorrow',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);

interface RuleClassification {
  category: EventCategory;
  severity: EventSeverity;
  status: EventStatus;
  confidence: number;
  relevance: number;
  highImpact: boolean;
}

interface EventCandidate {
  headline: IngestedHeadline;
  normalized: string;
  classification: RuleClassification;
  geo: GeoMatch | null;
  timestampMs: number;
  fingerprintSeed: string;
}

interface EventCluster {
  fingerprint: string;
  candidates: EventCandidate[];
}

interface LlmClassification {
  title: string;
  summary: string;
  category: EventCategory;
  severity: EventSeverity;
  status: EventStatus;
  actors?: string[];
  eventTime?: string | null;
  latitude: number;
  longitude: number;
  confidence: number;
}

interface CachedClassifiedCluster {
  title: string;
  summary: string;
  category: EventCategory;
  severity: EventSeverity;
  status: EventStatus;
  actors: string[];
  eventTime: string | null;
  lat: number;
  lng: number;
  classificationConfidence: number;
  classificationMethod: ClassificationMethod;
  geoValidity: 'valid' | 'ambiguous' | 'invalid';
  geoReason: string;
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

function toneFromSeverity(severity: EventSeverity): number {
  return severity === 'critical' ? -8 : severity === 'watch' ? -4 : 0;
}

function topicTagsForText(text: string): string[] {
  return normalizeForSimilarity(text)
    .split(' ')
    .filter((token) => token.length >= 4)
    .slice(0, 8);
}

function eventSignalScoreFromData(input: {
  severity: EventSeverity;
  status: EventStatus;
  sourceCount: number;
  confidence: number;
  lastSeenAt: string;
}): number {
  const severityScore = severityRank(input.severity) * 4;
  const sourceScore = Math.min(6, input.sourceCount * 1.2);
  const confidenceScore = input.confidence * 6;
  const ageHours = Math.max(0, (Date.now() - new Date(input.lastSeenAt).getTime()) / 3_600_000);
  const recencyScore = Math.max(0, 4 - ageHours / 6);
  const statusAdjustment = input.status === 'speculative' ? -5 : input.status === 'upcoming' ? -1 : 0;
  return severityScore + sourceScore + confidenceScore + recencyScore + statusAdjustment;
}

function severityRank(s: EventSeverity): number {
  return s === 'critical' ? 3 : s === 'watch' ? 2 : 1;
}

function isIrrelevant(normalized: string): boolean {
  return IRRELEVANT_KEYWORDS.some((kw) => normalized.includes(kw));
}

function containsAny(text: string, words: string[]): boolean {
  return words.some((kw) => text.includes(kw));
}

function containsAnyPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function isQuestionLikeText(text: string): boolean {
  const normalized = normalizeForSimilarity(text || '');
  if (!normalized) return false;
  if (text.includes('?')) return true;
  return containsAnyPattern(normalized, SPECULATIVE_PATTERNS);
}

function inferStatusFromText(normalized: string): EventStatus {
  if (containsAnyPattern(normalized, SPECULATIVE_PATTERNS)) return 'speculative';
  if (containsAnyPattern(normalized, UPCOMING_PATTERNS)) return 'upcoming';
  if (containsAny(normalized, SPECULATIVE_KEYWORDS)) return 'speculative';
  return 'observed';
}

function isEventStatus(value: unknown): value is EventStatus {
  return value === 'observed' || value === 'upcoming' || value === 'speculative';
}

function parseEventTime(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString();
}

function statusBreakdown(cluster: EventCluster): {
  status: EventStatus;
  dominance: number;
  weights: Record<EventStatus, number>;
} {
  const weights: Record<EventStatus, number> = {
    observed: 0,
    upcoming: 0,
    speculative: 0,
  };

  for (const candidate of cluster.candidates) {
    const w = Math.max(0.35, candidate.headline.sourceWeight + candidate.classification.confidence);
    weights[candidate.classification.status] += w;
  }

  const ranked = (Object.entries(weights) as Array<[EventStatus, number]>).sort((a, b) => b[1] - a[1]);
  const [firstStatus, firstWeight] = ranked[0] || ['observed', 0];
  const secondWeight = ranked[1]?.[1] || 0;
  const total = firstWeight + secondWeight + (ranked[2]?.[1] || 0);
  const dominance = total > 0 ? (firstWeight - secondWeight) / total : 1;

  return {
    status: firstStatus,
    dominance,
    weights,
  };
}

function extractActorsFromCluster(cluster: EventCluster): string[] {
  const scoreByActor = new Map<string, number>();
  const displayByActor = new Map<string, string>();

  for (const candidate of cluster.candidates.slice(0, 12)) {
    const text = `${candidate.headline.title} ${candidate.headline.summary || ''}`;
    const matches = text.match(/\b(?:[A-Z][a-z]+|[A-Z]{2,})(?:\s+(?:[A-Z][a-z]+|[A-Z]{2,})){0,2}\b/g) || [];
    const weight = Math.max(0.4, candidate.headline.sourceWeight + candidate.classification.confidence * 0.4);

    for (const raw of matches) {
      const cleaned = raw
        .trim()
        .replace(/[^A-Za-z0-9'\-.\s]/g, '')
        .replace(/\s+/g, ' ');

      if (cleaned.length < 3) continue;
      const pieces = cleaned.toLowerCase().split(' ');
      if (pieces.every((piece) => ACTOR_STOPWORDS.has(piece))) continue;
      if (pieces.length === 1 && pieces[0].length < 4 && !/^[A-Z]{2,}$/.test(cleaned)) continue;

      const key = cleaned.toLowerCase();
      scoreByActor.set(key, (scoreByActor.get(key) || 0) + weight);
      if (!displayByActor.has(key)) displayByActor.set(key, cleaned);
    }
  }

  return [...scoreByActor.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([key]) => displayByActor.get(key) || key);
}

function extractRelativeEventTime(normalized: string, baseIso: string): string | null {
  const base = new Date(baseIso);
  if (!Number.isFinite(base.getTime())) return null;

  if (/\btomorrow\b/i.test(normalized)) {
    const date = new Date(base.getTime() + 24 * 60 * 60_000);
    return date.toISOString();
  }

  if (/\bnext week\b/i.test(normalized)) {
    const date = new Date(base.getTime() + 7 * 24 * 60 * 60_000);
    return date.toISOString();
  }

  if (/\bnext month\b/i.test(normalized)) {
    const date = new Date(base);
    date.setUTCMonth(date.getUTCMonth() + 1);
    return date.toISOString();
  }

  if (/\btoday\b/i.test(normalized)) {
    return base.toISOString();
  }

  return null;
}

function extractEventTimeFromCluster(cluster: EventCluster, status: EventStatus): string | null {
  if (status === 'observed') return null;

  const bySourceWeight = [...cluster.candidates].sort((a, b) => b.headline.sourceWeight - a.headline.sourceWeight);
  for (const candidate of bySourceWeight) {
    const text = `${candidate.headline.title} ${candidate.headline.summary || ''}`;
    const normalized = normalizeForSimilarity(text);

    const isoMatch = text.match(ISO_DATE_PATTERN)?.[0];
    const isoParsed = parseEventTime(isoMatch || null);
    if (isoParsed) return isoParsed;

    const monthMatch = text.match(MONTH_DATE_PATTERN)?.[0];
    if (monthMatch) {
      const monthWithYear = /\d{4}/.test(monthMatch)
        ? monthMatch
        : `${monthMatch}, ${new Date(candidate.headline.timestamp).getUTCFullYear()}`;
      const monthParsed = parseEventTime(monthWithYear);
      if (monthParsed) return monthParsed;
    }

    const relative = extractRelativeEventTime(normalized, candidate.headline.timestamp);
    if (relative) return relative;
  }

  return null;
}

function sanitizeActors(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const cleaned: string[] = [];
  const seen = new Set<string>();

  for (const entry of value) {
    if (typeof entry !== 'string') continue;
    const actor = entry.trim().replace(/\s+/g, ' ');
    if (actor.length < 2) continue;
    const key = actor.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push(actor);
    if (cleaned.length >= 8) break;
  }

  return cleaned;
}

function inferRuleClassification(normalized: string, sourceWeight: number): RuleClassification {
  let bestCategory: EventCategory = 'conflicts';
  let bestScore = -1;

  for (const [category, keywords] of Object.entries(CATEGORY_RULES) as [EventCategory, string[]][]) {
    const score = keywords.reduce((sum, kw) => sum + (normalized.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  const critical = containsAny(normalized, CRITICAL_KEYWORDS);
  const watch = critical ? false : containsAny(normalized, WATCH_KEYWORDS);
  const severity: EventSeverity = critical ? 'critical' : watch ? 'watch' : 'monitor';
  const status = inferStatusFromText(normalized);

  const highImpact = containsAny(normalized, HIGH_IMPACT_KEYWORDS) || severity !== 'monitor';

  const baseConfidence = Math.min(0.95, 0.45 + bestScore * 0.1 + sourceWeight * 0.2 + (highImpact ? 0.08 : 0));
  const relevance = Math.min(
    10,
    Math.max(
      1,
      Math.round(bestScore * 1.4 + sourceWeight * 3 + (highImpact ? 2 : 0) + (severity === 'critical' ? 2 : severity === 'watch' ? 1 : 0)),
    ),
  );

  return {
    category: bestCategory,
    severity,
    status,
    confidence: baseConfidence,
    relevance,
    highImpact,
  };
}

function headlineFingerprintSeed(c: EventCandidate): string {
  const timeBucket = new Date(c.headline.timestamp);
  const day = `${timeBucket.getUTCFullYear()}-${String(timeBucket.getUTCMonth() + 1).padStart(2, '0')}-${String(timeBucket.getUTCDate()).padStart(2, '0')}`;
  const loc = c.geo?.key || 'global';
  const keyTerms = c.normalized
    .split(' ')
    .filter((t) => t.length >= 4)
    .slice(0, 8)
    .join('_');
  return `${c.classification.category}|${loc}|${day}|${keyTerms}`;
}

function toCandidate(headline: IngestedHeadline): EventCandidate | null {
  const normalized = normalizeForSimilarity(headlineTextForClassification(headline));
  if (!normalized || isIrrelevant(normalized)) return null;

  const classification = inferRuleClassification(normalized, headline.sourceWeight);
  if (
    classification.status === 'speculative' &&
    !classification.highImpact &&
    headline.sourceWeight < 0.85
  ) {
    return null;
  }
  if (classification.relevance < 5) return null;

  const geo = geocodeText(`${headline.title} ${headline.summary}`);

  const candidate: EventCandidate = {
    headline,
    normalized,
    classification,
    geo,
    timestampMs: new Date(headline.timestamp).getTime(),
    fingerprintSeed: '',
  };
  candidate.fingerprintSeed = headlineFingerprintSeed(candidate);
  return candidate;
}

function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.split(' ').filter(Boolean));
  const setB = new Set(b.split(' ').filter(Boolean));
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  return intersection / (setA.size + setB.size - intersection);
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLng = (lng2 - lng1) * toRad;
  const aa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
}

function canMergeClusters(base: EventCluster, other: EventCluster): boolean {
  const a = base.candidates[0];
  const b = other.candidates[0];

  if (a.classification.category !== b.classification.category) return false;

  const titleSimilarity = jaccardSimilarity(a.normalized, b.normalized);
  const timeDeltaHours = Math.abs(a.timestampMs - b.timestampMs) / 3_600_000;

  if (timeDeltaHours > 48) return false;

  if (a.geo && b.geo) {
    const dist = haversineKm(a.geo.lat, a.geo.lng, b.geo.lat, b.geo.lng);
    if (dist > 500) return false;
  }

  return titleSimilarity >= 0.45;
}

function clusterCandidates(candidates: EventCandidate[]): EventCluster[] {
  const grouped = new Map<string, EventCluster>();
  for (const c of candidates) {
    const fp = hashFingerprint(c.fingerprintSeed);
    const existing = grouped.get(fp);
    if (!existing) {
      grouped.set(fp, { fingerprint: fp, candidates: [c] });
    } else {
      existing.candidates.push(c);
    }
  }

  const initial = [...grouped.values()];
  const consumed = new Set<number>();
  const merged: EventCluster[] = [];

  for (let i = 0; i < initial.length; i++) {
    if (consumed.has(i)) continue;
    const base = { ...initial[i], candidates: [...initial[i].candidates] };

    for (let j = i + 1; j < initial.length; j++) {
      if (consumed.has(j)) continue;
      if (!canMergeClusters(base, initial[j])) continue;
      consumed.add(j);
      base.candidates.push(...initial[j].candidates);
    }

    const mergedSeed = base.candidates.map((c) => c.fingerprintSeed).sort().slice(0, 10).join('|');
    merged.push({ fingerprint: hashFingerprint(mergedSeed), candidates: base.candidates });
  }

  return merged;
}

function chooseWeightedCategory(cluster: EventCluster): EventCategory {
  const weights = new Map<EventCategory, number>();
  for (const c of cluster.candidates) {
    const prev = weights.get(c.classification.category) || 0;
    weights.set(c.classification.category, prev + c.headline.sourceWeight + c.classification.confidence);
  }

  let best: EventCategory = 'conflicts';
  let score = -1;
  for (const [cat, value] of weights.entries()) {
    if (value > score) {
      score = value;
      best = cat;
    }
  }
  return best;
}

function chooseSeverity(cluster: EventCluster): EventSeverity {
  if (cluster.candidates.some((c) => c.classification.severity === 'critical')) return 'critical';
  if (cluster.candidates.some((c) => c.classification.severity === 'watch')) return 'watch';
  return 'monitor';
}

function summarizeCluster(cluster: EventCluster): string {
  const ranked = [...cluster.candidates].sort(
    (a, b) => (b.headline.sourceWeight + b.classification.confidence) - (a.headline.sourceWeight + a.classification.confidence),
  );
  const primary = ranked[0];
  if (!primary) return 'No summary available.';

  const primarySummary = (primary.headline.summary || primary.headline.title || '').trim();
  if (!primarySummary) return 'No summary available.';

  const supporting = ranked
    .slice(1, 4)
    .map((item) => (item.headline.summary || item.headline.title || '').trim())
    .filter(Boolean);

  if (supporting.length === 0) return primarySummary;
  return `${primarySummary} Supporting reports indicate: ${supporting.slice(0, 2).join(' | ')}`;
}

function titleForCluster(cluster: EventCluster): string {
  const ranked = [...cluster.candidates].sort((a, b) => {
    const aQuestionPenalty = isQuestionLikeText(a.headline.title) ? 0.45 : 0;
    const bQuestionPenalty = isQuestionLikeText(b.headline.title) ? 0.45 : 0;
    const aScore = a.headline.sourceWeight + a.classification.confidence - aQuestionPenalty;
    const bScore = b.headline.sourceWeight + b.classification.confidence - bQuestionPenalty;
    return bScore - aScore;
  });

  const bestNonQuestion = ranked.find((item) => !isQuestionLikeText(item.headline.title));
  const best = bestNonQuestion || ranked[0];
  if (!best) return 'Global event';

  return best.headline.title.replace(/\?+\s*$/, '').trim();
}

function aggregateSources(cluster: EventCluster): { name: string; url: string }[] {
  const seen = new Set<string>();
  const out: { name: string; url: string }[] = [];

  for (const c of cluster.candidates) {
    const key = `${c.headline.source}|${c.headline.canonicalUrl}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name: c.headline.source, url: c.headline.url });
  }

  return out.slice(0, 8);
}

function aggregateEvidence(cluster: EventCluster, eventId: string): EventEvidence[] {
  const seen = new Set<string>();
  const out: EventEvidence[] = [];
  const ranked = [...cluster.candidates].sort((a, b) => b.headline.sourceWeight - a.headline.sourceWeight);

  for (const candidate of ranked) {
    const canonical = candidate.headline.canonicalUrl || candidate.headline.url || '';
    const key = canonical || `${candidate.headline.source}|${candidate.headline.title}`;
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const evidenceId = `evd_${hashFingerprint(`${eventId}|${key}`)}`;
    out.push({
      id: evidenceId,
      eventId,
      source: candidate.headline.source,
      url: candidate.headline.url,
      title: candidate.headline.title,
      summary: candidate.headline.summary || '',
      publishedAt: candidate.headline.timestamp,
      sourceWeight: candidate.headline.sourceWeight,
    });
  }

  return out.slice(0, 14);
}

function buildEventScenarios(event: GdeltEvent, markets: PolymarketMarket[]): EventScenario[] {
  if (markets.length === 0) return [];

  const linked = findRelatedMarkets(event, markets);
  const out: EventScenario[] = [];

  for (const market of linked) {
    const id = `scn_${hashFingerprint(`${event.id}|${market.id}`)}`;
    out.push({
      id,
      eventId: event.id,
      marketId: market.id,
      title: market.title,
      probability: market.probability,
      volume: market.volume,
      volumeRaw: market.volumeRaw,
      category: market.category,
      url: market.url,
      linkConfidence: market.linkConfidence ?? 0,
      topicTags: (market.topicTags || []).slice(0, 5),
    });
  }

  return out;
}

function firstAndLastSeen(cluster: EventCluster): { firstSeenAt: string; lastSeenAt: string } {
  const timestamps = cluster.candidates.map((c) => new Date(c.headline.timestamp).getTime()).filter(Number.isFinite);
  if (timestamps.length === 0) {
    const now = new Date().toISOString();
    return { firstSeenAt: now, lastSeenAt: now };
  }

  const first = new Date(Math.min(...timestamps)).toISOString();
  const last = new Date(Math.max(...timestamps)).toISOString();
  return { firstSeenAt: first, lastSeenAt: last };
}

function chooseLocation(cluster: EventCluster): GeoMatch {
  const withGeo = cluster.candidates
    .filter((c): c is EventCandidate & { geo: GeoMatch } => Boolean(c.geo))
    .map((c) => c.geo)
    .sort((a, b) => b.confidence - a.confidence);

  const valid = withGeo.filter((geo) => geo.validity === 'valid');
  if (valid[0]) return valid[0];

  const ambiguous = withGeo.filter((geo) => geo.validity === 'ambiguous');
  if (ambiguous[0]) return ambiguous[0];

  const category = chooseWeightedCategory(cluster);
  if (category === 'conflicts') return centroidForRegion('middle_east');
  if (category === 'elections') return centroidForRegion('global');
  if (category === 'economy') return centroidForRegion('global');
  if (category === 'disasters') return centroidForRegion('global');
  return centroidForRegion('global');
}

function shouldEscalateToLlm(
  cluster: EventCluster,
  confidence: number,
  category: EventCategory,
  severity: EventSeverity,
  status: EventStatus,
  statusDominance: number,
): boolean {
  const highImpactCluster = cluster.candidates.some((c) => c.classification.highImpact || c.classification.severity !== 'monitor');
  const categories = new Set(cluster.candidates.map((c) => c.classification.category));
  const hasQuestionLikeHeadline = cluster.candidates.some((c) => isQuestionLikeText(c.headline.title));

  if (hasQuestionLikeHeadline) return true;
  if (cluster.candidates.length >= 2 && status !== 'speculative') return true;
  if (severity === 'critical') return true;
  if (status === 'upcoming') return true;
  if (statusDominance < 0.22) return true;
  if (confidence < 0.72) return true;
  if (categories.size >= 3) return true;

  if (status === 'speculative' && cluster.candidates.length <= 2 && !highImpactCluster) {
    return false;
  }

  if (category === 'infrastructure' || category === 'economy') {
    return highImpactCluster || cluster.candidates.length >= 2;
  }

  return highImpactCluster && cluster.candidates.length >= 2;
}

async function classifyClusterWithClaude(cluster: EventCluster): Promise<LlmClassification | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const sample = cluster.candidates
    .slice(0, 8)
    .map((c) => `- [${c.headline.source}] ${c.headline.title}${c.headline.summary ? ` | ${c.headline.summary}` : ''}`)
    .join('\n');

  const system = `You classify one geopolitical event cluster for a monitoring dashboard.
Return ONLY valid JSON with keys:
title, summary, category, severity, status, actors, eventTime, latitude, longitude, confidence.

Allowed category values: conflicts, elections, economy, disasters, infrastructure.
Allowed severity values: critical, watch, monitor.
Allowed status values: observed, upcoming, speculative.

Rules:
- "observed" means event occurred/ongoing.
- "upcoming" means scheduled/expected future event.
- "speculative" means hypothetical/question-like or prediction framing.
- title MUST be declarative and factual, never a question, never start with "Will/Could/Might/May".
- if inputs are mostly hypothetical/prediction framing, set status=speculative and use title prefix "Speculation:".
- actors should be an array of 1-6 concrete entities (countries, organizations, leaders), empty array if unclear.
- eventTime should be ISO timestamp if explicit in text, else null.`;

  const user = `Classify this cluster of headlines into one canonical event:\n${sample}`;

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
        max_tokens: 1000,
        system,
        messages: [{ role: 'user', content: user }],
      }),
      signal: AbortSignal.timeout(35_000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    let text: string = data.content?.[0]?.text || '';
    if (!text) return null;

    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(text) as Partial<LlmClassification>;
    if (!parsed.title || !parsed.summary || !parsed.category || !parsed.severity) return null;

    const category = (['conflicts', 'elections', 'economy', 'disasters', 'infrastructure'].includes(parsed.category)
      ? parsed.category
      : 'conflicts') as EventCategory;
    const severity = (['critical', 'watch', 'monitor'].includes(parsed.severity)
      ? parsed.severity
      : 'monitor') as EventSeverity;
    const status = isEventStatus(parsed.status)
      ? parsed.status
      : inferStatusFromText(normalizeForSimilarity(`${parsed.title || ''} ${parsed.summary || ''}`));
    const actors = sanitizeActors(parsed.actors);
    const eventTime = parseEventTime(parsed.eventTime);

    const fallbackTitle = titleForCluster(cluster);
    const parsedTitle = (parsed.title || '').trim();
    const llmTitle =
      status !== 'speculative' && isQuestionLikeText(parsedTitle)
        ? fallbackTitle
        : (parsedTitle || fallbackTitle);

    const lat = Number(parsed.latitude);
    const lng = Number(parsed.longitude);
    const hasCoords =
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      Math.abs(lat) <= 90 &&
      Math.abs(lng) <= 180;

    return {
      title: llmTitle,
      summary: parsed.summary,
      category,
      severity,
      status,
      actors,
      eventTime,
      latitude: hasCoords ? lat : Number.NaN,
      longitude: hasCoords ? lng : Number.NaN,
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.72)),
    };
  } catch {
    return null;
  }
}

function eventFromRules(cluster: EventCluster): CachedClassifiedCluster {
  const category = chooseWeightedCategory(cluster);
  const severity = chooseSeverity(cluster);
  const statusInfo = statusBreakdown(cluster);
  const loc = chooseLocation(cluster);
  const actors = extractActorsFromCluster(cluster);
  const eventTime = extractEventTimeFromCluster(cluster, statusInfo.status);

  const sourceWeightAvg =
    cluster.candidates.reduce((sum, c) => sum + c.headline.sourceWeight, 0) / Math.max(1, cluster.candidates.length);
  const confidence = Math.max(
    0.45,
    Math.min(
      0.95,
      0.5 + sourceWeightAvg * 0.2 + Math.log2(cluster.candidates.length + 1) * 0.1,
    ),
  );

  return {
    title: titleForCluster(cluster),
    summary: summarizeCluster(cluster),
    category,
    severity,
    status: statusInfo.status,
    actors,
    eventTime,
    lat: loc.lat,
    lng: loc.lng,
    classificationConfidence: confidence,
    classificationMethod: 'rules',
    geoValidity: loc.validity,
    geoReason: loc.reason,
  };
}

function normalizeCachedCluster(cached: CachedClassifiedCluster, cluster: EventCluster): CachedClassifiedCluster {
  const statusInfo = statusBreakdown(cluster);
  const status = isEventStatus(cached.status) ? cached.status : statusInfo.status;
  const actors = sanitizeActors(cached.actors);
  const fallbackActors = actors.length > 0 ? actors : extractActorsFromCluster(cluster);
  const eventTime = parseEventTime(cached.eventTime) || extractEventTimeFromCluster(cluster, status);

  return {
    ...cached,
    status,
    actors: fallbackActors,
    eventTime,
  };
}

function applyStatusPolicy(
  input: {
    status: EventStatus;
    title: string;
    summary: string;
    sourceCount: number;
    severity: EventSeverity;
    confidence: number;
    eventTime: string | null;
  },
): EventStatus {
  let status = input.status;
  const normalized = normalizeForSimilarity(`${input.title} ${input.summary || ''}`);
  const questionLike = containsAnyPattern(normalized, SPECULATIVE_PATTERNS);

  if (questionLike && input.sourceCount <= 1) {
    status = 'speculative';
  } else if (questionLike && input.sourceCount <= 2 && !input.eventTime && input.confidence < 0.92) {
    status = 'speculative';
  } else if (
    questionLike &&
    input.sourceCount <= 2 &&
    input.severity === 'monitor' &&
    input.confidence < 0.9
  ) {
    status = 'speculative';
  }

  if (status === 'upcoming' && input.eventTime) {
    const eventTimeMs = new Date(input.eventTime).getTime();
    if (Number.isFinite(eventTimeMs) && eventTimeMs < Date.now() - 24 * 60 * 60_000) {
      status = 'observed';
    }
  }

  return status;
}

async function canUseLlm(runCalls: number): Promise<boolean> {
  if (!process.env.ANTHROPIC_API_KEY) return false;
  if (runCalls >= INTERVAL_LLM_LIMIT) return false;

  const dailyCount = await getMetric('llm_calls');
  return dailyCount < DAILY_LLM_LIMIT;
}

async function classifyCluster(cluster: EventCluster, runCalls: { value: number }): Promise<CachedClassifiedCluster> {
  const cached = await monitorGetJson<CachedClassifiedCluster>(`classified:${cluster.fingerprint}`);
  if (cached) {
    await incrementMetric('classified_cluster_cache_hit');
    return normalizeCachedCluster(cached, cluster);
  }

  const base = eventFromRules(cluster);
  const statusInfo = statusBreakdown(cluster);
  const escalate = shouldEscalateToLlm(
    cluster,
    base.classificationConfidence,
    base.category,
    base.severity,
    base.status,
    statusInfo.dominance,
  );

  let finalResult = base;

  if (escalate && (await canUseLlm(runCalls.value))) {
    const llm = await classifyClusterWithClaude(cluster);
    if (llm) {
      runCalls.value += 1;
      await incrementMetric('llm_calls');
      await incrementMetric('llm_cluster_classifications');

      const hasLlmCoords =
        Number.isFinite(llm.latitude) &&
        Number.isFinite(llm.longitude) &&
        Math.abs(llm.latitude) <= 90 &&
        Math.abs(llm.longitude) <= 180;
      const llmActors = sanitizeActors(llm.actors);
      const llmEventTime = parseEventTime(llm.eventTime);

      finalResult = {
        title: llm.title || base.title,
        summary: llm.summary || base.summary,
        category: llm.category || base.category,
        severity: llm.severity || base.severity,
        status: llm.status || base.status,
        actors: llmActors.length > 0 ? llmActors : base.actors,
        eventTime: llmEventTime || base.eventTime,
        lat: hasLlmCoords ? llm.latitude : base.lat,
        lng: hasLlmCoords ? llm.longitude : base.lng,
        classificationConfidence: Math.max(base.classificationConfidence, llm.confidence),
        classificationMethod: base.classificationMethod === 'rules' ? 'hybrid' : 'llm',
        geoValidity: hasLlmCoords ? 'valid' : base.geoValidity,
        geoReason: hasLlmCoords ? 'llm-provided coordinates' : base.geoReason,
      };
    }
  }

  await monitorSetJson(`classified:${cluster.fingerprint}`, finalResult, CLASSIFIED_CLUSTER_TTL);
  return finalResult;
}

export interface ClassifiedEventsResult {
  items: GeopoliticalEventsPayload;
  sourceCoverage: SourceCoverageEntry[];
}

export async function fetchClassifiedEvents(markets: PolymarketMarket[] = []): Promise<ClassifiedEventsResult> {
  const { items: headlines, sourceCoverage } = await fetchTieredHeadlines(160);
  await incrementMetric('events_headlines_received', headlines.length);

  const candidates = headlines
    .map(toCandidate)
    .filter((x): x is EventCandidate => Boolean(x));

  await incrementMetric('events_candidates_after_rules', candidates.length);

  const clusters = clusterCandidates(candidates);
  const clusterPriority = (cluster: EventCluster): number => {
    const candidateCount = cluster.candidates.length;
    const avgSourceWeight =
      cluster.candidates.reduce((sum, item) => sum + item.headline.sourceWeight, 0) / Math.max(1, candidateCount);
    const severityScore = cluster.candidates.some((item) => item.classification.severity === 'critical')
      ? 4
      : cluster.candidates.some((item) => item.classification.severity === 'watch')
        ? 2
        : 0;
    const questionPenalty = cluster.candidates.some((item) => isQuestionLikeText(item.headline.title)) ? -0.75 : 0;
    return candidateCount * 2 + avgSourceWeight * 3 + severityScore + questionPenalty;
  };
  clusters.sort((a, b) => clusterPriority(b) - clusterPriority(a));
  await incrementMetric('events_clusters', clusters.length);

  const runCalls = { value: 0 };
  const events: GdeltEvent[] = [];
  const evidenceByEventId = new Map<string, EventEvidence[]>();
  let demotedSpeculativeCount = 0;

  for (const cluster of clusters) {
    const classified = await classifyCluster(cluster, runCalls);
    const { firstSeenAt, lastSeenAt } = firstAndLastSeen(cluster);
    const sources = aggregateSources(cluster);
    const eventTime = parseEventTime(classified.eventTime);
    const status = applyStatusPolicy({
      status: classified.status,
      title: classified.title,
      summary: classified.summary,
      sourceCount: sources.length,
      severity: classified.severity,
      confidence: classified.classificationConfidence,
      eventTime,
    });
    if (status === 'speculative' && classified.status !== 'speculative') {
      demotedSpeculativeCount += 1;
    }

    const id = `evt_${cluster.fingerprint}`;
    const canonicalId = id;
    const timestamp = lastSeenAt;
    const evidence = aggregateEvidence(cluster, id);
    evidenceByEventId.set(id, evidence);

    events.push({
      id,
      canonicalId,
      title: classified.title,
      category: classified.category,
      severity: classified.severity,
      lat: classified.lat,
      lng: classified.lng,
      timestamp,
      summary: classified.summary,
      sources,
      sourceCount: sources.length,
      firstSeenAt,
      lastSeenAt,
      classificationConfidence: classified.classificationConfidence,
      classificationMethod: classified.classificationMethod,
      status,
      actors: sanitizeActors(classified.actors),
      eventTime,
      fingerprint: cluster.fingerprint,
      tone: toneFromSeverity(classified.severity),
      region: inferRegion(classified.lat, classified.lng),
      signalScore: 0,
      topicTags: topicTagsForText(`${classified.title} ${classified.summary}`),
      mapPriority: 0,
      geoValidity: classified.geoValidity,
      geoReason: classified.geoReason,
      evidenceIds: evidence.map((item) => item.id),
      scenarioIds: [],
    });
  }

  for (const event of events) {
    event.signalScore = eventSignalScoreFromData({
      severity: event.severity,
      status: event.status,
      sourceCount: event.sourceCount,
      confidence: event.classificationConfidence,
      lastSeenAt: event.lastSeenAt,
    });
    event.mapPriority = event.signalScore;
  }

  events.sort((a, b) => {
    const sev = severityRank(b.severity) - severityRank(a.severity);
    if (sev !== 0) return sev;

    if (b.sourceCount !== a.sourceCount) return b.sourceCount - a.sourceCount;
    return new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime();
  });

  const dedupRatio = headlines.length > 0 ? 1 - events.length / headlines.length : 0;
  await incrementMetric('events_dedup_ratio_bp', Math.round(dedupRatio * 10_000));
  if (demotedSpeculativeCount > 0) {
    await incrementMetric('events_status_demoted_speculative', demotedSpeculativeCount);
  }
  const topEvents = events.slice(0, MAX_EVENTS);
  const evidence: EventEvidence[] = [];
  const scenarios: EventScenario[] = [];

  for (const event of topEvents) {
    const eventEvidence = evidenceByEventId.get(event.id) || [];
    evidence.push(...eventEvidence);
    const linkedScenarios = buildEventScenarios(event, markets);
    event.scenarioIds = linkedScenarios.map((item) => item.id);
    scenarios.push(...linkedScenarios);
  }

  await incrementMetric('events_final_count', topEvents.length);
  await incrementMetric('events_evidence_records', evidence.length);
  await incrementMetric('events_scenario_records', scenarios.length);

  return {
    items: {
      events: topEvents,
      evidence,
      scenarios,
    },
    sourceCoverage,
  };
}
