import type { GdeltEvent } from './gdelt';
import type { PolymarketMarket } from './polymarket';
import type { UsgsEarthquake } from './usgs';

export type MapItem =
  | { type: 'event'; data: GdeltEvent }
  | { type: 'market'; data: PolymarketMarket }
  | { type: 'earthquake'; data: UsgsEarthquake };
