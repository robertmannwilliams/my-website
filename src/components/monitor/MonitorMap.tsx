'use client';

import { useEffect, useRef, useState, memo, useMemo, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { GdeltEvent } from '@/lib/monitor/events';
import { isHighSignalMapMarket, type PolymarketMarket } from '@/lib/monitor/polymarket';
import type { UsgsEarthquake } from '@/lib/monitor/usgs';
import type {
  ActiveFanout,
  ElectionCalendarItem,
  EventConfidenceGate,
  FanoutSignalType,
  MapSelectionCandidate,
  NotamZone,
  ShippingChokepoint,
  SignalKey,
  SituationRoomConfig,
  WatchZone,
} from '@/lib/monitor/types';
import {
  type ThemeKey,
  getActiveEventCategories,
  getActiveMarketCategories,
} from '@/lib/monitor/themes';

interface MonitorMapProps {
  onEventClick?: (event: GdeltEvent) => void;
  onMarketClick?: (market: PolymarketMarket) => void;
  onEarthquakeClick?: (eq: UsgsEarthquake) => void;
  onWatchZoneClick?: (watchZone: WatchZone) => void;
  onSelectionCandidates?: (title: string, candidates: MapSelectionCandidate[]) => void;
  onFanoutChange?: (fanout: ActiveFanout | null) => void;
  onMapClick?: () => void;
  forceClearFanoutKey?: number;
  focusEventRequest?: { lat: number; lng: number; seq: number } | null;
  selectedEventCoords?: { lat: number; lng: number } | null;
  relatedMarkets?: PolymarketMarket[];
  visibleThemes: Record<ThemeKey, boolean>;
  visibleSignals: Record<SignalKey, boolean>;
  visibleWatchZones: Record<string, boolean>;
  eventConfidenceGate: EventConfidenceGate;
  temporaryPlottedEventIds: string[];
  activeRoom: SituationRoomConfig | null;
  events: GdeltEvent[];
  markets: PolymarketMarket[];
  earthquakes: UsgsEarthquake[];
  notamZones: NotamZone[];
  shippingChokepoints: ShippingChokepoint[];
  elections: ElectionCalendarItem[];
  watchZones: WatchZone[];
}

const MAX_EVENTS_ON_MAP = 140;
const MARKET_CLUSTER_MAX_ZOOM = 10;
const EVENT_CLUSTER_MAX_ZOOM = 9;
const MARKET_CLUSTER_LEAF_LIMIT = 40;
const EVENT_CLUSTER_LEAF_LIMIT = 36;
const MARKET_SPIDERFY_LIMIT = 24;
const EVENT_SPIDERFY_LIMIT = 28;
const MARKET_SPIDERFY_MIN_ZOOM = 4.8;
const EVENT_SPIDERFY_MIN_ZOOM = 4.4;
const MARKET_SPIDERFY_BASE_RADIUS_PX = 36;
const MARKET_SPIDERFY_RING_STEP_PX = 14;
const MARKET_SPIDERFY_RING_CAPACITY = 12;
const EVENT_SPIDERFY_BASE_RADIUS_PX = 34;
const EVENT_SPIDERFY_RING_STEP_PX = 13;
const EVENT_SPIDERFY_RING_CAPACITY = 12;
const FANOUT_ANIMATION_DURATION_MS = 250;
const FANOUT_STAGGER_MS = 34;

type MarketSelectionCandidate = Extract<MapSelectionCandidate, { type: 'market' }>;
type EventSelectionCandidate = Extract<MapSelectionCandidate, { type: 'event' }>;

interface FanoutInternalState {
  center: [number, number];
  clusterId: number | null;
  signalType: FanoutSignalType;
  candidates: Array<MarketSelectionCandidate | EventSelectionCandidate>;
}

interface ClusterChoiceOption {
  signalType: FanoutSignalType;
  clusterId: number;
  center: [number, number];
  count: number;
}

interface ClusterChoiceState {
  x: number;
  y: number;
  options: ClusterChoiceOption[];
}

interface SpiderfyNode {
  candidate: MarketSelectionCandidate | EventSelectionCandidate;
  target: [number, number];
}

interface SpiderfyRenderData {
  markers: GeoJSON.FeatureCollection;
  legs: GeoJSON.FeatureCollection;
  anchor: GeoJSON.FeatureCollection;
}

function inferRegion(lat: number, lng: number): string {
  if (lat > 25 && lat < 50 && lng > -10 && lng < 45) return 'europe';
  if (lat > 10 && lat < 45 && lng > 25 && lng < 75) return 'middle_east';
  if (lat > -35 && lat < 38 && lng > -20 && lng < 55) return 'africa';
  if (lat > 5 && lat < 55 && lng > 60 && lng < 150) return 'asia';
  if (lat > -50 && lat < 15 && lng > -85 && lng < -30) return 'south_america';
  if (lat > 15 && lat < 75 && lng > -170 && lng < -50) return 'north_america';
  if (lat > -50 && lat < 0 && lng > 100 && lng < 180) return 'oceania';
  return 'global';
}

function eventSignalScore(event: GdeltEvent): number {
  const severityScore = event.severity === 'critical' ? 12 : event.severity === 'watch' ? 7 : 3;
  const sourceScore = Math.min(6, event.sourceCount * 1.15);
  const confidenceScore = event.classificationConfidence * 5;
  const ageHours = Math.max(0, (Date.now() - new Date(event.lastSeenAt || event.timestamp).getTime()) / 3_600_000);
  const recencyScore = Math.max(0, 4 - ageHours / 6);
  return severityScore + sourceScore + confidenceScore + recencyScore;
}

function isWeakMonitorEvent(event: GdeltEvent, minConfidence: number): boolean {
  if (event.severity !== 'monitor') return false;
  if (event.sourceCount >= 2) return false;
  return event.classificationConfidence < minConfidence;
}

function emptyCollection(): GeoJSON.FeatureCollection {
  return { type: 'FeatureCollection', features: [] };
}

function destinationPoint(
  latDeg: number,
  lngDeg: number,
  bearingDeg: number,
  angularDistDeg: number,
): [number, number] {
  const lat1 = latDeg * (Math.PI / 180);
  const lng1 = lngDeg * (Math.PI / 180);
  const brng = bearingDeg * (Math.PI / 180);
  const d = angularDistDeg * (Math.PI / 180);

  const sinD = Math.sin(d);
  const cosD = Math.cos(d);
  const sinLat1 = Math.sin(lat1);
  const cosLat1 = Math.cos(lat1);

  const lat2 = Math.asin(sinLat1 * cosD + cosLat1 * sinD * Math.cos(brng));
  const lng2 = lng1 + Math.atan2(Math.sin(brng) * sinD * cosLat1, cosD - sinLat1 * Math.sin(lat2));

  return [((lng2 * (180 / Math.PI) + 540) % 360) - 180, lat2 * (180 / Math.PI)];
}

function pxOffsetToPoint(
  centerLng: number,
  centerLat: number,
  zoom: number,
  radiusPx: number,
  angleDeg: number,
): [number, number] {
  const metersPerPixel = (156543.03392 * Math.cos((centerLat * Math.PI) / 180)) / (2 ** zoom);
  const radiusKm = Math.max(8, Math.min(240, (radiusPx * metersPerPixel) / 1000));
  const angularDistDeg = (radiusKm / 6371) * (180 / Math.PI);
  return destinationPoint(centerLat, centerLng, angleDeg, angularDistDeg);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function easeOutCubic(t: number): number {
  const x = clamp(t, 0, 1);
  return 1 - (1 - x) ** 3;
}

function buildSpiderfyNodes(
  signalType: FanoutSignalType,
  center: [number, number],
  candidates: Array<MarketSelectionCandidate | EventSelectionCandidate>,
  zoom: number,
): SpiderfyNode[] {
  const [centerLng, centerLat] = center;
  const baseRadiusPx = signalType === 'markets' ? MARKET_SPIDERFY_BASE_RADIUS_PX : EVENT_SPIDERFY_BASE_RADIUS_PX;
  const ringStepPx = signalType === 'markets' ? MARKET_SPIDERFY_RING_STEP_PX : EVENT_SPIDERFY_RING_STEP_PX;
  const ringCapacity = signalType === 'markets' ? MARKET_SPIDERFY_RING_CAPACITY : EVENT_SPIDERFY_RING_CAPACITY;
  const compactnessFactor = candidates.length <= 6 ? 0.88 : candidates.length <= 12 ? 0.93 : 1;
  const out: SpiderfyNode[] = [];

  for (let i = 0; i < candidates.length; i++) {
    const ring = Math.floor(i / ringCapacity);
    const indexInRing = i % ringCapacity;
    const ringStart = ring * ringCapacity;
    const ringCount = Math.min(ringCapacity, candidates.length - ringStart);
    const baseAngleDeg = -90 + (360 * indexInRing) / Math.max(1, ringCount);
    const angleDeg = baseAngleDeg + ring * 11 + (i % 2 === 0 ? 4 : -4);
    const radiusPx = (baseRadiusPx + ring * ringStepPx) * compactnessFactor;
    const target = pxOffsetToPoint(centerLng, centerLat, zoom, radiusPx, angleDeg);
    out.push({ candidate: candidates[i], target });
  }

  return out;
}

function buildSpiderfyRenderData(
  signalType: FanoutSignalType,
  center: [number, number],
  nodes: SpiderfyNode[],
  elapsedMs: number,
): SpiderfyRenderData {
  const [centerLng, centerLat] = center;
  const markers: GeoJSON.Feature[] = [];
  const legs: GeoJSON.Feature[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const startMs = i * FANOUT_STAGGER_MS;
    const progress = easeOutCubic(clamp((elapsedMs - startMs) / FANOUT_ANIMATION_DURATION_MS, 0, 1));
    const markerAlpha = clamp(progress * 1.2, 0, 1);
    const lineAlpha = clamp((progress - 0.12) * 1.25, 0, 0.75);
    const lng = centerLng + (node.target[0] - centerLng) * progress;
    const lat = centerLat + (node.target[1] - centerLat) * progress;
    const candidate = node.candidate;

    markers.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: {
        id: candidate.id,
        title: candidate.title,
        signalType,
        category: candidate.type === 'event' ? candidate.data.category : candidate.data.category,
        severity: candidate.type === 'event' ? candidate.data.severity : 'watch',
        probability: candidate.type === 'market' ? Math.round(candidate.data.probability * 100) : null,
        volume: candidate.type === 'market' ? candidate.data.volume : null,
        signalScore: candidate.type === 'event' ? candidate.data.signalScore : candidate.data.signalScore,
        alpha: markerAlpha,
      },
    });

    legs.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [centerLng, centerLat],
          [lng, lat],
        ],
      },
      properties: {
        id: `${candidate.id}-leg`,
        signalType,
        alpha: lineAlpha,
      },
    });
  }

  const anchorProgress = clamp(elapsedMs / (FANOUT_ANIMATION_DURATION_MS * 0.6), 0, 1);
  const anchor: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [centerLng, centerLat] },
        properties: {
          signalType,
          alpha: anchorProgress,
        },
      },
    ],
  };

  return {
    markers: { type: 'FeatureCollection', features: markers },
    legs: { type: 'FeatureCollection', features: legs },
    anchor,
  };
}

