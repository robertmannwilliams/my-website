'use client';

import { useEffect, useRef, useState, memo, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { GdeltEvent } from '@/lib/monitor/events';
import type { PolymarketMarket } from '@/lib/monitor/polymarket';
import type { UsgsEarthquake } from '@/lib/monitor/usgs';
import type { OngoingSituation } from '@/lib/monitor/types';
import {
  type ThemeKey,
  getActiveEventCategories,
  getActiveMarketCategories,
  getActiveSituationCategories,
} from '@/lib/monitor/themes';
import ongoingSituationsData from '@/app/monitor/data/ongoing-situations.json';

interface MonitorMapProps {
  onEventClick?: (event: GdeltEvent) => void;
  onMarketClick?: (market: PolymarketMarket) => void;
  onEarthquakeClick?: (eq: UsgsEarthquake) => void;
  onSituationClick?: (situation: OngoingSituation) => void;
  onMapClick?: () => void;
  selectedEventCoords?: { lat: number; lng: number } | null;
  relatedMarkets?: PolymarketMarket[];
  visibleThemes: Record<ThemeKey, boolean>;
  events: GdeltEvent[];
  markets: PolymarketMarket[];
  earthquakes: UsgsEarthquake[];
}

function eventsToGeoJSON(events: GdeltEvent[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: events.map((e) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [e.lng, e.lat] },
      properties: {
        id: e.id,
        title: e.title,
        category: e.category,
        severity: e.severity,
        timestamp: e.timestamp,
        summary: e.summary,
        sources: JSON.stringify(e.sources),
        tone: e.tone,
        region: e.region,
        severityRank: e.severity === 'critical' ? 3 : e.severity === 'watch' ? 2 : 1,
      },
    })),
  };
}

function marketsToGeoJSON(markets: PolymarketMarket[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: markets.map((m) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [m.lng, m.lat] },
      properties: {
        id: m.id,
        title: m.title,
        category: m.category,
        probability: m.probability,
        probabilityLabel: `${Math.round(m.probability * 100)}%`,
        volume: m.volume,
        volumeRaw: m.volumeRaw,
        url: m.url,
        lastUpdated: m.lastUpdated,
        outcomes: JSON.stringify(m.outcomes),
        outcomePrices: JSON.stringify(m.outcomePrices),
        liquidity: m.liquidity,
        endDate: m.endDate,
      },
    })),
  };
}

function earthquakesToGeoJSON(quakes: UsgsEarthquake[]): GeoJSON.FeatureCollection {
  const twoHoursAgo = Date.now() - 2 * 60 * 60_000;
  return {
    type: 'FeatureCollection',
    features: quakes.map((q) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [q.lng, q.lat] },
      properties: {
        id: q.id,
        title: q.title,
        magnitude: q.magnitude,
        magType: q.magType,
        depth: q.depth,
        place: q.place,
        timestamp: q.timestamp,
        tsunami: q.tsunami,
        felt: q.felt,
        significance: q.significance,
        alert: q.alert,
        url: q.url,
        isRecent: new Date(q.timestamp).getTime() > twoHoursAgo,
      },
    })),
  };
}

function situationsToGeoJSON(situations: OngoingSituation[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (const s of situations) {
    for (const loc of s.locations) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [loc.lng, loc.lat] },
        properties: {
          situationId: s.id,
          situationTitle: s.title,
          severity: s.severity,
          category: s.category,
          locationName: loc.name,
          role: loc.role,
          situationData: JSON.stringify(s),
        },
      });
    }
  }
  return { type: 'FeatureCollection', features };
}

// --- Day/Night Terminator ---

function computeSubsolarPoint(date: Date): { lat: number; lng: number } {
  const dayOfYear =
    Math.floor(
      (date.getTime() - new Date(date.getUTCFullYear(), 0, 0).getTime()) /
        86400000,
    );
  const declination =
    -23.4393 * Math.cos((2 * Math.PI * (dayOfYear + 10)) / 365.25);
  const utcHours =
    date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600;
  const lng = 180 - utcHours * 15;
  return { lat: declination, lng: lng > 180 ? lng - 360 : lng };
}

