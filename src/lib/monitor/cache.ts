import { toMonitorResponse, type CacheState, type MonitorResponse, type MonitorResponseMeta, type SourceCoverageEntry } from './response';

interface CachedEnvelope<T> {
  items: T;
  generatedAt: string;
  sourceCoverage?: SourceCoverageEntry[];
}

interface MemoryEntry {
  value: string;
  expiresAt: number | null;
}

const PIPELINE_VERSION = 'monitor-v1';
const PREFIX = 'monitor:v1';

const memoryStore = new Map<string, MemoryEntry>();
interface RedisRestConfig {
  baseUrl: string;
  token: string;
}

function firstNonEmpty(values: Array<string | undefined>): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function tokenFromUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.password) return decodeURIComponent(parsed.password);
  } catch {
    // Ignore invalid URL.
  }
  return null;
}

function restUrlFromRedisUrl(redisUrl: string): string | null {
  try {
    const parsed = new URL(redisUrl);
    if (parsed.protocol !== 'redis:' && parsed.protocol !== 'rediss:') return null;
    if (!parsed.hostname) return null;
    const host = parsed.hostname.toLowerCase();
    if (!host.endsWith('upstash.io')) return null;
    return `https://${host}`;
  } catch {
    return null;
  }
}

function getRedisRestConfig(): RedisRestConfig | null {
  const explicitToken = firstNonEmpty([
    process.env.KV_REST_API_TOKEN,
    process.env.UPSTASH_REDIS_REST_TOKEN,
    process.env.REDIS_REST_TOKEN,
    process.env.REDIS_TOKEN,
  ]);
  const explicitRestUrl = firstNonEmpty([
    process.env.KV_REST_API_URL,
    process.env.UPSTASH_REDIS_REST_URL,
    process.env.REDIS_REST_URL,
  ]);
  const redisUrl = firstNonEmpty([process.env.REDIS_URL]);

  if (explicitRestUrl) {
    const token = explicitToken || tokenFromUrl(explicitRestUrl);
    if (!token) return null;
    return {
      baseUrl: explicitRestUrl.replace(/\/$/, ''),
      token,
    };
  }

  if (redisUrl) {
    const derivedRestUrl = restUrlFromRedisUrl(redisUrl);
    const token = explicitToken || tokenFromUrl(redisUrl);
    if (!derivedRestUrl || !token) return null;
    return {
      baseUrl: derivedRestUrl,
      token,
    };
  }

  return null;
}

function keyFor(resource: string): string {
  return `${PREFIX}:payload:${resource}`;
}

function withPrefix(key: string): string {
  return `${PREFIX}:${key}`;
}

function kvConfigured(): boolean {
  return Boolean(getRedisRestConfig());
}

function fullKvUrl(base: string, path: string): string {
  if (!path) return `${base.replace(/\/$/, '')}`;
  return `${base.replace(/\/$/, '')}/${path}`;
}

async function kvCommand(command: Array<string | number>): Promise<unknown> {
  const config = getRedisRestConfig();
  if (!config) throw new Error('Redis REST not configured');

  const url = fullKvUrl(config.baseUrl, '');
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) throw new Error(`KV ${res.status}`);
  const data = await res.json();
  return data?.result;
}

function memoryGetRaw(key: string): string | null {
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt && entry.expiresAt < Date.now()) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value;
}

function memorySetRaw(key: string, value: string, ttlSeconds?: number) {
  memoryStore.set(key, {
    value,
    expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
  });
}