function circleToPolygon(centerLng: number, centerLat: number, radiusKm: number, steps: number = 48): [number, number][] {
  const angularDistDeg = (radiusKm / 6371) * (180 / Math.PI);
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const bearing = (360 * i) / steps;
    coords.push(destinationPoint(centerLat, centerLng, bearing, angularDistDeg));
  }
  return coords;
}

function isDimmed(region: string, activeRoom: SituationRoomConfig | null): boolean {
  if (!activeRoom || !activeRoom.priorityRegions || activeRoom.priorityRegions.length === 0) return false;
  return !activeRoom.priorityRegions.includes(region);
}

function eventsToGeoJSON(events: GdeltEvent[], activeRoom: SituationRoomConfig | null): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: events.map((event) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [event.lng, event.lat] },
      properties: {
        id: event.id,
        canonicalId: event.canonicalId,
        title: event.title,
        category: event.category,
        severity: event.severity,
        timestamp: event.timestamp,
        summary: event.summary,
        sources: JSON.stringify(event.sources),
        sourceCount: event.sourceCount,
        firstSeenAt: event.firstSeenAt,
        lastSeenAt: event.lastSeenAt,
        classificationConfidence: event.classificationConfidence,
        classificationMethod: event.classificationMethod,
        fingerprint: event.fingerprint,
        tone: event.tone,
        region: event.region,
        signalScore: event.signalScore,
        topicTags: JSON.stringify(event.topicTags || []),
        mapPriority: event.mapPriority,
        geoValidity: event.geoValidity,
        geoReason: event.geoReason,
        severityRank: event.severity === 'critical' ? 3 : event.severity === 'watch' ? 2 : 1,
        dimmed: isDimmed(event.region, activeRoom),
      },
    })),
  };
}

function marketsToGeoJSON(markets: PolymarketMarket[], activeRoom: SituationRoomConfig | null): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: markets.map((market) => {
      const region = inferRegion(market.lat, market.lng);
      return {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [market.lng, market.lat] },
        properties: {
          id: market.id,
          title: market.title,
          category: market.category,
          categoryNormalized: market.categoryNormalized,
          probability: market.probability,
          volume: market.volume,
          volumeRaw: market.volumeRaw,
          url: market.url,
          lastUpdated: market.lastUpdated,
          outcomes: JSON.stringify(market.outcomes),
          outcomePrices: JSON.stringify(market.outcomePrices),
          liquidity: market.liquidity,
          endDate: market.endDate,
          geoConfidence: market.geoConfidence,
          geoMethod: market.geoMethod,
          isMapPlottable: market.isMapPlottable,
          signalScore: market.signalScore,
          topicTags: JSON.stringify(market.topicTags || []),
          mapPriority: market.mapPriority,
          geoValidity: market.geoValidity,
          geoReason: market.geoReason,
          region,
          dimmed: isDimmed(region, activeRoom),
        },
      };
    }),
  };
}

function earthquakesToGeoJSON(quakes: UsgsEarthquake[], activeRoom: SituationRoomConfig | null): GeoJSON.FeatureCollection {
  const twoHoursAgo = Date.now() - 2 * 60 * 60_000;
  return {
    type: 'FeatureCollection',
    features: quakes.map((quake) => {
      const region = inferRegion(quake.lat, quake.lng);
      return {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [quake.lng, quake.lat] },
        properties: {
          id: quake.id,
          title: quake.title,
          magnitude: quake.magnitude,
          magType: quake.magType,
          depth: quake.depth,
          place: quake.place,
          timestamp: quake.timestamp,
          tsunami: quake.tsunami,
          felt: quake.felt,
          significance: quake.significance,
          alert: quake.alert,
          url: quake.url,
          region,
          dimmed: isDimmed(region, activeRoom),
          isRecent: new Date(quake.timestamp).getTime() > twoHoursAgo,
        },
      };
    }),
  };
}

function watchZonesToGeoJSON(zones: WatchZone[], activeRoom: SituationRoomConfig | null): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: zones.map((zone) => {
      if (zone.geometry.type === 'circle') {
        const [centerLng, centerLat] = zone.geometry.center;
        const coords = circleToPolygon(centerLng, centerLat, zone.geometry.radiusKm);
        const region = inferRegion(centerLat, centerLng);
        return {
          type: 'Feature' as const,
          geometry: { type: 'Polygon' as const, coordinates: [coords] },
          properties: {
            id: zone.id,
            name: zone.name,
            summary: zone.summary,
            theme: zone.theme,
            severity: zone.severity,
            status: zone.status,
            scope: zone.scope,
            assets: JSON.stringify(zone.assets),
            updatedAt: zone.updatedAt,
            roomIds: JSON.stringify(zone.roomIds || []),
            centerLng,
            centerLat,
            region,
            dimmed: isDimmed(region, activeRoom),
          },
        };
      }

      const first = zone.geometry.coordinates[0] || [0, 0];
      const region = inferRegion(first[1], first[0]);
      return {
        type: 'Feature' as const,
        geometry: { type: 'Polygon' as const, coordinates: [zone.geometry.coordinates] },
        properties: {
          id: zone.id,
          name: zone.name,
          summary: zone.summary,
          theme: zone.theme,
          severity: zone.severity,
          status: zone.status,
          scope: zone.scope,
          assets: JSON.stringify(zone.assets),
          updatedAt: zone.updatedAt,
          roomIds: JSON.stringify(zone.roomIds || []),
          centerLng: first[0],
          centerLat: first[1],
          region,
          dimmed: isDimmed(region, activeRoom),
        },
      };
    }),
  };
}

function notamsToGeoJSON(zones: NotamZone[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: zones.map((zone) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Polygon' as const,
        coordinates: [zone.coordinates],
      },
      properties: {
        id: zone.id,
        name: zone.name,
        authority: zone.authority,
        reason: zone.reason,
        effectiveFrom: zone.effectiveFrom,
        effectiveTo: zone.effectiveTo,
      },
    })),
  };
}

function shippingToGeoJSON(points: ShippingChokepoint[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: points.map((point) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [point.lng, point.lat] },
      properties: {
        id: point.id,
        name: point.name,
        vesselCount: point.vesselCount,
        tankerCount: point.tankerCount,
        containerCount: point.containerCount,
        riskLevel: point.riskLevel,
      },
    })),
  };
}

function electionsToGeoJSON(items: ElectionCalendarItem[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: items.map((item) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [item.lng, item.lat] },
      properties: {
        id: item.id,
        country: item.country,
        electionType: item.electionType,
        date: item.date,
        importance: item.importance,
        daysUntil: item.daysUntil ?? null,
      },
    })),
  };
}