function destinationPoint(
  latDeg: number,
  lngDeg: number,
  bearingDeg: number,
  angularDistDeg: number,
): [number, number] {
  const toRad = Math.PI / 180;
  const toDeg = 180 / Math.PI;
  const lat1 = latDeg * toRad;
  const lng1 = lngDeg * toRad;
  const brng = bearingDeg * toRad;
  const d = angularDistDeg * toRad;

  const sinD = Math.sin(d);
  const cosD = Math.cos(d);
  const sinLat1 = Math.sin(lat1);
  const cosLat1 = Math.cos(lat1);

  const lat2 = Math.asin(sinLat1 * cosD + cosLat1 * sinD * Math.cos(brng));
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(brng) * sinD * cosLat1,
      cosD - sinLat1 * Math.sin(lat2),
    );

  return [((lng2 * toDeg + 540) % 360) - 180, lat2 * toDeg];
}

function generateNightPolygon(
  sunLatDeg: number,
  sunLngDeg: number,
  angularDistDeg: number,
): GeoJSON.Feature {
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
    twilight: {
      type: 'FeatureCollection',
      features: [generateNightPolygon(sun.lat, sun.lng, 96)],
    },
    core: {
      type: 'FeatureCollection',
      features: [generateNightPolygon(sun.lat, sun.lng, 90)],
    },
    night: {
      type: 'FeatureCollection',
      features: [generateNightPolygon(sun.lat, sun.lng, 84)],
    },
  };
}

function addTerminatorLayers(m: mapboxgl.Map) {
  const data = generateTerminatorGeoJSON();

  m.addSource('terminator-twilight', { type: 'geojson', data: data.twilight });
  m.addSource('terminator-core', { type: 'geojson', data: data.core });
  m.addSource('terminator-night', { type: 'geojson', data: data.night });

  m.addLayer(
    {
      id: 'terminator-twilight',
      type: 'fill',
      source: 'terminator-twilight',
      paint: { 'fill-color': '#000000', 'fill-opacity': 0.05 },
    },
    'event-clusters',
  );

  m.addLayer(
    {
      id: 'terminator-core',
      type: 'fill',
      source: 'terminator-core',
      paint: { 'fill-color': '#000000', 'fill-opacity': 0.08 },
    },
    'event-clusters',
  );

  m.addLayer(
    {
      id: 'terminator-night',
      type: 'fill',
      source: 'terminator-night',
      paint: { 'fill-color': '#000000', 'fill-opacity': 0.10 },
    },
    'event-clusters',
  );
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

// --- Diamond SDF image for market markers ---

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

// --- Theme-based color expressions ---

const EVENT_CATEGORY_COLOR: mapboxgl.Expression = [
  'match', ['get', 'category'],
  'conflicts', '#FF4444',
  'elections', '#4A9EFF',
  'economy', '#22C55E',
  'disasters', '#FF8C22',
  'infrastructure', '#06B6D4',
  '#666680',
];

const EVENT_CATEGORY_COLOR_ALPHA = (alpha: number): mapboxgl.Expression => [
  'match', ['get', 'category'],
  'conflicts', `rgba(255,68,68,${alpha})`,
  'elections', `rgba(74,158,255,${alpha})`,
  'economy', `rgba(34,197,94,${alpha})`,
  'disasters', `rgba(255,140,34,${alpha})`,
  'infrastructure', `rgba(6,182,212,${alpha})`,
  `rgba(102,102,128,${alpha})`,
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

const SITUATION_CATEGORY_COLOR_ALPHA = (alpha: number): mapboxgl.Expression => [
  'match', ['get', 'category'],
  'conflicts', `rgba(255,68,68,${alpha})`,
  'infrastructure', `rgba(6,182,212,${alpha})`,
  `rgba(102,170,255,${alpha})`,
];

function addSituationLayers(m: mapboxgl.Map) {
  const geojson = situationsToGeoJSON(ongoingSituationsData as OngoingSituation[]);

  m.addSource('situations', {
    type: 'geojson',
    data: geojson,
  });

  // Large semi-transparent circles
  m.addLayer({
    id: 'situation-circles',
    type: 'circle',
    source: 'situations',
    paint: {
      'circle-color': SITUATION_CATEGORY_COLOR_ALPHA(0.15),
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        0, 14,
        3, 18,
        6, 24,
      ],
      'circle-stroke-width': 1.5,
      'circle-stroke-color': SITUATION_CATEGORY_COLOR_ALPHA(0.4),
    },
  });

  // Outer pulse ring
  m.addLayer({
    id: 'situation-pulse',
    type: 'circle',
    source: 'situations',
    paint: {
      'circle-color': 'transparent',
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        0, 22,
        3, 28,
        6, 36,
      ],
      'circle-stroke-width': 1,
      'circle-stroke-color': SITUATION_CATEGORY_COLOR_ALPHA(0.2),
    },
  });

  // Location role labels
  m.addLayer({
    id: 'situation-labels',
    type: 'symbol',
    source: 'situations',
    layout: {
      'text-field': ['get', 'role'],
      'text-size': 9,
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
      'text-offset': [0, 2.2],
      'text-allow-overlap': false,
    },
    paint: {
      'text-color': 'rgba(140,180,220,0.7)',
      'text-halo-color': '#0B1120',
      'text-halo-width': 1,
    },
  });
}

