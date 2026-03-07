import type { GdeltEvent } from './events';
import type { PolymarketMarket } from './polymarket';
import type { UsgsEarthquake } from './usgs';
import type { ThemeKey } from './themes';

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

export interface SituationRoomConfig {
  id: string;
  name: string;
  summary: string;
  center: [number, number];
  zoom: number;
  activeThemes: ThemeKey[];
  activeLayers: ('notams' | 'shipping' | 'elections')[];
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

export type MapItem =
  | { type: 'event'; data: GdeltEvent }
  | { type: 'market'; data: PolymarketMarket }
  | { type: 'earthquake'; data: UsgsEarthquake }
  | { type: 'situation'; data: OngoingSituation }
  | { type: 'room'; data: SituationRoomConfig };