function computeSubsolarPoint(date: Date): { lat: number; lng: number } {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getUTCFullYear(), 0, 0).getTime()) / 86400000);
  const declination = -23.4393 * Math.cos((2 * Math.PI * (dayOfYear + 10)) / 365.25);
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const lng = 180 - utcHours * 15;
  return { lat: declination, lng: lng > 180 ? lng - 360 : lng };
}

function generateNightPolygon(sunLatDeg: number, sunLngDeg: number, angularDistDeg: number): GeoJSON.Feature {
  const nightLat = -sunLatDeg;
  const nightLng = sunLngDeg > 0 ? sunLngDeg - 180 : sunLngDeg + 180;
  const coords: [number, number][] = [];
  for (let bearing = 0; bearing <= 360; bearing += 5) {
    coords.push(destinationPoint(nightLat, nightLng, bearing, angularDistDeg));
  }
  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [coords] },
    properties: {},
  };
}

function generateTerminatorGeoJSON(): {
  twilight: GeoJSON.FeatureCollection;
  core: GeoJSON.FeatureCollection;
  night: GeoJSON.FeatureCollection;
} {
  const sun = computeSubsolarPoint(new Date());
  return {
    twilight: { type: 'FeatureCollection', features: [generateNightPolygon(sun.lat, sun.lng, 96)] },
    core: { type: 'FeatureCollection', features: [generateNightPolygon(sun.lat, sun.lng, 90)] },
    night: { type: 'FeatureCollection', features: [generateNightPolygon(sun.lat, sun.lng, 84)] },
  };
}

function addTerminatorLayers(m: mapboxgl.Map) {
  const data = generateTerminatorGeoJSON();
  m.addSource('terminator-twilight', { type: 'geojson', data: data.twilight });
  m.addSource('terminator-core', { type: 'geojson', data: data.core });
  m.addSource('terminator-night', { type: 'geojson', data: data.night });

  m.addLayer({ id: 'terminator-twilight', type: 'fill', source: 'terminator-twilight', paint: { 'fill-color': '#000000', 'fill-opacity': 0.05 } }, 'event-clusters');
  m.addLayer({ id: 'terminator-core', type: 'fill', source: 'terminator-core', paint: { 'fill-color': '#000000', 'fill-opacity': 0.08 } }, 'event-clusters');
  m.addLayer({ id: 'terminator-night', type: 'fill', source: 'terminator-night', paint: { 'fill-color': '#000000', 'fill-opacity': 0.10 } }, 'event-clusters');
}

function updateTerminator(m: mapboxgl.Map) {
  const data = generateTerminatorGeoJSON();
  const tw = m.getSource('terminator-twilight') as mapboxgl.GeoJSONSource | undefined;
  const co = m.getSource('terminator-core') as mapboxgl.GeoJSONSource | undefined;
  const ni = m.getSource('terminator-night') as mapboxgl.GeoJSONSource | undefined;
  if (tw) tw.setData(data.twilight);
  if (co) co.setData(data.core);
  if (ni) ni.setData(data.night);
}

function createDiamondImage(size: number = 32): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size / 2;
  ctx.beginPath();
  ctx.moveTo(half, 1);
  ctx.lineTo(size - 1, half);
  ctx.lineTo(half, size - 1);
  ctx.lineTo(1, half);
  ctx.closePath();
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  return ctx.getImageData(0, 0, size, size);
}

const EVENT_CATEGORY_COLOR: mapboxgl.Expression = [
  'match', ['get', 'category'],
  'conflicts', '#FF4444',
  'elections', '#4A9EFF',
  'economy', '#22C55E',
  'disasters', '#FF8C22',
  'infrastructure', '#06B6D4',
  '#666680',
];

const WATCH_ZONE_THEME_COLOR: mapboxgl.Expression = [
  'match', ['get', 'theme'],
  'conflicts', '#FF4444',
  'elections', '#4A9EFF',
  'economy', '#22C55E',
  'disasters', '#FF8C22',
  'infrastructure', '#06B6D4',
  '#8892A0',
];

const MARKET_CATEGORY_COLOR: mapboxgl.Expression = [
  'match', ['get', 'category'],
  'conflict', '#FF4444',
  'politics', '#4A9EFF',
  'economy', '#22C55E',
  'diplomacy', '#22C55E',
  'climate', '#FF8C22',
  '#AA66FF',
];

function addWatchZoneLayers(m: mapboxgl.Map) {
  m.addSource('watch-zones', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  });

  m.addLayer({
    id: 'watch-zone-fill',
    type: 'fill',
    source: 'watch-zones',
    paint: {
      'fill-color': WATCH_ZONE_THEME_COLOR,
      'fill-opacity': ['case', ['==', ['get', 'dimmed'], true], 0.04, 0.08],
    },
  });

  m.addLayer({
    id: 'watch-zone-outline',
    type: 'line',
    source: 'watch-zones',
    paint: {
      'line-color': WATCH_ZONE_THEME_COLOR,
      'line-width': ['case', ['==', ['get', 'severity'], 'critical'], 1.4, 1.0],
      'line-opacity': ['case', ['==', ['get', 'dimmed'], true], 0.32, 0.55],
    },
  });

  m.addLayer({
    id: 'watch-zone-labels',
    type: 'symbol',
    source: 'watch-zones',
    layout: {
      'text-field': ['get', 'name'],
      'text-size': 10,
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
      'text-allow-overlap': false,
    },
    paint: {
      'text-color': '#9DB2CC',
      'text-halo-color': '#0B1120',
      'text-halo-width': 1,
      'text-opacity': ['case', ['==', ['get', 'dimmed'], true], 0.5, 0.85],
    },
  });
}

function addEventLayers(m: mapboxgl.Map) {
  m.addSource('events', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
    cluster: true,
    clusterMaxZoom: EVENT_CLUSTER_MAX_ZOOM,
    clusterRadius: 50,
    clusterProperties: {
      maxSeverity: ['max', ['get', 'severityRank']],
    },
  });

  m.addSource('event-spider-points', {
    type: 'geojson',
    data: emptyCollection(),
  });

  m.addSource('event-spider-legs', {
    type: 'geojson',
    data: emptyCollection(),
  });

  m.addLayer({
    id: 'event-clusters',
    type: 'circle',
    source: 'events',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': [
        'case',
        ['>=', ['get', 'maxSeverity'], 3], '#FF4444',
        ['>=', ['get', 'maxSeverity'], 2], '#FFAA22',
        '#666680',
      ],
      'circle-radius': ['step', ['get', 'point_count'], 16, 5, 20, 20, 26],
      'circle-opacity': 0.85,
      'circle-stroke-width': 1,
      'circle-stroke-color': 'rgba(255,255,255,0.15)',
    },
  });

  m.addLayer({
    id: 'event-cluster-count',
    type: 'symbol',
    source: 'events',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-size': 11,
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
    },
    paint: { 'text-color': '#FFFFFF' },
  });

  m.addLayer({
    id: 'event-points',
    type: 'circle',
    source: 'events',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': EVENT_CATEGORY_COLOR,
      'circle-radius': ['match', ['get', 'severity'], 'critical', 7, 'watch', 5, 4],
      'circle-opacity': ['case', ['==', ['get', 'dimmed'], true], 0.45, 0.9],
      'circle-stroke-width': ['match', ['get', 'severity'], 'critical', 2, 'watch', 1, 0.5],
      'circle-stroke-color': 'rgba(255,255,255,0.2)',
    },
  });

  m.addLayer({
    id: 'event-spider-legs',
    type: 'line',
    source: 'event-spider-legs',
    paint: {
      'line-color': 'rgba(140,170,214,0.58)',
      'line-width': 1.15,
      'line-opacity': ['coalesce', ['get', 'alpha'], 0.65],
    },
  });

  m.addLayer({
    id: 'event-spider-points',
    type: 'circle',
    source: 'event-spider-points',
    paint: {
      'circle-color': EVENT_CATEGORY_COLOR,
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 8, 6, 9, 10, 11],
      'circle-opacity': ['*', 0.96, ['coalesce', ['get', 'alpha'], 1]],
      'circle-stroke-width': 1.4,
      'circle-stroke-color': 'rgba(255,255,255,0.55)',
    },
  });
}