function addEventLayers(m: mapboxgl.Map) {
  m.addSource('events', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
    cluster: true,
    clusterMaxZoom: 8,
    clusterRadius: 50,
    clusterProperties: {
      maxSeverity: ['max', ['get', 'severityRank']],
    },
  });

  // Cluster circles — colored by severity (works well for mixed-theme clusters)
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
      'circle-radius': [
        'step', ['get', 'point_count'],
        16, 5, 20, 20, 26,
      ],
      'circle-opacity': 0.85,
      'circle-stroke-width': 1,
      'circle-stroke-color': 'rgba(255,255,255,0.15)',
    },
  });

  // Cluster count labels
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
    paint: {
      'text-color': '#ffffff',
    },
  });

  // Individual event circles — colored by THEME category
  m.addLayer({
    id: 'event-points',
    type: 'circle',
    source: 'events',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': EVENT_CATEGORY_COLOR,
      'circle-radius': [
        'match', ['get', 'severity'],
        'critical', 7,
        'watch', 5,
        4,
      ],
      'circle-opacity': 0.9,
      'circle-stroke-width': [
        'match', ['get', 'severity'],
        'critical', 2,
        'watch', 1,
        0.5,
      ],
      'circle-stroke-color': EVENT_CATEGORY_COLOR_ALPHA(0.35),
    },
  });

  // Critical pulse ring — colored by theme
  m.addLayer({
    id: 'event-pulse',
    type: 'circle',
    source: 'events',
    filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'severity'], 'critical']],
    paint: {
      'circle-color': 'transparent',
      'circle-radius': 14,
      'circle-stroke-width': 2,
      'circle-stroke-color': EVENT_CATEGORY_COLOR_ALPHA(0.3),
      'circle-stroke-opacity': [
        'interpolate', ['linear'], ['zoom'],
        0, 0.6,
        5, 0.4,
        10, 0.2,
      ],
    },
  });
}

