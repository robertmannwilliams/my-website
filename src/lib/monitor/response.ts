export type CacheState = 'HIT' | 'MISS' | 'STALE' | 'BYPASS';

export interface SourceCoverageEntry {
  source: string;
  tier: 'tier1' | 'regional' | 'specialized';
  weight: number;
  fetched: number;
  accepted: number;
  failed: boolean;
  latencyMs?: number;
}

export interface MonitorResponseMeta {
  generatedAt: string;
  freshnessSeconds: number;
  cacheState: CacheState;
  pipelineVersion: string;
  sourceCoverage?: SourceCoverageEntry[];
}

export interface MonitorResponse<T> {
  items: T;
  meta: MonitorResponseMeta;
}

export function toMonitorResponse<T>(items: T, meta: MonitorResponseMeta): MonitorResponse<T> {
  return { items, meta };
}
