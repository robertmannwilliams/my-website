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
  fingerprint: string;
  tone: number;
  region: string;
  signalScore: number;
  topicTags: string[];
  mapPriority: number;
  linkConfidence?: number;
}

export type EventCategory =
  | 'conflicts'
  | 'elections'
  | 'economy'
  | 'disasters'
  | 'infrastructure';

export type EventSeverity = 'critical' | 'watch' | 'monitor';
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

interface RuleClassification {
  category: EventCategory;
  severity: EventSeverity;
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
  latitude: number;
  longitude: number;
  confidence: number;
}

interface CachedClassifiedCluster {
  title: string;
  summary: string;
  category: EventCategory;
  severity: EventSeverity;
  lat: number;
  lng: number;
  classificationConfidence: number;
  classificationMethod: ClassificationMethod;
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
  sourceCount: number;
  confidence: number;
  lastSeenAt: string;
}): number {
  const severityScore = severityRank(input.severity) * 4;
  const sourceScore = Math.min(6, input.sourceCount * 1.2);
  const confidenceScore = input.confidence * 6;
  const ageHours = Math.max(0, (Date.now() - new Date(input.lastSeenAt).getTime()) / 3_600_000);
  const recencyScore = Math.max(0, 4 - ageHours / 6);
  return severityScore + sourceScore + confidenceScore + recencyScore;
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
  const titles = cluster.candidates
    .map((c) => c.headline.title)
    .slice(0, 3);
  if (titles.length === 0) return 'No summary available.';
  if (titles.length === 1) return titles[0];
  return `${titles[0]} Additional reporting: ${titles.slice(1).join(' | ')}`;
}

function titleForCluster(cluster: EventCluster): string {
  return cluster.candidates
    .map((c) => c.headline.title)
    .sort((a, b) => b.length - a.length)[0] || 'Global event';
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
    .filter((c) => c.geo)
    .sort((a, b) => (b.geo?.confidence || 0) - (a.geo?.confidence || 0));

  if (withGeo[0]?.geo) return withGeo[0].geo;

  const category = chooseWeightedCategory(cluster);
  if (category === 'conflicts') return centroidForRegion('middle_east');
  if (category === 'elections') return centroidForRegion('global');
  if (category === 'economy') return centroidForRegion('global');
  if (category === 'disasters') return centroidForRegion('global');
  return centroidForRegion('global');
}

function shouldEscalateToLlm(cluster: EventCluster, confidence: number, category: EventCategory, severity: EventSeverity): boolean {
  if (cluster.candidates.length >= 4 && severity !== 'monitor') return true;
  if (confidence < 0.68) return true;
  if (severity === 'critical') return true;

  // If category votes conflict heavily, escalate.
  const categories = new Set(cluster.candidates.map((c) => c.classification.category));
  if (categories.size >= 3) return true;

  // Infrastructure/economy events are often noisier and benefit from semantic pass.
  if (category === 'infrastructure' || category === 'economy') {
    return cluster.candidates.some((c) => c.classification.highImpact);
  }

  return false;
}

async function classifyClusterWithClaude(cluster: EventCluster): Promise<LlmClassification | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const sample = cluster.candidates
    .slice(0, 8)
    .map((c) => `- [${c.headline.source}] ${c.headline.title}${c.headline.summary ? ` | ${c.headline.summary}` : ''}`)
    .join('\n');

  const system = `You classify one geopolitical event cluster for a monitoring dashboard. Return ONLY valid JSON with keys: title, summary, category, severity, latitude, longitude, confidence.\n\nAllowed category values: conflicts, elections, economy, disasters, infrastructure.\nAllowed severity values: critical, watch, monitor.`;

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

    return {
      title: parsed.title,
      summary: parsed.summary,
      category,
      severity,
      latitude: Number(parsed.latitude) || 0,
      longitude: Number(parsed.longitude) || 0,
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.72)),
    };
  } catch {
    return null;
  }
}

function eventFromRules(cluster: EventCluster): CachedClassifiedCluster {
  const category = chooseWeightedCategory(cluster);
  const severity = chooseSeverity(cluster);
  const loc = chooseLocation(cluster);

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
    lat: loc.lat,
    lng: loc.lng,
    classificationConfidence: confidence,
    classificationMethod: 'rules',
  };
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
    return cached;
  }

  const base = eventFromRules(cluster);
  const escalate = shouldEscalateToLlm(
    cluster,
    base.classificationConfidence,
    base.category,
    base.severity,
  );

  let finalResult = base;

  if (escalate && (await canUseLlm(runCalls.value))) {
    const llm = await classifyClusterWithClaude(cluster);
    if (llm) {
      runCalls.value += 1;
      await incrementMetric('llm_calls');
      await incrementMetric('llm_cluster_classifications');

      finalResult = {
        title: llm.title || base.title,
        summary: llm.summary || base.summary,
        category: llm.category || base.category,
        severity: llm.severity || base.severity,
        lat: llm.latitude || base.lat,
        lng: llm.longitude || base.lng,
        classificationConfidence: Math.max(base.classificationConfidence, llm.confidence),
        classificationMethod: base.classificationMethod === 'rules' ? 'hybrid' : 'llm',
      };
    }
  }

  await monitorSetJson(`classified:${cluster.fingerprint}`, finalResult, CLASSIFIED_CLUSTER_TTL);
  return finalResult;
}

export interface ClassifiedEventsResult {
  items: GdeltEvent[];
  sourceCoverage: SourceCoverageEntry[];
}

export async function fetchClassifiedEvents(): Promise<ClassifiedEventsResult> {
  const { items: headlines, sourceCoverage } = await fetchTieredHeadlines(160);
  await incrementMetric('events_headlines_received', headlines.length);

  const candidates = headlines
    .map(toCandidate)
    .filter((x): x is EventCandidate => Boolean(x));

  await incrementMetric('events_candidates_after_rules', candidates.length);

  const clusters = clusterCandidates(candidates);
  await incrementMetric('events_clusters', clusters.length);

  const runCalls = { value: 0 };
  const events: GdeltEvent[] = [];

  for (const cluster of clusters) {
    const classified = await classifyCluster(cluster, runCalls);
    const { firstSeenAt, lastSeenAt } = firstAndLastSeen(cluster);
    const sources = aggregateSources(cluster);

    const id = `evt_${cluster.fingerprint}`;
    const canonicalId = id;
    const timestamp = lastSeenAt;

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
      fingerprint: cluster.fingerprint,
      tone: toneFromSeverity(classified.severity),
      region: inferRegion(classified.lat, classified.lng),
      signalScore: 0,
      topicTags: topicTagsForText(`${classified.title} ${classified.summary}`),
      mapPriority: 0,
    });
  }

  for (const event of events) {
    event.signalScore = eventSignalScoreFromData({
      severity: event.severity,
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
  await incrementMetric('events_final_count', events.length);

  return {
    items: events.slice(0, MAX_EVENTS),
    sourceCoverage,
  };
}
