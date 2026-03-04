'use client';

import { useEffect, useRef, useState, useCallback, memo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { GdeltEvent } from '@/lib/monitor/gdelt';
import type { PolymarketMarket } from '@/lib/monitor/polymarket';
import type { UsgsEarthquake } from '@/lib/monitor/usgs';

interface MonitorMapProps {
  onEventClick?: (event: GdeltEvent) => void;
  onMarketClick?: (market: PolymarketMarket) => void;
  onEarthquakeClick?: (eq: UsgsEarthquake) => void;
  onMapClick?: () => void;
  selectedEventCoords?: { lat: number; lng: number } | null;
  relatedMarkets?: PolymarketMarket[];
  visibleLayers: Record<string, boolean>;
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

  // Cluster circles
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

  // Individual event circles
  m.addLayer({
    id: 'event-points',
    type: 'circle',
    source: 'events',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': [
        'match', ['get', 'severity'],
        'critical', '#FF4444',
        'watch', '#FFAA22',
        '#666680',
      ],
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
      'circle-stroke-color': [
        'match', ['get', 'severity'],
        'critical', 'rgba(255,68,68,0.4)',
        'watch', 'rgba(255,170,34,0.3)',
        'rgba(102,102,128,0.2)',
      ],
    },
  });

  // Critical pulse ring (outer glow)
  m.addLayer({
    id: 'event-pulse',
    type: 'circle',
    source: 'events',
    filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'severity'], 'critical']],
    paint: {
      'circle-color': 'transparent',
      'circle-radius': 14,
      'circle-stroke-width': 2,
      'circle-stroke-color': 'rgba(255,68,68,0.3)',
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

  // Purple circle background
  m.addLayer({
    id: 'market-circles',
    type: 'circle',
    source: 'markets',
    paint: {
      'circle-color': '#AA66FF',
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        0, 10,
        5, 16,
        10, 20,
      ],
      'circle-opacity': 0.85,
      'circle-stroke-width': 1.5,
      'circle-stroke-color': 'rgba(170,102,255,0.4)',
    },
  });

  // Probability % text inside circle
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

  // Main earthquake circles — radius/color driven by magnitude
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

  // Pulse ring for recent quakes (< 2h old)
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

  // Magnitude labels for M5.5+
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

// Layer group mapping for visibility toggling
const LAYER_GROUPS: Record<string, string[]> = {
  events: ['event-clusters', 'event-cluster-count', 'event-points', 'event-pulse'],
  markets: ['market-circles', 'market-labels', 'related-lines'],
  earthquakes: ['earthquake-circles', 'earthquake-pulse', 'earthquake-labels'],
};

