import type { GdeltEvent } from './events';
import type { PolymarketMarket } from './polymarket';
import type { UsgsEarthquake } from './usgs';
import type { ThemeKey } from './themes';

export type SignalKey =
  | 'events'
  | 'markets'
  | 'disasters'
  | 'infrastructure_overlays'
  | 'watch_zones';

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
  defaultSignalTypes: SignalKey[];
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

export type MapSelectionCandidate =
  | { type: 'event'; id: string; title: string; subtitle: string; data: GdeltEvent }
  | { type: 'market'; id: string; title: string; subtitle: string; data: PolymarketMarket }
  | { type: 'watch_zone'; id: string; title: string; subtitle: string; data: WatchZone }
  | { type: 'earthquake'; id: string; title: string; subtitle: string; data: UsgsEarthquake };

export type MapItem =
  | { type: 'event'; data: GdeltEvent }
  | { type: 'market'; data: PolymarketMarket }
  | { type: 'earthquake'; data: UsgsEarthquake }
  | { type: 'watch_zone'; data: WatchZone }
  | { type: 'room'; data: SituationRoomConfig }
  | { type: 'selection'; data: { title: string; candidates: MapSelectionCandidate[] } };
