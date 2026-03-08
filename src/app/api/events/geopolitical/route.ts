import { NextResponse } from 'next/server';
import {
  fetchClassifiedEvents,
  type GdeltEvent,
  type GeopoliticalEventsPayload,
  type OffMapEventCandidate,
} from '@/lib/monitor/events';
import type { PolymarketMarket } from '@/lib/monitor/polymarket';
import { envelopeFromPayload, readCachedPayload, writeCachedPayload } from '@/lib/monitor/cache';
import { incrementMetric } from '@/lib/monitor/metrics';

const RESOURCE = 'events';
const TTL_SECONDS = 10 * 60;
const MARKETS_TTL_SECONDS = 5 * 60;

function normalizeEventRecord(event: GdeltEvent): GdeltEvent {
  return {
    ...event,
    placement: event.placement || {
      mapEligible: true,
      reasonCode: null,
      reasonDetail: 'legacy event',
    },
    evidenceIds: Array.isArray(event.evidenceIds) ? event.evidenceIds : [],
    scenarioIds: Array.isArray(event.scenarioIds) ? event.scenarioIds : [],
  };
}

function normalizeOffMapRecord(item: OffMapEventCandidate): OffMapEventCandidate {
  return {
    ...item,
    reasonDetail: item.reasonDetail || 'hidden from map',
    geoReason: item.geoReason || 'location unavailable',
  };
}

function normalizeGeopoliticalPayload(
  items: GeopoliticalEventsPayload | GdeltEvent[],
): GeopoliticalEventsPayload {
  if (Array.isArray(items)) {
    return {
      events: items.map(normalizeEventRecord),
      evidence: [],
      scenarios: [],
      offMap: [],
    };
  }

  return {
    events: (items.events || []).map(normalizeEventRecord),
    evidence: Array.isArray(items.evidence) ? items.evidence : [],
    scenarios: Array.isArray(items.scenarios) ? items.scenarios : [],
    offMap: Array.isArray(items.offMap) ? items.offMap.map(normalizeOffMapRecord) : [],
  };
}

export async function GET() {
  const cached = await readCachedPayload<GeopoliticalEventsPayload | GdeltEvent[]>(
    RESOURCE,
    TTL_SECONDS,
  );
  if (cached.payload && cached.fresh) {
    await incrementMetric('api_events_cache_hit');
    const normalizedPayload = {
      ...cached.payload,
      items: normalizeGeopoliticalPayload(cached.payload.items),
    };
    const response = envelopeFromPayload(normalizedPayload, cached.ageSeconds, 'HIT');
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=120',
        'X-Cache': 'HIT',
        'X-Event-Model': 'event-evidence-scenario-v1',
      },
    });
  }

  try {
    const marketsCache = await readCachedPayload<PolymarketMarket[]>('markets', MARKETS_TTL_SECONDS);
    const markets = marketsCache.payload?.items || [];
    const result = await fetchClassifiedEvents(markets);
    const stored = await writeCachedPayload(RESOURCE, result.items, result.sourceCoverage, TTL_SECONDS);
    await incrementMetric('api_events_cache_miss');

    const response = envelopeFromPayload(stored, 0, 'MISS');
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=120',
        'X-Cache': 'MISS',
        'X-Event-Count': String(result.items.events.length),
        'X-Event-Model': 'event-evidence-scenario-v1',
      },
    });
  } catch {
    await incrementMetric('api_events_error');

    if (cached.payload) {
      const normalizedPayload = {
        ...cached.payload,
        items: normalizeGeopoliticalPayload(cached.payload.items),
      };
      const response = envelopeFromPayload(normalizedPayload, cached.ageSeconds, 'STALE');
      return NextResponse.json(response, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          'X-Cache': 'STALE',
          'X-Event-Model': 'event-evidence-scenario-v1',
        },
      });
    }

    return NextResponse.json(
      {
        items: {
          events: [],
          evidence: [],
          scenarios: [],
          offMap: [],
        },
        meta: {
          generatedAt: new Date().toISOString(),
          freshnessSeconds: 0,
          cacheState: 'BYPASS',
          pipelineVersion: 'monitor-v1',
          sourceCoverage: [],
        },
      },
      {
        status: 503,
        headers: { 'Retry-After': '60' },
      },
    );
  }
}