function addMarketLayers(m: mapboxgl.Map) {
  m.addSource('markets', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  });

  // Related lines (rendered below market markers)
  m.addSource('related-lines', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
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

  // Diamond markers for markets — colored by theme
  m.addLayer({
    id: 'market-markers',
    type: 'symbol',
    source: 'markets',
    layout: {
      'icon-image': 'market-diamond',
      'icon-size': [
        'interpolate', ['linear'], ['zoom'],
        0, 0.55,
        5, 0.75,
        10, 1.0,
      ],
      'icon-allow-overlap': true,
    },
    paint: {
      'icon-color': MARKET_CATEGORY_COLOR,
      'icon-opacity': 0.9,
    },
  });

  // Probability % text inside diamond
  m.addLayer({
    id: 'market-labels',
    type: 'symbol',
    source: 'markets',
    layout: {
      'text-field': ['get', 'probabilityLabel'],
      'text-size': [
        'interpolate', ['linear'], ['zoom'],
        0, 8,
        5, 10,
        10, 12,
      ],
      'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
      'text-allow-overlap': true,
      'icon-allow-overlap': true,
    },
    paint: {
      'text-color': '#FFFFFF',
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
      'circle-color': [
        'interpolate', ['linear'], ['get', 'magnitude'],
        4.5, '#FFAA22',
        5.5, '#FF6622',
        7.0, '#FF2222',
      ],
      'circle-radius': [
        'interpolate', ['linear'], ['get', 'magnitude'],
        4.5, 6,
        5.5, 10,
        7.0, 18,
        8.0, 26,
      ],
      'circle-opacity': 0.85,
      'circle-stroke-width': 1.5,
      'circle-stroke-color': [
        'interpolate', ['linear'], ['get', 'magnitude'],
        4.5, 'rgba(255,170,34,0.4)',
        5.5, 'rgba(255,102,34,0.4)',
        7.0, 'rgba(255,34,34,0.4)',
      ],
    },
  });

  m.addLayer({
    id: 'earthquake-pulse',
    type: 'circle',
    source: 'earthquakes',
    filter: ['==', ['get', 'isRecent'], true],
    paint: {
      'circle-color': 'transparent',
      'circle-radius': [
        'interpolate', ['linear'], ['get', 'magnitude'],
        4.5, 12,
        5.5, 18,
        7.0, 28,
        8.0, 36,
      ],
      'circle-stroke-width': 2,
      'circle-stroke-color': [
        'interpolate', ['linear'], ['get', 'magnitude'],
        4.5, 'rgba(255,170,34,0.3)',
        5.5, 'rgba(255,102,34,0.3)',
        7.0, 'rgba(255,34,34,0.3)',
      ],
      'circle-stroke-opacity': [
        'interpolate', ['linear'], ['zoom'],
        0, 0.6,
        5, 0.4,
        10, 0.2,
      ],
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
    paint: {
      'text-color': '#FFFFFF',
    },
  });
}

// Earthquake layer IDs for wholesale visibility toggling
const EARTHQUAKE_LAYERS = ['earthquake-circles', 'earthquake-pulse', 'earthquake-labels'];

// Situation layer IDs
const SITUATION_LAYERS = ['situation-circles', 'situation-pulse', 'situation-labels'];

function MonitorMap({
  onEventClick,
  onMarketClick,
  onEarthquakeClick,
  onSituationClick,
  onMapClick,
  selectedEventCoords,
  relatedMarkets,
  visibleThemes,
  events,
  markets,
  earthquakes,
}: MonitorMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [missingToken, setMissingToken] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const layersReady = useRef(false);

  // Store callbacks in refs so map click handlers always have latest versions
  const onEventClickRef = useRef(onEventClick);
  const onMarketClickRef = useRef(onMarketClick);
  const onEarthquakeClickRef = useRef(onEarthquakeClick);
  const onSituationClickRef = useRef(onSituationClick);
  const onMapClickRef = useRef(onMapClick);
  useEffect(() => { onEventClickRef.current = onEventClick; }, [onEventClick]);
  useEffect(() => { onMarketClickRef.current = onMarketClick; }, [onMarketClick]);
  useEffect(() => { onEarthquakeClickRef.current = onEarthquakeClick; }, [onEarthquakeClick]);
  useEffect(() => { onSituationClickRef.current = onSituationClick; }, [onSituationClick]);
  useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);

  // Compute filtered data based on active themes
  const filteredEvents = useMemo(() => {
    const activeCats = getActiveEventCategories(visibleThemes);
    return events.filter((e) => activeCats.includes(e.category));
  }, [events, visibleThemes]);

  const filteredMarkets = useMemo(() => {
    const activeCats = getActiveMarketCategories(visibleThemes);
    return markets.filter((m) => activeCats.includes(m.category));
  }, [markets, visibleThemes]);

  const filteredSituations = useMemo(() => {
    const activeCats = getActiveSituationCategories(visibleThemes);
    const allSituations = ongoingSituationsData as OngoingSituation[];
    return allSituations.filter((s) => activeCats.includes(s.category));
  }, [visibleThemes]);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      setMissingToken(true);
      return;
    }

    mapboxgl.accessToken = token;

    if (process.env.NODE_ENV === 'development') {
      (window as unknown as Record<string, unknown>).__monitorMap = null;
    }

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

      // Atmosphere
      m.setFog({
        color: 'rgb(15, 26, 46)',
        'high-color': 'rgb(36, 60, 100)',
        'horizon-blend': 0.15,
        'space-color': 'rgb(6, 10, 20)',
        'star-intensity': 0.5,
      });

      // Land
      m.setPaintProperty('land', 'background-color', '#1A2540');
      m.setPaintProperty('landuse', 'fill-color', '#1C2744');
      m.setPaintProperty('national-park', 'fill-color', '#1B2642');
      m.setPaintProperty('land-structure-polygon', 'fill-color', '#1A2540');

      // Water
      m.setPaintProperty('water', 'fill-color', '#0F1A2E');
      m.setPaintProperty('waterway', 'line-color', '#0D1830');

      // Borders
      m.setPaintProperty('admin-0-boundary', 'line-color', '#334155');
      m.setPaintProperty('admin-0-boundary', 'line-width', 0.8);
      m.setPaintProperty('admin-0-boundary-bg', 'line-color', '#1E293B');
      m.setPaintProperty('admin-0-boundary-disputed', 'line-color', '#2A3A52');
      m.setPaintProperty('admin-1-boundary', 'line-color', '#1E293B');
      m.setPaintProperty('admin-1-boundary', 'line-opacity', 0.4);
      m.setPaintProperty('admin-1-boundary-bg', 'line-opacity', 0.2);

      // Hide roads
      const roadLayers = [
        'road-simple', 'road-path', 'road-path-trail',
        'road-path-cycleway-piste', 'road-steps', 'road-pedestrian',
        'road-rail', 'road-label-simple',
        'tunnel-simple', 'tunnel-path', 'tunnel-path-trail',
        'tunnel-path-cycleway-piste', 'tunnel-steps', 'tunnel-pedestrian',
        'bridge-simple', 'bridge-case-simple', 'bridge-path',
        'bridge-path-trail', 'bridge-path-cycleway-piste',
        'bridge-steps', 'bridge-pedestrian', 'bridge-rail',
        'aeroway-polygon', 'aeroway-line',
      ];
      for (const layer of roadLayers) {
        m.setLayerZoomRange(layer, 14, 24);
      }

      m.setLayerZoomRange('building', 15, 24);

      m.setLayoutProperty('settlement-minor-label', 'visibility', 'none');
      m.setLayoutProperty('settlement-subdivision-label', 'visibility', 'none');

      m.setPaintProperty('settlement-major-label', 'text-color', '#64748B');
      m.setPaintProperty('settlement-major-label', 'text-halo-color', '#0B1120');
      m.setPaintProperty('settlement-major-label', 'text-halo-width', 1);

      m.setPaintProperty('country-label', 'text-color', '#536380');
      m.setPaintProperty('country-label', 'text-halo-color', '#0B1120');
      m.setPaintProperty('state-label', 'text-color', '#475569');
      m.setPaintProperty('state-label', 'text-halo-color', '#0B1120');
      m.setPaintProperty('continent-label', 'text-color', '#475569');

      m.setLayoutProperty('poi-label', 'visibility', 'none');
      m.setLayoutProperty('airport-label', 'visibility', 'none');
      m.setLayoutProperty('natural-point-label', 'visibility', 'none');
      m.setLayoutProperty('natural-line-label', 'visibility', 'none');
      m.setLayoutProperty('waterway-label', 'visibility', 'none');

      m.setPaintProperty('water-line-label', 'text-color', '#1A2A45');
      m.setPaintProperty('water-point-label', 'text-color', '#1A2A45');

      // Add diamond image for market markers
      m.addImage('market-diamond', createDiamondImage(), { sdf: true });

      // Data layers
      addSituationLayers(m);
      addEventLayers(m);
      addMarketLayers(m);
      addEarthquakeLayers(m);
      addTerminatorLayers(m);
      layersReady.current = true;

      if (process.env.NODE_ENV === 'development') {
        (window as unknown as Record<string, unknown>).__monitorMap = m;
      }

      // --- Click handlers ---

      // Click on individual event
      m.on('click', 'event-points', (e) => {
        if (!e.features?.[0]) return;
        const props = e.features[0].properties!;
        const event: GdeltEvent = {
          id: props.id,
          title: props.title,
          category: props.category,
          severity: props.severity,
          lat: (e.features[0].geometry as GeoJSON.Point).coordinates[1],
          lng: (e.features[0].geometry as GeoJSON.Point).coordinates[0],
          timestamp: props.timestamp,
          summary: props.summary,
          sources: JSON.parse(props.sources || '[]'),
          tone: props.tone,
          region: props.region,
        };
        onEventClickRef.current?.(event);
      });

      // Click on cluster -> zoom in
      m.on('click', 'event-clusters', (e) => {
        const features = m.queryRenderedFeatures(e.point, { layers: ['event-clusters'] });
        if (!features[0]) return;
        const clusterId = features[0].properties!.cluster_id;
        (m.getSource('events') as mapboxgl.GeoJSONSource).getClusterExpansionZoom(
          clusterId,
          (err, zoom) => {
            if (err || zoom == null) return;
            m.easeTo({
              center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number],
              zoom,
            });
          },
        );
      });

      // Click on market (now uses market-markers symbol layer)
      m.on('click', 'market-markers', (e) => {
        if (!e.features?.[0]) return;
        const props = e.features[0].properties!;
        const market: PolymarketMarket = {
          id: props.id,
          title: props.title,
          category: props.category,
          probability: props.probability,
          volume: props.volume,
          volumeRaw: props.volumeRaw,
          lat: (e.features[0].geometry as GeoJSON.Point).coordinates[1],
          lng: (e.features[0].geometry as GeoJSON.Point).coordinates[0],
          url: props.url,
          lastUpdated: props.lastUpdated,
          outcomes: JSON.parse(props.outcomes || '[]'),
          outcomePrices: JSON.parse(props.outcomePrices || '[]'),
          liquidity: props.liquidity,
          endDate: props.endDate,
        };
        onMarketClickRef.current?.(market);
      });

      // Click on earthquake
      m.on('click', 'earthquake-circles', (e) => {
        if (!e.features?.[0]) return;
        const props = e.features[0].properties!;
        const eq: UsgsEarthquake = {
          id: props.id,
          title: props.title,
          magnitude: props.magnitude,
          magType: props.magType,
          depth: props.depth,
          lat: (e.features[0].geometry as GeoJSON.Point).coordinates[1],
          lng: (e.features[0].geometry as GeoJSON.Point).coordinates[0],
          place: props.place,
          timestamp: props.timestamp,
          tsunami: props.tsunami === true || props.tsunami === 'true',
          felt: props.felt ?? null,
          significance: props.significance,
          alert: props.alert || null,
          url: props.url,
        };
        onEarthquakeClickRef.current?.(eq);
      });

      // Click on situation
      m.on('click', 'situation-circles', (e) => {
        if (!e.features?.[0]) return;
        const props = e.features[0].properties!;
        try {
          const situation: OngoingSituation = JSON.parse(props.situationData);
          onSituationClickRef.current?.(situation);
        } catch {
          // Invalid data
        }
      });

      // Click on map background -> close panel
      m.on('click', (e) => {
        const hitFeatures = m.queryRenderedFeatures(e.point, {
          layers: ['event-points', 'event-clusters', 'market-markers', 'market-labels', 'earthquake-circles', 'situation-circles'],
        });
        if (hitFeatures.length === 0) {
          onMapClickRef.current?.();
        }
      });

      // Cursor styles
      m.on('mouseenter', 'event-points', () => { m.getCanvas().style.cursor = 'pointer'; });
      m.on('mouseleave', 'event-points', () => { m.getCanvas().style.cursor = ''; });
      m.on('mouseenter', 'event-clusters', () => { m.getCanvas().style.cursor = 'pointer'; });
      m.on('mouseleave', 'event-clusters', () => { m.getCanvas().style.cursor = ''; });
      m.on('mouseenter', 'market-markers', () => { m.getCanvas().style.cursor = 'pointer'; });
      m.on('mouseleave', 'market-markers', () => { m.getCanvas().style.cursor = ''; });
      m.on('mouseenter', 'earthquake-circles', () => { m.getCanvas().style.cursor = 'pointer'; });
      m.on('mouseleave', 'earthquake-circles', () => { m.getCanvas().style.cursor = ''; });
      m.on('mouseenter', 'situation-circles', () => { m.getCanvas().style.cursor = 'pointer'; });
      m.on('mouseleave', 'situation-circles', () => { m.getCanvas().style.cursor = ''; });

      setMapReady(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resize map when container dimensions change
  useEffect(() => {
    if (!mapContainer.current) return;
    const ro = new ResizeObserver(() => {
      map.current?.resize();
    });
    ro.observe(mapContainer.current);
    return () => ro.disconnect();
  }, []);

  // Update terminator periodically
  useEffect(() => {
    if (!layersReady.current) return;
    const interval = setInterval(() => {
      if (map.current) updateTerminator(map.current);
    }, 60_000);
    return () => clearInterval(interval);
  }, [mapReady]);

  // Update event source data when filtered events change
  useEffect(() => {
    if (!map.current || !layersReady.current) return;
    const source = map.current.getSource('events') as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData(eventsToGeoJSON(filteredEvents));
    }
  }, [filteredEvents, mapReady]);

  // Update market source data when filtered markets change
  useEffect(() => {
    if (!map.current || !layersReady.current) return;
    const source = map.current.getSource('markets') as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData(marketsToGeoJSON(filteredMarkets));
    }
  }, [filteredMarkets, mapReady]);

  // Update situation source data when filtered situations change
  useEffect(() => {
    if (!map.current || !layersReady.current) return;
    const source = map.current.getSource('situations') as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData(situationsToGeoJSON(filteredSituations));
    }
  }, [filteredSituations, mapReady]);

  // Update earthquake source data + visibility
  useEffect(() => {
    if (!map.current || !layersReady.current) return;
    const m = map.current;

    // Update earthquake data
    const source = m.getSource('earthquakes') as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData(earthquakesToGeoJSON(earthquakes));
    }

    // Toggle earthquake layer visibility based on disasters theme
    const eqVisible = visibleThemes.disasters;
    for (const layerId of EARTHQUAKE_LAYERS) {
      try {
        m.setLayoutProperty(layerId, 'visibility', eqVisible ? 'visible' : 'none');
      } catch {
        // Layer may not exist yet
      }
    }
  }, [earthquakes, visibleThemes.disasters, mapReady]);

  // Update related lines when selection changes
  useEffect(() => {
    if (!map.current || !layersReady.current) return;
    const source = map.current.getSource('related-lines') as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;

    if (!selectedEventCoords || !relatedMarkets || relatedMarkets.length === 0) {
      source.setData({ type: 'FeatureCollection', features: [] });
      return;
    }

    const features = relatedMarkets.map((m, i) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [selectedEventCoords.lng, selectedEventCoords.lat],
          [m.lng, m.lat],
        ],
      },
      properties: { id: `line_${i}` },
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
