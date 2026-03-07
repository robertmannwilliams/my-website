import { NextResponse } from 'next/server';
import { getMetricSnapshot } from '@/lib/monitor/metrics';

const DEFAULT_METRICS = [
  'ingest_feed_success',
  'ingest_feed_failure',
  'ingest_headlines_total',
  'events_headlines_received',
  'events_candidates_after_rules',
  'events_clusters',
  'events_final_count',
  'events_dedup_ratio_bp',
  'llm_calls',
  'llm_cluster_classifications',
  'classified_cluster_cache_hit',
  'api_events_cache_hit',
  'api_events_cache_miss',
  'api_events_error',
  'api_markets_cache_hit',
  'api_markets_cache_miss',
  'api_markets_error',
  'api_disasters_cache_hit',
  'api_disasters_cache_miss',
  'api_disasters_error',
  'api_headlines_cache_hit',
  'api_headlines_cache_miss',
  'api_headlines_error',
  'api_prices_cache_hit',
  'api_prices_cache_miss',
  'api_prices_error',
  'markets_raw_count',
  'markets_final_count',
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bucket = searchParams.get('date') || new Date().toISOString().slice(0, 10);

  const metrics = await getMetricSnapshot(DEFAULT_METRICS, bucket);

  return NextResponse.json({
    items: metrics,
    meta: {
      generatedAt: new Date().toISOString(),
      freshnessSeconds: 0,
      cacheState: 'BYPASS',
      pipelineVersion: 'monitor-v1',
      sourceCoverage: [],
    },
  });
}