function MonitorMap({
  onEventClick,
  onMarketClick,
  onEarthquakeClick,
  onMapClick,
  selectedEventCoords,
  relatedMarkets,
  visibleLayers,
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
  const onMapClickRef = useRef(onMapClick);
  useEffect(() => { onEventClickRef.current = onEventClick; }, [onEventClick]);
  useEffect(() => { onMarketClickRef.current = onMarketClick; }, [onMarketClick]);
  useEffect(() => { onEarthquakeClickRef.current = onEarthquakeClick; }, [onEarthquakeClick]);
  useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);

  const loadEvents = useCallback(async () => {
    if (!map.current) return;
    try {
      const res = await fetch('/api/events/geopolitical');
      if (!res.ok) return;
      const events: GdeltEvent[] = await res.json();
      const source = map.current.getSource('events') as mapboxgl.GeoJSONSource | undefined;
      if (source) {
        source.setData(eventsToGeoJSON(events));
      }
    } catch {
      // Silent fail
    }
  }, []);

  const loadMarkets = useCallback(async () => {
    if (!map.current) return;
    try {
      const res = await fetch('/api/markets/polymarket');
      if (!res.ok) return;
      const markets: PolymarketMarket[] = await res.json();
      const source = map.current.getSource('markets') as mapboxgl.GeoJSONSource | undefined;
      if (source) {
        source.setData(marketsToGeoJSON(markets));
      }
    } catch {
      // Silent fail
    }
  }, []);

  const loadEarthquakes = useCallback(async () => {
    if (!map.current) return;
    try {
      const res = await fetch('/api/events/disasters');
      if (!res.ok) return;
      const quakes: UsgsEarthquake[] = await res.json();
      const source = map.current.getSource('earthquakes') as mapboxgl.GeoJSONSource | undefined;
      if (source) {
        source.setData(earthquakesToGeoJSON(quakes));
      }
    } catch {
      // Silent fail
    }
  }, []);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      setMissingToken(true);
      return;
    }

    mapboxgl.accessToken = token;

    // Expose map for debugging in dev
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
        color: 'rgb(10, 10, 15)',
        'high-color': 'rgb(20, 20, 40)',
        'horizon-blend': 0.08,
        'space-color': 'rgb(8, 8, 18)',
        'star-intensity': 0.4,
      });

      // --- Land: desaturate to near-black ---
      m.setPaintProperty('land', 'background-color', '#0C0C14');
      m.setPaintProperty('landuse', 'fill-color', '#0E0E16');
      m.setPaintProperty('national-park', 'fill-color', '#0D0D15');
      m.setPaintProperty('land-structure-polygon', 'fill-color', '#0C0C14');

      // --- Water: very dark navy ---
      m.setPaintProperty('water', 'fill-color', '#080818');
      m.setPaintProperty('waterway', 'line-color', '#0A0A20');

      // --- Country borders: subtle but visible ---
      m.setPaintProperty('admin-0-boundary', 'line-color', '#2A2A35');
      m.setPaintProperty('admin-0-boundary', 'line-width', 0.8);
      m.setPaintProperty('admin-0-boundary-bg', 'line-color', '#1A1A25');
      m.setPaintProperty('admin-0-boundary-disputed', 'line-color', '#222230');
      m.setPaintProperty('admin-1-boundary', 'line-color', '#1A1A25');
      m.setPaintProperty('admin-1-boundary', 'line-opacity', 0.4);
      m.setPaintProperty('admin-1-boundary-bg', 'line-opacity', 0.2);

      // --- Hide roads at all zoom levels (show only at very high zoom) ---
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

      // --- Hide buildings until high zoom ---
      m.setLayerZoomRange('building', 15, 24);

      // --- Reduce label density ---
      m.setLayoutProperty('settlement-minor-label', 'visibility', 'none');
      m.setLayoutProperty('settlement-subdivision-label', 'visibility', 'none');

      // City label color: muted
      m.setPaintProperty('settlement-major-label', 'text-color', '#555568');
      m.setPaintProperty('settlement-major-label', 'text-halo-color', '#0A0A0F');
      m.setPaintProperty('settlement-major-label', 'text-halo-width', 1);

      // Country & state labels: muted
      m.setPaintProperty('country-label', 'text-color', '#444458');
      m.setPaintProperty('country-label', 'text-halo-color', '#0A0A0F');
      m.setPaintProperty('state-label', 'text-color', '#333345');
      m.setPaintProperty('state-label', 'text-halo-color', '#0A0A0F');
      m.setPaintProperty('continent-label', 'text-color', '#333345');

      // Reduce POI and other labels
      m.setLayoutProperty('poi-label', 'visibility', 'none');
      m.setLayoutProperty('airport-label', 'visibility', 'none');
      m.setLayoutProperty('natural-point-label', 'visibility', 'none');
      m.setLayoutProperty('natural-line-label', 'visibility', 'none');
      m.setLayoutProperty('waterway-label', 'visibility', 'none');

      // Water labels: very subtle
      m.setPaintProperty('water-line-label', 'text-color', '#1A1A30');
      m.setPaintProperty('water-point-label', 'text-color', '#1A1A30');

      // --- Data layers ---
      addEventLayers(m);
      addMarketLayers(m);
      addEarthquakeLayers(m);
      layersReady.current = true;

      // Expose map for debugging in dev
      if (process.env.NODE_ENV === 'development') {
        (window as unknown as Record<string, unknown>).__monitorMap = m;
      }

      // Load data after layers are set up
      loadEvents();
      loadMarkets();
      loadEarthquakes();

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

      // Click on market
      m.on('click', 'market-circles', (e) => {
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

      // Click on map background -> close panel
      m.on('click', (e) => {
        const hitFeatures = m.queryRenderedFeatures(e.point, {
          layers: ['event-points', 'event-clusters', 'market-circles', 'market-labels', 'earthquake-circles'],
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
      m.on('mouseenter', 'market-circles', () => { m.getCanvas().style.cursor = 'pointer'; });
      m.on('mouseleave', 'market-circles', () => { m.getCanvas().style.cursor = ''; });
      m.on('mouseenter', 'earthquake-circles', () => { m.getCanvas().style.cursor = 'pointer'; });
      m.on('mouseleave', 'earthquake-circles', () => { m.getCanvas().style.cursor = ''; });

      setMapReady(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [loadEvents, loadMarkets, loadEarthquakes]);

  // Resize map when container dimensions change (e.g. dynamic imports settling)
  useEffect(() => {
    if (!mapContainer.current) return;
    const ro = new ResizeObserver(() => {
      map.current?.resize();
    });
    ro.observe(mapContainer.current);
    return () => ro.disconnect();
  }, []);

  // Refresh data periodically
  useEffect(() => {
    if (!layersReady.current) return;
    const evtInterval = setInterval(loadEvents, 5 * 60_000);
    const mktInterval = setInterval(loadMarkets, 10 * 60_000);
    const eqInterval = setInterval(loadEarthquakes, 10 * 60_000);
    return () => {
      clearInterval(evtInterval);
      clearInterval(mktInterval);
      clearInterval(eqInterval);
    };
  }, [loadEvents, loadMarkets, loadEarthquakes]);

  // Layer visibility toggling
  useEffect(() => {
    if (!map.current || !layersReady.current) return;
    const m = map.current;

    for (const [groupKey, layerIds] of Object.entries(LAYER_GROUPS)) {
      const visible = visibleLayers[groupKey] !== false;
      for (const layerId of layerIds) {
        try {
          m.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
        } catch {
          // Layer may not exist yet
        }
      }
    }
  }, [visibleLayers]);

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
  }, [selectedEventCoords, relatedMarkets]);

  if (missingToken) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0A0A0F',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <span style={{ color: '#6B6B78', fontSize: 13 }}>
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
            background: '#0A0A0F',
            zIndex: 5,
            gap: 12,
            transition: 'opacity 400ms ease',
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              border: '2px solid #2A2A35',
              borderTopColor: '#4A9EFF',
              borderRadius: '50%',
              animation: 'monitorSpin 0.8s linear infinite',
            }}
          />
          <span style={{ color: '#6B6B78', fontSize: 12 }}>Loading map...</span>
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
