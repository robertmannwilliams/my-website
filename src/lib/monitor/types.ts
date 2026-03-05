import type { GdeltEvent } from './events';
import type { PolymarketMarket } from './polymarket';
import type { UsgsEarthquake } from './usgs';

export interface OngoingSituation {
  id: string;
  title: string;
  summary: string;
  category: string;
  severity: 'critical' | 'watch' | 'monitor';
  locations: { name: string; lat: number; lng: number; role: string }[];
  startDate: string;
  status: string;
  relatedAssets: string[];
  lastUpdated: string;
}

export type MapItem =
  | { type: 'event'; data: GdeltEvent }
  | { type: 'market'; data: PolymarketMarket }
  | { type: 'earthquake'; data: UsgsEarthquake }
  | { type: 'situation'; data: OngoingSituation };