function addMarketLayers(m: mapboxgl.Map) {
  m.addSource('markets', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
    cluster: true,
    clusterMaxZoom: MARKET_CLUSTER_MAX_ZOOM,
    clusterRadius: 44,
  });

  m.addSource('related-lines', {
    type: 'geojson',
    data: emptyCollection(),
  });

  m.addSource('market-spider-legs', {
    type: 'geojson',
    data: emptyCollection(),
  });

  m.addSource('market-spider-markers', {
    type: 'geojson',
    data: emptyCollection(),
  });

  m.addLayer({
    id: 'related-lines',
    type: 'line',
    source: 'related-lines',
    paint: {
      'line-color': 'rgba(170,102,255,0.25)',
      'line-width': 1,
      'line-dasharray': [4, 4],
    },
  });

  m.addLayer({
    id: 'market-clusters',
    type: 'circle',
    source: 'markets',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': '#5564D8',
      'circle-radius': ['step', ['get', 'point_count'], 14, 8, 18, 20, 22],
      'circle-opacity': 0.82,
      'circle-stroke-width': 1,
      'circle-stroke-color': 'rgba(255,255,255,0.15)',
    },
  });

  m.addLayer({
    id: 'market-cluster-count',
    type: 'symbol',
    source: 'markets',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-size': 11,
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
    },
    paint: {
      'text-color': '#FFFFFF',
    },
  });

  m.addLayer({
    id: 'market-markers',
    type: 'symbol',
    source: 'markets',
    filter: ['!', ['has', 'point_count']],
    layout: {
      'icon-image': 'market-diamond',
      'icon-size': ['interpolate', ['linear'], ['zoom'], 0, 0.56, 5, 0.76, 10, 1.0],
      'icon-allow-overlap': false,
      'icon-ignore-placement': false,
    },
    paint: {
      'icon-color': MARKET_CATEGORY_COLOR,
      'icon-opacity': ['case', ['==', ['get', 'dimmed'], true], 0.45, 0.9],
    },
  });

  m.addLayer({
    id: 'market-spider-legs',
    type: 'line',
    source: 'market-spider-legs',
    paint: {
      'line-color': 'rgba(139,161,208,0.45)',
      'line-width': 1.2,
      'line-opacity': ['coalesce', ['get', 'alpha'], 0.8],
    },
  });

  m.addLayer({
    id: 'market-spider-markers',
    type: 'symbol',
    source: 'market-spider-markers',
    layout: {
      'icon-image': 'market-diamond',
      'icon-size': ['interpolate', ['linear'], ['zoom'], 3, 0.8, 6, 0.95, 10, 1.1],
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
    },
    paint: {
      'icon-color': MARKET_CATEGORY_COLOR,
      'icon-opacity': ['*', 0.96, ['coalesce', ['get', 'alpha'], 1]],
    },
  });
}

function addFanoutAnchorLayers(m: mapboxgl.Map) {
  m.addSource('fanout-anchor', {
    type: 'geojson',
    data: emptyCollection(),
  });

  m.addLayer({
    id: 'fanout-anchor-halo',
    type: 'circle',
    source: 'fanout-anchor',
    paint: {
      'circle-color': [
        'match',
        ['get', 'signalType'],
        'markets',
        '#8D7BFF',
        '#5DA2FF',
      ],
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 9, 5, 12, 9, 15],
      'circle-opacity': ['*', 0.16, ['coalesce', ['get', 'alpha'], 1]],
      'circle-blur': 0.45,
    },
  });

  m.addLayer({
    id: 'fanout-anchor-core',
    type: 'circle',
    source: 'fanout-anchor',
    paint: {
      'circle-color': [
        'match',
        ['get', 'signalType'],
        'markets',
        '#8D7BFF',
        '#5DA2FF',
      ],
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 2.4, 5, 3.2, 9, 4.2],
      'circle-opacity': ['*', 0.88, ['coalesce', ['get', 'alpha'], 1]],
      'circle-stroke-color': 'rgba(255,255,255,0.38)',
      'circle-stroke-width': 1,
    },
  });
}

function addNotamLayers(m: mapboxgl.Map) {
  m.addSource('notams', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  });

  m.addLayer({
    id: 'notam-fill',
    type: 'fill',
    source: 'notams',
    paint: {
      'fill-color': 'rgba(255,102,61,0.18)',
      'fill-outline-color': 'rgba(255,102,61,0.5)',
    },
  });

  m.addLayer({
    id: 'notam-labels',
    type: 'symbol',
    source: 'notams',
    layout: {
      'text-field': ['get', 'name'],
      'text-size': 10,
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
    },
    paint: {
      'text-color': '#FF8A66',
      'text-halo-color': '#0B1120',
      'text-halo-width': 1,
    },
  });
}

function addShippingLayers(m: mapboxgl.Map) {
  m.addSource('shipping', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  });

  m.addLayer({
    id: 'shipping-points',
    type: 'circle',
    source: 'shipping',
    paint: {
      'circle-color': ['match', ['get', 'riskLevel'], 'high', '#FF6B3D', 'watch', '#FFAA22', '#00DDCC'],
      'circle-radius': ['interpolate', ['linear'], ['get', 'vesselCount'], 80, 6, 180, 10, 300, 14],
      'circle-opacity': 0.85,
      'circle-stroke-width': 1,
      'circle-stroke-color': 'rgba(255,255,255,0.2)',
    },
  });

  m.addLayer({
    id: 'shipping-labels',
    type: 'symbol',
    source: 'shipping',
    layout: {
      'text-field': ['concat', ['get', 'name'], ' - ', ['to-string', ['get', 'vesselCount']]],
      'text-size': 10,
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
      'text-offset': [0, 1.2],
    },
    paint: {
      'text-color': '#7EEDE1',
      'text-halo-color': '#0B1120',
      'text-halo-width': 1,
    },
  });
}

function addElectionLayers(m: mapboxgl.Map) {
  m.addSource('elections', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  });

  m.addLayer({
    id: 'election-points',
    type: 'circle',
    source: 'elections',
    paint: {
      'circle-color': ['match', ['get', 'importance'], 'critical', '#FF4444', 'watch', '#66AAFF', '#89B8E6'],
      'circle-radius': 5,
      'circle-opacity': 0.9,
      'circle-stroke-width': 1,
      'circle-stroke-color': 'rgba(255,255,255,0.2)',
    },
  });

  m.addLayer({
    id: 'election-labels',
    type: 'symbol',
    source: 'elections',
    layout: {
      'text-field': ['concat', ['get', 'country'], ' ', ['coalesce', ['to-string', ['get', 'daysUntil']], '?'], 'd'],
      'text-size': 10,
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
      'text-offset': [0, 1.2],
    },
    paint: {
      'text-color': '#9EC8FF',
      'text-halo-color': '#0B1120',
      'text-halo-width': 1,
    },
  });
}

function addEarthquakeLayers(m: mapboxgl.Map) {
  m.addSource('earthquakes', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  });

  m.addLayer({
    id: 'earthquake-circles',
    type: 'circle',
    source: 'earthquakes',
    paint: {
      'circle-color': ['interpolate', ['linear'], ['get', 'magnitude'], 4.5, '#FFAA22', 5.5, '#FF6622', 7.0, '#FF2222'],
      'circle-radius': ['interpolate', ['linear'], ['get', 'magnitude'], 4.5, 6, 5.5, 10, 7.0, 18, 8.0, 26],
      'circle-opacity': ['case', ['==', ['get', 'dimmed'], true], 0.45, 0.85],
      'circle-stroke-width': 1.5,
      'circle-stroke-color': ['interpolate', ['linear'], ['get', 'magnitude'], 4.5, 'rgba(255,170,34,0.4)', 5.5, 'rgba(255,102,34,0.4)', 7.0, 'rgba(255,34,34,0.4)'],
    },
  });

  m.addLayer({
    id: 'earthquake-labels',
    type: 'symbol',
    source: 'earthquakes',
    filter: ['>=', ['get', 'magnitude'], 5.5],
    layout: {
      'text-field': ['concat', 'M', ['to-string', ['get', 'magnitude']]],
      'text-size': 9,
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
      'text-allow-overlap': true,
      'icon-allow-overlap': true,
    },
    paint: { 'text-color': '#FFFFFF' },
  });
}

const EVENT_LAYERS = ['event-clusters', 'event-cluster-count', 'event-points', 'event-spider-legs', 'event-spider-points'];
const MARKET_LAYERS = [
  'market-clusters',
  'market-cluster-count',
  'market-markers',
  'market-spider-legs',
  'market-spider-markers',
];
const EARTHQUAKE_LAYERS = ['earthquake-circles', 'earthquake-labels'];
const NOTAM_LAYERS = ['notam-fill', 'notam-labels'];
const SHIPPING_LAYERS = ['shipping-points', 'shipping-labels'];
const ELECTION_LAYERS = ['election-points', 'election-labels'];
const WATCH_ZONE_LAYERS = ['watch-zone-fill', 'watch-zone-outline', 'watch-zone-labels'];