export async function monitorGetJson<T>(key: string): Promise<T | null> {
  const fullKey = withPrefix(key);

  if (!kvConfigured()) {
    const raw = memoryGetRaw(fullKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  try {
    const result = await kvCommand(['GET', fullKey]);
    if (typeof result !== 'string') return null;
    return JSON.parse(result) as T;
  } catch {
    const raw = memoryGetRaw(fullKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
}

export async function monitorSetJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
  const fullKey = withPrefix(key);
  const serialized = JSON.stringify(value);

  memorySetRaw(fullKey, serialized, ttlSeconds);

  if (!kvConfigured()) return;

  try {
    if (ttlSeconds) {
      await kvCommand(['SET', fullKey, serialized, 'EX', ttlSeconds]);
    } else {
      await kvCommand(['SET', fullKey, serialized]);
    }
  } catch {
    // Keep memory fallback only.
  }
}

export async function monitorIncrementBy(key: string, amount: number, ttlSeconds?: number): Promise<number> {
  const fullKey = withPrefix(key);

  if (!kvConfigured()) {
    const existing = Number(memoryGetRaw(fullKey) || '0') || 0;
    const next = existing + amount;
    memorySetRaw(fullKey, String(next), ttlSeconds);
    return next;
  }

  try {
    const result = await kvCommand(['INCRBY', fullKey, amount]);
    if (ttlSeconds) {
      await kvCommand(['EXPIRE', fullKey, ttlSeconds]);
    }
    const num = Number(result);
    if (Number.isFinite(num)) {
      memorySetRaw(fullKey, String(num), ttlSeconds);
      return num;
    }
  } catch {
    // Fall back to memory counter below.
  }

  const existing = Number(memoryGetRaw(fullKey) || '0') || 0;
  const next = existing + amount;
  memorySetRaw(fullKey, String(next), ttlSeconds);
  return next;
}

export async function monitorGetNumber(key: string): Promise<number> {
  const fullKey = withPrefix(key);

  if (!kvConfigured()) {
    return Number(memoryGetRaw(fullKey) || '0') || 0;
  }

  try {
    const result = await kvCommand(['GET', fullKey]);
    if (typeof result === 'number') return result;
    if (typeof result === 'string') return Number(result) || 0;
  } catch {
    // Fall through.
  }

  return Number(memoryGetRaw(fullKey) || '0') || 0;
}

export interface CacheReadResult<T> {
  payload: CachedEnvelope<T> | null;
  ageSeconds: number;
  fresh: boolean;
}

export async function readCachedPayload<T>(resource: string, ttlSeconds: number): Promise<CacheReadResult<T>> {
  const cacheKey = keyFor(resource);
  const payload = await monitorGetJson<CachedEnvelope<T>>(cacheKey);

  if (!payload) {
    return { payload: null, ageSeconds: 0, fresh: false };
  }

  const ageSeconds = Math.max(0, Math.floor((Date.now() - new Date(payload.generatedAt).getTime()) / 1000));
  return {
    payload,
    ageSeconds,
    fresh: ageSeconds <= ttlSeconds,
  };
}

export async function writeCachedPayload<T>(resource: string, items: T, sourceCoverage: SourceCoverageEntry[] | undefined, ttlSeconds: number): Promise<CachedEnvelope<T>> {
  const payload: CachedEnvelope<T> = {
    items,
    generatedAt: new Date().toISOString(),
    sourceCoverage,
  };

  await monitorSetJson(keyFor(resource), payload, Math.max(ttlSeconds * 4, 900));
  return payload;
}

export function makeMeta(params: {
  generatedAt: string;
  freshnessSeconds: number;
  cacheState: CacheState;
  sourceCoverage?: SourceCoverageEntry[];
}): MonitorResponseMeta {
  return {
    generatedAt: params.generatedAt,
    freshnessSeconds: params.freshnessSeconds,
    cacheState: params.cacheState,
    pipelineVersion: PIPELINE_VERSION,
    sourceCoverage: params.sourceCoverage,
  };
}

export function envelopeFromPayload<T>(payload: CachedEnvelope<T>, freshnessSeconds: number, cacheState: CacheState): MonitorResponse<T> {
  return toMonitorResponse(
    payload.items,
    makeMeta({
      generatedAt: payload.generatedAt,
      freshnessSeconds,
      cacheState,
      sourceCoverage: payload.sourceCoverage,
    }),
  );
}
