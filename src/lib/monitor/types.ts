import type { GdeltEvent } from './events';
import type { PolymarketMarket } from './polymarket';
import type { UsgsEarthquake } from './usgs';
import type { ThemeKey } from './themes';

export type LayerKey =
  | 'events'
  | 'markets'
  | 'disasters'
  | 'notams'
  | 'shipping'
  | 'elections'
  | 'watch_zones'
  | 'prices';

// Backward-compatible alias while migrating the monitor surface.
export type SignalKey = LayerKey;

export type EventConfidenceGate = 'strict' | 'balanced' | 'all';

export type WatchZoneGeometry =
  | {
    type: 'circle';
    center: [number, number]; // [lng, lat]
    radiusKm: number;
  }
  | {
    type: 'polygon';
    coordinates: [number, number][];
  };

export interface WatchZone {
  id: string;
  name: string;
  summary: string;
  theme: ThemeKey;
  severity: 'critical' | 'watch' | 'monitor';
  geometry: WatchZoneGeometry;
  scope: string;
  status: string;
  assets: string[];
  updatedAt: string;
  roomIds: string[];
}

export interface SituationRoomConfig {
  id: string;
  name: string;
  summary: string;
  center: [number, number];
  zoom: number;
  activeThemes: ThemeKey[];
  defaultLayers: LayerKey[];
  defaultSignalTypes?: SignalKey[]; // legacy
  defaultWatchZoneIds: string[];
  priorityRegions: string[];
  contextModules: string[];
  highlightedAssets: string[];
  panelModule: string;
}

export interface NotamZone {
  id: string;
  name: string;
  authority: string;
  reason: string;
  effectiveFrom: string;
  effectiveTo: string;
  coordinates: [number, number][];
}

export interface ShippingChokepoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  vesselCount: number;
  tankerCount: number;
  containerCount: number;
  riskLevel: 'high' | 'watch' | 'monitor';
}

export interface ElectionCalendarItem {
  id: string;
  country: string;
  electionType: string;
  date: string;
  lat: number;
  lng: number;
  importance: 'critical' | 'watch' | 'monitor';
  daysUntil?: number;
}

export type MapInteractionMode = 'idle' | 'fanout' | 'selected';

export type FanoutSignalType = 'events' | 'markets';

export interface ActiveFanout {
  clusterId: number | null;
  signalType: FanoutSignalType;
  center: [number, number];
  candidateIds: string[];
  openedAt: string;
  itemCount: number;
  locationLabel: string;
  themeMix: Record<ThemeKey, number>;
  freshestTimestamp: string | null;
}

export type MapSelectionCandidate =
  | {
    type: 'event';
    id: string;
    title: string;
    subtitle: string;
    signalType: 'events';
    originClusterId: number | null;
    data: GdeltEvent;
  }
  | {
    type: 'market';
    id: string;
    title: string;
    subtitle: string;
    signalType: 'markets';
    originClusterId: number | null;
    data: PolymarketMarket;
  }
  | {
    type: 'watch_zone';
    id: string;
    title: string;
    subtitle: string;
    signalType: 'watch_zones';
    originClusterId: null;
    data: WatchZone;
  }
  | {
    type: 'earthquake';
    id: string;
    title: string;
    subtitle: string;
    signalType: 'disasters';
    originClusterId: null;
    data: UsgsEarthquake;
  };

export type MapItem =
  | { type: 'event'; data: GdeltEvent }
  | { type: 'market'; data: PolymarketMarket }
  | { type: 'earthquake'; data: UsgsEarthquake }
  | { type: 'watch_zone'; data: WatchZone }
  | { type: 'fanout'; data: ActiveFanout }
  | { type: 'room'; data: SituationRoomConfig }
  | { type: 'selection'; data: { title: string; candidates: MapSelectionCandidate[] } };