function MonitorMap({
  onEventClick,
  onMarketClick,
  onEarthquakeClick,
  onWatchZoneClick,
  onSelectionCandidates,
  onFanoutChange,
  onMapClick,
  forceClearFanoutKey = 0,
  focusEventRequest,
  selectedEventCoords,
  relatedMarkets,
  visibleThemes,
  visibleSignals,
  visibleWatchZones,
  eventConfidenceGate,
  temporaryPlottedEventIds,
  activeRoom,
  events,
  markets,
  earthquakes,
  notamZones,
  shippingChokepoints,
  elections,
  watchZones,
}: MonitorMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const missingToken = !process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const [mapReady, setMapReady] = useState(false);
  const layersReady = useRef(false);

  const onEventClickRef = useRef(onEventClick);
  const onMarketClickRef = useRef(onMarketClick);
  const onEarthquakeClickRef = useRef(onEarthquakeClick);
  const onWatchZoneClickRef = useRef(onWatchZoneClick);
  const onSelectionCandidatesRef = useRef(onSelectionCandidates);
  const onFanoutChangeRef = useRef(onFanoutChange);
  const onMapClickRef = useRef(onMapClick);

  useEffect(() => { onEventClickRef.current = onEventClick; }, [onEventClick]);
  useEffect(() => { onMarketClickRef.current = onMarketClick; }, [onMarketClick]);
  useEffect(() => { onEarthquakeClickRef.current = onEarthquakeClick; }, [onEarthquakeClick]);
  useEffect(() => { onWatchZoneClickRef.current = onWatchZoneClick; }, [onWatchZoneClick]);
  useEffect(() => { onSelectionCandidatesRef.current = onSelectionCandidates; }, [onSelectionCandidates]);
  useEffect(() => { onFanoutChangeRef.current = onFanoutChange; }, [onFanoutChange]);
  useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);

  const eventById = useMemo(() => {
    const out = new Map<string, GdeltEvent>();
    for (const event of events) out.set(event.id, event);
    return out;
  }, [events]);

  const marketById = useMemo(() => {
    const out = new Map<string, PolymarketMarket>();
    for (const market of markets) out.set(market.id, market);
    return out;
  }, [markets]);

  const quakeById = useMemo(() => {
    const out = new Map<string, UsgsEarthquake>();
    for (const quake of earthquakes) out.set(quake.id, quake);
    return out;
  }, [earthquakes]);

  const watchZoneById = useMemo(() => {
    const out = new Map<string, WatchZone>();
    for (const zone of watchZones) out.set(zone.id, zone);
    return out;
  }, [watchZones]);

  const eventByIdRef = useRef(eventById);
  const marketByIdRef = useRef(marketById);
  const quakeByIdRef = useRef(quakeById);
  const watchZoneByIdRef = useRef(watchZoneById);

  useEffect(() => { eventByIdRef.current = eventById; }, [eventById]);
  useEffect(() => { marketByIdRef.current = marketById; }, [marketById]);
  useEffect(() => { quakeByIdRef.current = quakeById; }, [quakeById]);
  useEffect(() => { watchZoneByIdRef.current = watchZoneById; }, [watchZoneById]);

  const filteredEvents = useMemo(() => {
    if (!visibleSignals.events) return [];
    const activeCats = getActiveEventCategories(visibleThemes);
    const forced = new Set(temporaryPlottedEventIds);

    const candidates = events.filter((event) => activeCats.includes(event.category));
    const forcedCandidates = candidates.filter((event) => forced.has(event.id) && Number.isFinite(event.lat) && Number.isFinite(event.lng));

    const gated = candidates.filter((event) => {
      if (forced.has(event.id)) return false;
      if (eventConfidenceGate === 'strict') {
        if (event.status === 'speculative') return false;
        if (event.geoValidity !== 'valid') return false;
        if (isWeakMonitorEvent(event, 0.72)) return false;
        return true;
      }

      if (eventConfidenceGate === 'balanced') {
        if (event.status === 'speculative') return false;
        if (event.geoValidity === 'invalid') return false;
        if (isWeakMonitorEvent(event, 0.58)) return false;
        return true;
      }

      if (event.geoValidity === 'invalid') return false;
      return true;
    });

    const byScore = (a: GdeltEvent, b: GdeltEvent) => {
      const scoreDelta = eventSignalScore(b) - eventSignalScore(a);
      if (scoreDelta !== 0) return scoreDelta;
      return new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime();
    };
    gated.sort(byScore);
    forcedCandidates.sort(byScore);

    if (eventConfidenceGate === 'strict') {
      const critical = gated.filter((event) => event.severity === 'critical');
      const nonCritical = gated.filter((event) => event.severity !== 'critical');
      const nonCriticalBudget = Math.max(0, MAX_EVENTS_ON_MAP - critical.length);
      const merged = [...forcedCandidates, ...critical, ...nonCritical.slice(0, nonCriticalBudget)];
      const unique = new Map<string, GdeltEvent>();
      for (const event of merged) unique.set(event.id, event);
      return [...unique.values()];
    }

    const budget = eventConfidenceGate === 'all' ? MAX_EVENTS_ON_MAP * 2 : MAX_EVENTS_ON_MAP + 30;
    const merged = [...forcedCandidates, ...gated.slice(0, budget)];
    const unique = new Map<string, GdeltEvent>();
    for (const event of merged) unique.set(event.id, event);
    return [...unique.values()];
  }, [events, eventConfidenceGate, temporaryPlottedEventIds, visibleThemes, visibleSignals.events]);

  const filteredMarkets = useMemo(() => {
    if (!visibleSignals.markets) return [];
    const activeCats = getActiveMarketCategories(visibleThemes);
    return markets.filter((market) => activeCats.includes(market.category) && isHighSignalMapMarket(market));
  }, [markets, visibleThemes, visibleSignals.markets]);

  const filteredWatchZones = useMemo(() => {
    if (!visibleSignals.watch_zones) return [];
    return watchZones.filter((zone) => visibleThemes[zone.theme] && visibleWatchZones[zone.id]);
  }, [watchZones, visibleSignals.watch_zones, visibleThemes, visibleWatchZones]);

  const fanoutRef = useRef<FanoutInternalState | null>(null);
  const fanoutRequestRef = useRef(0);
  const fanoutAnimationRef = useRef<number | null>(null);
  const hiddenMarketClusterIdRef = useRef<number | null>(null);
  const hiddenEventClusterIdRef = useRef<number | null>(null);
  const [clusterChoice, setClusterChoice] = useState<ClusterChoiceState | null>(null);

  const cancelFanoutAnimation = useCallback(() => {
    if (fanoutAnimationRef.current != null) {
      cancelAnimationFrame(fanoutAnimationRef.current);
      fanoutAnimationRef.current = null;
    }
  }, []);

  const openCandidate = useCallback((candidate: MapSelectionCandidate) => {
    setClusterChoice(null);
    if (candidate.type === 'event') onEventClickRef.current?.(candidate.data);
    if (candidate.type === 'market') onMarketClickRef.current?.(candidate.data);
    if (candidate.type === 'earthquake') onEarthquakeClickRef.current?.(candidate.data);
    if (candidate.type === 'watch_zone') onWatchZoneClickRef.current?.(candidate.data);
  }, []);

  const candidateFromFeature = useCallback((feature: mapboxgl.MapboxGeoJSONFeature): MapSelectionCandidate | null => {
    const layer = feature.layer?.id;
    if (!layer) return null;
    const props = feature.properties || {};

    if (layer === 'event-points') {
      const id = String(props.id || '');
      const event = eventByIdRef.current.get(id);
      if (!event) return null;
      return {
        type: 'event',
        id,
        title: event.title,
        subtitle: `${event.severity.toUpperCase()} - ${event.sourceCount} sources`,
        signalType: 'events',
        originClusterId: null,
        data: event,
      };
    }

    if (layer === 'market-markers' || layer === 'market-spider-markers') {
      const id = String(props.id || '');
      const market = marketByIdRef.current.get(id);
      if (!market) return null;
      const fromFanout = layer === 'market-spider-markers' ? fanoutRef.current : null;
      return {
        type: 'market',
        id,
        title: market.title,
        subtitle: `${Math.round(market.probability * 100)}% - ${market.volume}`,
        signalType: 'markets',
        originClusterId: fromFanout?.signalType === 'markets' ? fromFanout.clusterId : null,
        data: market,
      };
    }

    if (layer === 'event-spider-points') {
      const id = String(props.id || '');
      const event = eventByIdRef.current.get(id);
      if (!event) return null;
      const fromFanout = fanoutRef.current;
      return {
        type: 'event',
        id,
        title: event.title,
        subtitle: `${event.severity.toUpperCase()} - ${event.sourceCount} sources`,
        signalType: 'events',
        originClusterId: fromFanout?.signalType === 'events' ? fromFanout.clusterId : null,
        data: event,
      };
    }

    if (layer === 'earthquake-circles') {
      const id = String(props.id || '');
      const quake = quakeByIdRef.current.get(id);
      if (!quake) return null;
      return {
        type: 'earthquake',
        id,
        title: quake.place,
        subtitle: `M${quake.magnitude.toFixed(1)} - ${new Date(quake.timestamp).toLocaleDateString('en-US')}`,
        signalType: 'disasters',
        originClusterId: null,
        data: quake,
      };
    }

    if (layer === 'watch-zone-fill' || layer === 'watch-zone-outline') {
      const id = String(props.id || '');
      const zone = watchZoneByIdRef.current.get(id);
      if (!zone) return null;
      return {
        type: 'watch_zone',
        id,
        title: zone.name,
        subtitle: `${zone.severity.toUpperCase()} - ${zone.scope}`,
        signalType: 'watch_zones',
        originClusterId: null,
        data: zone,
      };
    }

    return null;
  }, []);

  const buildCandidates = useCallback((features: mapboxgl.MapboxGeoJSONFeature[]): MapSelectionCandidate[] => {
    const seen = new Set<string>();
    const out: MapSelectionCandidate[] = [];

    for (const feature of features) {
      const candidate = candidateFromFeature(feature);
      if (!candidate) continue;
      const key = `${candidate.type}:${candidate.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(candidate);
    }

    return out;
  }, [candidateFromFeature]);

  const applyMarketClusterFilter = useCallback((hiddenClusterId: number | null) => {
    const m = map.current;
    if (!m) return;

    hiddenMarketClusterIdRef.current = hiddenClusterId;
    const filter: mapboxgl.FilterSpecification =
      hiddenClusterId == null
        ? ['has', 'point_count']
        : ['all', ['has', 'point_count'], ['!=', ['get', 'cluster_id'], hiddenClusterId]];

    try {
      m.setFilter('market-clusters', filter);
      m.setFilter('market-cluster-count', filter);
    } catch {
      // Layers may not exist yet.
    }
  }, []);

  const applyEventClusterFilter = useCallback((hiddenClusterId: number | null) => {
    const m = map.current;
    if (!m) return;

    hiddenEventClusterIdRef.current = hiddenClusterId;
    const filter: mapboxgl.FilterSpecification =
      hiddenClusterId == null
        ? ['has', 'point_count']
        : ['all', ['has', 'point_count'], ['!=', ['get', 'cluster_id'], hiddenClusterId]];

    try {
      m.setFilter('event-clusters', filter);
      m.setFilter('event-cluster-count', filter);
    } catch {
      // Layers may not exist yet.
    }
  }, []);

  const setFanoutData = useCallback((signalType: FanoutSignalType | 'none', data?: SpiderfyRenderData) => {
    const m = map.current;
    if (!m) return;

    const marketLegsSource = m.getSource('market-spider-legs') as mapboxgl.GeoJSONSource | undefined;
    const eventLegsSource = m.getSource('event-spider-legs') as mapboxgl.GeoJSONSource | undefined;
    const marketMarkerSource = m.getSource('market-spider-markers') as mapboxgl.GeoJSONSource | undefined;
    const eventSpiderSource = m.getSource('event-spider-points') as mapboxgl.GeoJSONSource | undefined;
    const anchorSource = m.getSource('fanout-anchor') as mapboxgl.GeoJSONSource | undefined;

    if (signalType === 'markets' && data) {
      if (marketLegsSource) marketLegsSource.setData(data.legs);
      if (eventLegsSource) eventLegsSource.setData(emptyCollection());
      if (marketMarkerSource) marketMarkerSource.setData(data.markers);
      if (eventSpiderSource) eventSpiderSource.setData(emptyCollection());
      if (anchorSource) anchorSource.setData(data.anchor);
      return;
    }

    if (signalType === 'events' && data) {
      if (eventLegsSource) eventLegsSource.setData(data.legs);
      if (marketLegsSource) marketLegsSource.setData(emptyCollection());
      if (eventSpiderSource) eventSpiderSource.setData(data.markers);
      if (marketMarkerSource) marketMarkerSource.setData(emptyCollection());
      if (anchorSource) anchorSource.setData(data.anchor);
      return;
    }

    if (marketLegsSource) marketLegsSource.setData(emptyCollection());
    if (eventLegsSource) eventLegsSource.setData(emptyCollection());
    if (marketMarkerSource) marketMarkerSource.setData(emptyCollection());
    if (eventSpiderSource) eventSpiderSource.setData(emptyCollection());
    if (anchorSource) anchorSource.setData(emptyCollection());
  }, []);

  const resetFanout = useCallback(() => {
    fanoutRequestRef.current += 1;
    cancelFanoutAnimation();
    const hadFanout = Boolean(fanoutRef.current);
    fanoutRef.current = null;
    applyMarketClusterFilter(null);
    applyEventClusterFilter(null);
    setFanoutData('none');
    if (hadFanout) {
      onFanoutChangeRef.current?.(null);
    }
  }, [applyEventClusterFilter, applyMarketClusterFilter, cancelFanoutAnimation, setFanoutData]);

  const clearFanout = useCallback(() => {
    setClusterChoice(null);
    resetFanout();
  }, [resetFanout]);

  const themeMixFromCandidates = useCallback((candidates: Array<MarketSelectionCandidate | EventSelectionCandidate>) => {
    const mix: Record<ThemeKey, number> = {
      conflicts: 0,
      elections: 0,
      economy: 0,
      disasters: 0,
      infrastructure: 0,
    };

    for (const candidate of candidates) {
      if (candidate.type === 'event') {
        mix[candidate.data.category] += 1;
        continue;
      }

      if (candidate.data.category === 'conflict' || candidate.data.category === 'diplomacy') mix.conflicts += 1;
      if (candidate.data.category === 'politics') mix.elections += 1;
      if (candidate.data.category === 'economy') mix.economy += 1;
      if (candidate.data.category === 'climate') mix.disasters += 1;
    }

    return mix;
  }, []);

  const renderFanout = useCallback((state: FanoutInternalState, options?: { animate?: boolean }) => {
    const m = map.current;
    if (!m) return;
    fanoutRef.current = state;

    applyMarketClusterFilter(state.signalType === 'markets' ? state.clusterId : null);
    applyEventClusterFilter(state.signalType === 'events' ? state.clusterId : null);
    const nodes = buildSpiderfyNodes(state.signalType, state.center, state.candidates, m.getZoom());

    const maxElapsedMs =
      FANOUT_ANIMATION_DURATION_MS + FANOUT_STAGGER_MS * Math.max(0, nodes.length - 1);
    const renderFrame = (elapsedMs: number) => {
      const frame = buildSpiderfyRenderData(state.signalType, state.center, nodes, elapsedMs);
      setFanoutData(state.signalType, frame);
    };

    cancelFanoutAnimation();
    if (options?.animate) {
      const startedAt = performance.now();
      const step = (now: number) => {
        if (!map.current) return;
        const elapsedMs = now - startedAt;
        renderFrame(elapsedMs);
        if (elapsedMs < maxElapsedMs + 25) {
          fanoutAnimationRef.current = requestAnimationFrame(step);
        } else {
          fanoutAnimationRef.current = null;
          renderFrame(maxElapsedMs + 80);
        }
      };
      fanoutAnimationRef.current = requestAnimationFrame(step);
    } else {
      renderFrame(maxElapsedMs + 80);
    }

    const freshestTimestamp =
      state.candidates
        .map((candidate) =>
          candidate.type === 'event'
            ? candidate.data.lastSeenAt
            : candidate.data.lastUpdated)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null;

    const fanout: ActiveFanout = {
      clusterId: state.clusterId,
      signalType: state.signalType,
      center: state.center,
      candidateIds: state.candidates.map((candidate) => candidate.id),
      openedAt: new Date().toISOString(),
      itemCount: state.candidates.length,
      locationLabel: `${state.center[1].toFixed(2)}, ${state.center[0].toFixed(2)}`,
      themeMix: themeMixFromCandidates(state.candidates),
      freshestTimestamp,
    };

    onFanoutChangeRef.current?.(fanout);
  }, [applyEventClusterFilter, applyMarketClusterFilter, cancelFanoutAnimation, setFanoutData, themeMixFromCandidates]);

  const toEventCandidates = useCallback((
    leaves: Array<{ properties?: Record<string, unknown> | null }>,
    clusterId: number,
  ): EventSelectionCandidate[] => {
    const eventCandidates: EventSelectionCandidate[] = [];
    const seen = new Set<string>();
    for (const leaf of leaves) {
      const id = String(leaf.properties?.id || '');
      const event = eventByIdRef.current.get(id);
      if (!event || seen.has(id)) continue;
      seen.add(id);
      eventCandidates.push({
        type: 'event',
        id,
        title: event.title,
        subtitle: `${event.severity.toUpperCase()} - ${event.sourceCount} sources`,
        signalType: 'events',
        originClusterId: clusterId,
        data: event,
      });
    }

    eventCandidates.sort((a, b) => {
      if (b.data.signalScore !== a.data.signalScore) return b.data.signalScore - a.data.signalScore;
      return new Date(b.data.lastSeenAt).getTime() - new Date(a.data.lastSeenAt).getTime();
    });

    return eventCandidates;
  }, []);

  const toMarketCandidates = useCallback((
    leaves: Array<{ properties?: Record<string, unknown> | null }>,
    clusterId: number,
  ): MarketSelectionCandidate[] => {
    const marketCandidates: MarketSelectionCandidate[] = [];
    const seen = new Set<string>();
    for (const leaf of leaves) {
      const id = String(leaf.properties?.id || '');
      const market = marketByIdRef.current.get(id);
      if (!market || seen.has(id)) continue;
      seen.add(id);
      marketCandidates.push({
        type: 'market',
        id,
        title: market.title,
        subtitle: `${Math.round(market.probability * 100)}% - ${market.volume}`,
        signalType: 'markets',
        originClusterId: clusterId,
        data: market,
      });
    }

    marketCandidates.sort((a, b) => {
      const marketA = a.data;
      const marketB = b.data;
      if (marketB.signalScore !== marketA.signalScore) return marketB.signalScore - marketA.signalScore;
      return marketB.volumeRaw - marketA.volumeRaw;
    });

    return marketCandidates;
  }, []);

  const openFanout = useCallback((
    signalType: FanoutSignalType,
    center: [number, number],
    clusterId: number | null,
    candidates: Array<MarketSelectionCandidate | EventSelectionCandidate>,
  ) => {
    if (candidates.length === 0) {
      resetFanout();
      return;
    }

    if (candidates.length === 1) {
      resetFanout();
      openCandidate(candidates[0]);
      return;
    }

    const limit = signalType === 'markets' ? MARKET_SPIDERFY_LIMIT : EVENT_SPIDERFY_LIMIT;
    if (candidates.length > limit) {
      resetFanout();
      onSelectionCandidatesRef.current?.(
        `${signalType === 'markets' ? 'Market' : 'Event'} Stack (${candidates.length})`,
        candidates,
      );
      return;
    }

    const m = map.current;
    if (!m) return;

    const requestId = fanoutRequestRef.current + 1;
    fanoutRequestRef.current = requestId;

    const applySpider = () => {
      if (!map.current || fanoutRequestRef.current !== requestId) return;
      renderFanout({ center, clusterId, signalType, candidates }, { animate: true });
    };

    const minZoom = signalType === 'markets' ? MARKET_SPIDERFY_MIN_ZOOM : EVENT_SPIDERFY_MIN_ZOOM;
    if (m.getZoom() < minZoom) {
      m.easeTo({
        center,
        zoom: minZoom,
        duration: 500,
      });
      m.once('moveend', applySpider);
      return;
    }

    applySpider();
  }, [openCandidate, renderFanout, resetFanout]);

  const openClusterFanout = useCallback((option: ClusterChoiceOption) => {
    const m = map.current;
    if (!m) return;

    const source = m.getSource(option.signalType === 'markets' ? 'markets' : 'events') as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;

    resetFanout();
    const clusterLimit = option.signalType === 'markets' ? MARKET_CLUSTER_LEAF_LIMIT : EVENT_CLUSTER_LEAF_LIMIT;
    source.getClusterLeaves(option.clusterId, clusterLimit, 0, (leafErr, leavesRaw) => {
      if (leafErr) return;
      const leaves = Array.isArray(leavesRaw) ? leavesRaw : [];
      const candidates =
        option.signalType === 'markets'
          ? toMarketCandidates(leaves, option.clusterId)
          : toEventCandidates(leaves, option.clusterId);
      openFanout(option.signalType, option.center, option.clusterId, candidates);
    });
  }, [openFanout, resetFanout, toEventCandidates, toMarketCandidates]);

  const handleClusterChoice = useCallback((option: ClusterChoiceOption) => {
    setClusterChoice(null);
    openClusterFanout(option);
  }, [openClusterFanout]);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;

    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      projection: 'globe',
      center: [0, 20],
      zoom: 1.5,
      attributionControl: false,
    });

    map.current.on('style.load', () => {
      if (!map.current) return;
      const m = map.current;

      m.setFog({
        color: 'rgb(15, 26, 46)',
        'high-color': 'rgb(36, 60, 100)',
        'horizon-blend': 0.15,
        'space-color': 'rgb(6, 10, 20)',
        'star-intensity': 0.5,
      });

      m.setPaintProperty('land', 'background-color', '#1A2540');
      m.setPaintProperty('landuse', 'fill-color', '#1C2744');
      m.setPaintProperty('water', 'fill-color', '#0F1A2E');
      m.setPaintProperty('waterway', 'line-color', '#0D1830');
      m.setPaintProperty('admin-0-boundary', 'line-color', '#334155');
      m.setPaintProperty('admin-1-boundary', 'line-color', '#1E293B');
      m.setLayoutProperty('poi-label', 'visibility', 'none');
      m.setLayoutProperty('airport-label', 'visibility', 'none');
      m.setLayoutProperty('natural-point-label', 'visibility', 'none');
      m.setLayoutProperty('natural-line-label', 'visibility', 'none');
      m.setLayoutProperty('waterway-label', 'visibility', 'none');

      if (!m.hasImage('market-diamond')) {
        m.addImage('market-diamond', createDiamondImage(), { sdf: true });
      }

      addWatchZoneLayers(m);
      addEventLayers(m);
      addMarketLayers(m);
      addFanoutAnchorLayers(m);
      addNotamLayers(m);
      addShippingLayers(m);
      addElectionLayers(m);
      addEarthquakeLayers(m);
      addTerminatorLayers(m);
      layersReady.current = true;

      m.on('click', (e) => {
        setClusterChoice(null);

        const spiderHits = m.queryRenderedFeatures(e.point, { layers: ['market-spider-markers', 'event-spider-points'] });
        if (spiderHits.length > 0) {
          const candidates = buildCandidates(spiderHits);
          if (candidates[0]) {
            openCandidate(candidates[0]);
            return;
          }
        }

        const clusterHits = m.queryRenderedFeatures(e.point, { layers: ['event-clusters', 'market-clusters'] });
        if (clusterHits.length > 0) {
          const choices: ClusterChoiceOption[] = [];
          for (const cluster of clusterHits) {
            const signalType = cluster.layer?.id === 'event-clusters'
              ? 'events'
              : cluster.layer?.id === 'market-clusters'
                ? 'markets'
                : null;
            if (!signalType) continue;
            const clusterId = Number(cluster.properties?.cluster_id);
            if (!Number.isFinite(clusterId)) continue;
            choices.push({
              signalType,
              clusterId,
              center: (cluster.geometry as GeoJSON.Point).coordinates as [number, number],
              count: Number(cluster.properties?.point_count || 0),
            });
          }

          const byType = new Map<FanoutSignalType, ClusterChoiceOption>();
          for (const choice of choices) {
            const existing = byType.get(choice.signalType);
            if (!existing || choice.count > existing.count) byType.set(choice.signalType, choice);
          }
          const deduped = [...byType.values()];

          if (deduped.length > 1) {
            setClusterChoice({
              x: e.point.x,
              y: e.point.y,
              options: deduped.sort((a, b) => b.count - a.count),
            });
            return;
          }

          if (deduped[0]) {
            openClusterFanout(deduped[0]);
            return;
          }
        }

        const hits = m.queryRenderedFeatures(e.point, {
          layers: ['event-points', 'market-markers', 'earthquake-circles', 'watch-zone-fill', 'watch-zone-outline'],
        });

        if (hits.length === 0) {
          clearFanout();
          onMapClickRef.current?.();
          return;
        }

        const candidates = buildCandidates(hits);
        if (candidates.length === 0) {
          clearFanout();
          onMapClickRef.current?.();
          return;
        }

        if (candidates.every((candidate) => candidate.originClusterId == null)) {
          clearFanout();
        }

        if (candidates.length > 1) {
          onSelectionCandidatesRef.current?.('Multiple Signals At This Location', candidates);
          return;
        }

        openCandidate(candidates[0]);
      });

      for (const layerId of ['event-points', 'event-clusters', 'event-spider-points', 'market-markers', 'market-clusters', 'market-spider-markers', 'earthquake-circles', 'watch-zone-fill', 'watch-zone-outline']) {
        m.on('mouseenter', layerId, () => { m.getCanvas().style.cursor = 'pointer'; });
        m.on('mouseleave', layerId, () => { m.getCanvas().style.cursor = ''; });
      }

      setMapReady(true);
    });

    return () => {
      cancelFanoutAnimation();
      map.current?.remove();
      map.current = null;
    };
  }, [buildCandidates, cancelFanoutAnimation, clearFanout, openCandidate, openClusterFanout]);

  useEffect(() => {
    if (!mapContainer.current) return;
    const ro = new ResizeObserver(() => {
      map.current?.resize();
    });
    ro.observe(mapContainer.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!map.current || !activeRoom) return;
    map.current.flyTo({
      center: activeRoom.center,
      zoom: activeRoom.zoom,
      duration: 1200,
      essential: true,
    });
  }, [activeRoom]);

  useEffect(() => {
    if (!map.current || !focusEventRequest) return;
    const zoom = Math.max(6.4, map.current.getZoom());
    map.current.easeTo({
      center: [focusEventRequest.lng, focusEventRequest.lat],
      zoom,
      duration: 650,
      essential: true,
    });
  }, [focusEventRequest]);

  useEffect(() => {
    resetFanout();
  }, [forceClearFanoutKey, resetFanout]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      clearFanout();
      onMapClickRef.current?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [clearFanout]);

  useEffect(() => {
    const m = map.current;
    if (!m || !layersReady.current) return;

    const handleZoomEnd = () => {
      const state = fanoutRef.current;
      if (!state) return;
      if (state.signalType === 'markets' && !visibleSignals.markets) return;
      if (state.signalType === 'events' && !visibleSignals.events) return;
      renderFanout(state);
    };

    m.on('zoomend', handleZoomEnd);
    return () => {
      m.off('zoomend', handleZoomEnd);
    };
  }, [renderFanout, visibleSignals.events, visibleSignals.markets]);

  useEffect(() => {
    const state = fanoutRef.current;
    if (!state) return;
    if (state.signalType === 'markets' && !visibleSignals.markets) {
      resetFanout();
      return;
    }
    if (state.signalType === 'events' && !visibleSignals.events) {
      resetFanout();
      return;
    }
  }, [visibleSignals.events, visibleSignals.markets, resetFanout]);

  useEffect(() => {
    const state = fanoutRef.current;
    if (!state) return;

    const allowedIds =
      state.signalType === 'markets'
        ? new Set(filteredMarkets.map((market) => market.id))
        : new Set(filteredEvents.map((event) => event.id));

    const nextCandidates = state.candidates.filter((candidate) => allowedIds.has(candidate.id));

    if (nextCandidates.length <= 1) {
      resetFanout();
      return;
    }

    if (nextCandidates.length !== state.candidates.length) {
      renderFanout({
        center: state.center,
        clusterId: state.clusterId,
        signalType: state.signalType,
        candidates: nextCandidates,
      });
    }
  }, [filteredEvents, filteredMarkets, renderFanout, resetFanout]);

  useEffect(() => {
    if (!layersReady.current) return;
    const interval = setInterval(() => {
      if (map.current) updateTerminator(map.current);
    }, 60_000);
    return () => clearInterval(interval);
  }, [mapReady]);

  useEffect(() => {
    if (!map.current || !layersReady.current) return;
    const source = map.current.getSource('events') as mapboxgl.GeoJSONSource | undefined;
    if (source) source.setData(eventsToGeoJSON(filteredEvents, activeRoom));

    const showEvents = visibleSignals.events;
    for (const layerId of EVENT_LAYERS) {
      try {
        map.current.setLayoutProperty(layerId, 'visibility', showEvents ? 'visible' : 'none');
      } catch {
        // Layer may not exist yet.
      }
    }
  }, [filteredEvents, visibleSignals.events, activeRoom, mapReady]);

  useEffect(() => {
    if (!map.current || !layersReady.current) return;
    const source = map.current.getSource('markets') as mapboxgl.GeoJSONSource | undefined;
    if (source) source.setData(marketsToGeoJSON(filteredMarkets, activeRoom));

    const showMarkets = visibleSignals.markets;
    for (const layerId of MARKET_LAYERS) {
      try {
        map.current.setLayoutProperty(layerId, 'visibility', showMarkets ? 'visible' : 'none');
      } catch {
        // Layer may not exist yet.
      }
    }
  }, [filteredMarkets, visibleSignals.markets, activeRoom, mapReady]);

  useEffect(() => {
    if (!map.current || !layersReady.current) return;
    const source = map.current.getSource('watch-zones') as mapboxgl.GeoJSONSource | undefined;
    if (source) source.setData(watchZonesToGeoJSON(filteredWatchZones, activeRoom));

    const showWatchZones = visibleSignals.watch_zones;
    for (const layerId of WATCH_ZONE_LAYERS) {
      try {
        map.current.setLayoutProperty(layerId, 'visibility', showWatchZones ? 'visible' : 'none');
      } catch {
        // Layer may not exist yet.
      }
    }
  }, [filteredWatchZones, visibleSignals.watch_zones, activeRoom, mapReady]);

  useEffect(() => {
    if (!map.current || !layersReady.current) return;
    const m = map.current;

    const source = m.getSource('earthquakes') as mapboxgl.GeoJSONSource | undefined;
    if (source) source.setData(earthquakesToGeoJSON(earthquakes, activeRoom));

    const showEarthquakes = visibleSignals.disasters && visibleThemes.disasters;
    for (const layerId of EARTHQUAKE_LAYERS) {
      try {
        m.setLayoutProperty(layerId, 'visibility', showEarthquakes ? 'visible' : 'none');
      } catch {
        // Layer may not exist yet.
      }
    }
  }, [earthquakes, visibleSignals.disasters, visibleThemes.disasters, activeRoom, mapReady]);

  useEffect(() => {
    if (!map.current || !layersReady.current) return;
    const m = map.current;

    const notamSource = m.getSource('notams') as mapboxgl.GeoJSONSource | undefined;
    if (notamSource) notamSource.setData(notamsToGeoJSON(notamZones));

    const shippingSource = m.getSource('shipping') as mapboxgl.GeoJSONSource | undefined;
    if (shippingSource) shippingSource.setData(shippingToGeoJSON(shippingChokepoints));

    const electionSource = m.getSource('elections') as mapboxgl.GeoJSONSource | undefined;
    if (electionSource) electionSource.setData(electionsToGeoJSON(elections));

    const showInfra = visibleSignals.infrastructure_overlays && visibleThemes.infrastructure;
    const showElectionOverlay = visibleSignals.infrastructure_overlays && visibleThemes.elections;

    for (const layerId of NOTAM_LAYERS) {
      try {
        m.setLayoutProperty(layerId, 'visibility', showInfra ? 'visible' : 'none');
      } catch {
        // Layer may not exist yet.
      }
    }

    for (const layerId of SHIPPING_LAYERS) {
      try {
        m.setLayoutProperty(layerId, 'visibility', showInfra ? 'visible' : 'none');
      } catch {
        // Layer may not exist yet.
      }
    }

    for (const layerId of ELECTION_LAYERS) {
      try {
        m.setLayoutProperty(layerId, 'visibility', showElectionOverlay ? 'visible' : 'none');
      } catch {
        // Layer may not exist yet.
      }
    }
  }, [notamZones, shippingChokepoints, elections, visibleSignals.infrastructure_overlays, visibleThemes.infrastructure, visibleThemes.elections, mapReady]);

  useEffect(() => {
    if (!map.current || !layersReady.current) return;
    const source = map.current.getSource('related-lines') as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;

    if (!selectedEventCoords || !relatedMarkets || relatedMarkets.length === 0) {
      source.setData({ type: 'FeatureCollection', features: [] });
      return;
    }

    const features = relatedMarkets.map((market, index) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [selectedEventCoords.lng, selectedEventCoords.lat],
          [market.lng, market.lat],
        ],
      },
      properties: { id: `line_${index}` },
    }));

    source.setData({ type: 'FeatureCollection', features });
  }, [selectedEventCoords, relatedMarkets, mapReady]);

  if (missingToken) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0B1120',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <span style={{ color: '#64748B', fontSize: 13 }}>
          Set NEXT_PUBLIC_MAPBOX_TOKEN in .env.local to load the map
        </span>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div
        ref={mapContainer}
        className="monitor-map"
        style={{ width: '100%', height: '100%' }}
      />
      {clusterChoice && (
        <div
          style={{
            position: 'absolute',
            left: Math.max(12, clusterChoice.x - 84),
            top: Math.max(52, clusterChoice.y - 32),
            zIndex: 16,
            width: 184,
            border: '1px solid #334155',
            borderRadius: 8,
            background: 'rgba(10,18,34,0.96)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <div style={{ fontSize: 10, color: '#8FA7C4', letterSpacing: '0.06em', fontWeight: 700, textTransform: 'uppercase', padding: '2px 4px' }}>
            Choose Signal
          </div>
          {clusterChoice.options.map((option) => (
            <button
              key={`${option.signalType}:${option.clusterId}`}
              onClick={() => handleClusterChoice(option)}
              style={{
                width: '100%',
                textAlign: 'left',
                borderRadius: 6,
                border: '1px solid #334155',
                background: 'rgba(255,255,255,0.03)',
                color: '#D6E2F1',
                padding: '8px 10px',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {option.signalType === 'events' ? 'Events' : 'Markets'} ({option.count})
            </button>
          ))}
        </div>
      )}
      {!mapReady && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0B1120',
            zIndex: 5,
            gap: 12,
            transition: 'opacity 400ms ease',
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              border: '2px solid #334155',
              borderTopColor: '#4A9EFF',
              borderRadius: '50%',
              animation: 'monitorSpin 0.8s linear infinite',
            }}
          />
          <span style={{ color: '#64748B', fontSize: 12 }}>Loading map...</span>
        </div>
      )}
      <style>{`
        @keyframes monitorSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default memo(MonitorMap);
