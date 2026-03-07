import { monitorGetNumber, monitorIncrementBy } from './cache';

const ONE_DAY = 24 * 60 * 60;

function dateKeyUTC(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function metricKey(metric: string, bucket: string): string {
  return `metrics:${bucket}:${metric}`;
}

export async function incrementMetric(metric: string, amount: number = 1, bucket: string = dateKeyUTC()): Promise<number> {
  return monitorIncrementBy(metricKey(metric, bucket), amount, ONE_DAY * 8);
}

export async function getMetric(metric: string, bucket: string = dateKeyUTC()): Promise<number> {
  return monitorGetNumber(metricKey(metric, bucket));
}

export async function getMetricSnapshot(metrics: string[], bucket: string = dateKeyUTC()): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const name of metrics) {
    out[name] = await getMetric(name, bucket);
  }
  return out;
}
