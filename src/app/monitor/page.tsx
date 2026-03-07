'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { GdeltEvent } from '@/lib/monitor/events';
import type { PolymarketMarket } from '@/lib/monitor/polymarket';
import { findRelatedMarkets } from '@/lib/monitor/polymarket';
import type { UsgsEarthquake } from '@/lib/monitor/usgs';
import type {
  ElectionCalendarItem,
  MapItem,
  MapSelectionCandidate,
  NotamZone,
  ShippingChokepoint,
  SignalKey,
  SituationRoomConfig,
  WatchZone,
} from '@/lib/monitor/types';
import { type ThemeKey, computeThemeCounts } from '@/lib/monitor/themes';
import type { MonitorResponse, MonitorResponseMeta } from '@/lib/monitor/response';
import watchZonesData from '@/app/monitor/data/watch-zones.json';
import roomsData from '@/app/monitor/data/situation-rooms.json';

const MonitorMap = dynamic(() => import('@/components/monitor/MonitorMap'), {
  ssr: false,
});

const PriceTicker = dynamic(() => import('@/components/monitor/PriceTicker'), {
  ssr: false,
});

const NewsTicker = dynamic(() => import('@/components/monitor/NewsTicker'), {
  ssr: false,
});

const EventDetailPanel = dynamic(
  () => import('@/components/monitor/EventDetailPanel'),
  { ssr: false },
);

const FilterPanel = dynamic(
  () => import('@/components/monitor/FilterPanel'),
  { ssr: false },
);

const watchZones = watchZonesData as WatchZone[];
const situationRooms = roomsData as SituationRoomConfig[];

function makeDefaultThemes(): Record<ThemeKey, boolean> {
  return {
    conflicts: true,
    elections: true,
    economy: true,
    disasters: true,
    infrastructure: true,
  };
}

function makeDefaultSignals(): Record<SignalKey, boolean> {
  return {
    events: true,
    markets: true,
    disasters: true,
    infrastructure_overlays: true,
    watch_zones: true,
  };
}

function makeDefaultWatchZoneVisibility(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const zone of watchZones) out[zone.id] = true;
  return out;
}

function roomSignalVisibility(room: SituationRoomConfig): Record<SignalKey, boolean> {
  const out: Record<SignalKey, boolean> = {
    events: false,
    markets: false,
    disasters: false,
    infrastructure_overlays: false,
    watch_zones: false,
  };
  const defaults = room.defaultSignalTypes || [];
  if (defaults.length === 0) return makeDefaultSignals();
  for (const key of defaults) out[key] = true;
  return out;
}

function roomWatchZoneVisibility(room: SituationRoomConfig): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const zone of watchZones) out[zone.id] = false;

  const configured = room.defaultWatchZoneIds || [];
  if (configured.length > 0) {
    for (const id of configured) out[id] = true;
    return out;
  }

  for (const zone of watchZones) {
    if (zone.roomIds.includes(room.id)) out[zone.id] = true;
  }

  return out;
}

function roomThemeVisibility(room: SituationRoomConfig): Record<ThemeKey, boolean> {
  return {
    conflicts: room.activeThemes.includes('conflicts'),
    elections: room.activeThemes.includes('elections'),
    economy: room.activeThemes.includes('economy'),
    disasters: room.activeThemes.includes('disasters'),
    infrastructure: room.activeThemes.includes('infrastructure'),
  };
}

function getInitialRoomFromStorage(): SituationRoomConfig | null {
  if (typeof window === 'undefined') return null;
  const saved = window.localStorage.getItem('monitor:last-focus');
  if (!saved || saved === 'global') return null;
  const [kind, roomId] = saved.split(':');
  if (kind !== 'room' || !roomId) return null;
  return situationRooms.find((room) => room.id === roomId) || null;
}

function normalizeEventShape(event: GdeltEvent): GdeltEvent {
  const topicTags = Array.isArray(event.topicTags) ? event.topicTags : [];
  const signalScore = Number(event.signalScore) || 0;
  return {
    ...event,
    topicTags,
    signalScore,
    mapPriority: Number(event.mapPriority) || signalScore,
  };
}

function normalizeMarketShape(market: PolymarketMarket): PolymarketMarket {
  const topicTags = Array.isArray(market.topicTags) ? market.topicTags : [];
  const signalScore = Number(market.signalScore) || 0;
  return {
    ...market,
    topicTags,
    signalScore,
    mapPriority: Number(market.mapPriority) || signalScore,
    linkConfidence: market.linkConfidence != null ? Number(market.linkConfidence) : undefined,
  };
}

export default function MonitorPage() {
  const initialRoom = getInitialRoomFromStorage();

  const [selectedItem, setSelectedItem] = useState<MapItem | null>(
    () => (initialRoom ? { type: 'room', data: initialRoom } : null),
  );
  const [activeRoom, setActiveRoom] = useState<SituationRoomConfig | null>(initialRoom);
  const [focusMode, setFocusMode] = useState<'global' | 'room'>(initialRoom ? 'room' : 'global');
  const [allEvents, setAllEvents] = useState<GdeltEvent[]>([]);
  const [allMarkets, setAllMarkets] = useState<PolymarketMarket[]>([]);
  const [allEarthquakes, setAllEarthquakes] = useState<UsgsEarthquake[]>([]);
  const [notamZones, setNotamZones] = useState<NotamZone[]>([]);
  const [shippingChokepoints, setShippingChokepoints] = useState<ShippingChokepoint[]>([]);
  const [elections, setElections] = useState<ElectionCalendarItem[]>([]);
  const [eventsMeta, setEventsMeta] = useState<MonitorResponseMeta | null>(null);
  const [marketsMeta, setMarketsMeta] = useState<MonitorResponseMeta | null>(null);
  const [disastersMeta, setDisastersMeta] = useState<MonitorResponseMeta | null>(null);
  const [layersMeta, setLayersMeta] = useState<{
    notams: MonitorResponseMeta | null;
    shipping: MonitorResponseMeta | null;
    elections: MonitorResponseMeta | null;
  }>({
    notams: null,
    shipping: null,
    elections: null,
  });
  const [visibleThemes, setVisibleThemes] = useState<Record<ThemeKey, boolean>>(
    () => (initialRoom ? roomThemeVisibility(initialRoom) : makeDefaultThemes()),
  );
  const [visibleSignals, setVisibleSignals] = useState<Record<SignalKey, boolean>>(
    () => (initialRoom ? roomSignalVisibility(initialRoom) : makeDefaultSignals()),
  );
  const [visibleWatchZones, setVisibleWatchZones] = useState<Record<string, boolean>>(
    () => (initialRoom ? roomWatchZoneVisibility(initialRoom) : makeDefaultWatchZoneVisibility()),
  );

  const globalSnapshotRef = useRef({
    themes: makeDefaultThemes(),
    signals: makeDefaultSignals(),
    watchZones: makeDefaultWatchZoneVisibility(),
  });

  const handleEventClick = useCallback((event: GdeltEvent) => {
    setSelectedItem({ type: 'event', data: event });
  }, []);

  const handleMarketClick = useCallback((market: PolymarketMarket) => {
    setSelectedItem({ type: 'market', data: market });
  }, []);

  const handleEarthquakeClick = useCallback((eq: UsgsEarthquake) => {
    setSelectedItem({ type: 'earthquake', data: eq });
  }, []);

  const handleWatchZoneClick = useCallback((watchZone: WatchZone) => {
    setSelectedItem({ type: 'watch_zone', data: watchZone });
  }, []);

  const handleSelectionCandidates = useCallback((title: string, candidates: MapSelectionCandidate[]) => {
    if (candidates.length === 1) {
      const candidate = candidates[0];
      if (candidate.type === 'event') setSelectedItem({ type: 'event', data: candidate.data });
      if (candidate.type === 'market') setSelectedItem({ type: 'market', data: candidate.data });
      if (candidate.type === 'earthquake') setSelectedItem({ type: 'earthquake', data: candidate.data });
      if (candidate.type === 'watch_zone') setSelectedItem({ type: 'watch_zone', data: candidate.data });
      return;
    }

    setSelectedItem({
      type: 'selection',
      data: {
        title,
        candidates,
      },
    });
  }, []);

  const handleSelectCandidate = useCallback((candidate: MapSelectionCandidate) => {
    if (candidate.type === 'event') setSelectedItem({ type: 'event', data: candidate.data });
    if (candidate.type === 'market') setSelectedItem({ type: 'market', data: candidate.data });
    if (candidate.type === 'earthquake') setSelectedItem({ type: 'earthquake', data: candidate.data });
    if (candidate.type === 'watch_zone') setSelectedItem({ type: 'watch_zone', data: candidate.data });
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedItem(null);
  }, []);

  const toggleTheme = useCallback((key: ThemeKey) => {
    setVisibleThemes((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (focusMode === 'global') globalSnapshotRef.current.themes = next;
      return next;
    });
  }, [focusMode]);

  const toggleSignal = useCallback((key: SignalKey) => {
    setVisibleSignals((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (focusMode === 'global') globalSnapshotRef.current.signals = next;
      return next;
    });
  }, [focusMode]);

  const toggleWatchZone = useCallback((zoneId: string) => {
    setVisibleWatchZones((prev) => {
      const next = { ...prev, [zoneId]: !prev[zoneId] };
      if (focusMode === 'global') globalSnapshotRef.current.watchZones = next;
      return next;
    });
  }, [focusMode]);

  const handleSelectGlobalFocus = useCallback(() => {
    setFocusMode('global');
    setActiveRoom(null);
    setVisibleThemes(globalSnapshotRef.current.themes);
    setVisibleSignals(globalSnapshotRef.current.signals);
    setVisibleWatchZones(globalSnapshotRef.current.watchZones);
    setSelectedItem(null);
    window.localStorage.setItem('monitor:last-focus', 'global');
  }, []);

  const handleSituationRoomSelect = useCallback((roomId: string) => {
    const room = situationRooms.find((r) => r.id === roomId);
    if (!room) return;

    if (focusMode === 'global') {
      globalSnapshotRef.current = {
        themes: visibleThemes,
        signals: visibleSignals,
        watchZones: visibleWatchZones,
      };
    }

    setFocusMode('room');
    setActiveRoom(room);
    setSelectedItem({ type: 'room', data: room });

    setVisibleThemes(roomThemeVisibility(room));

    setVisibleSignals(roomSignalVisibility(room));
    setVisibleWatchZones(roomWatchZoneVisibility(room));

    window.localStorage.setItem('monitor:last-focus', `room:${room.id}`);
  }, [focusMode, visibleThemes, visibleSignals, visibleWatchZones]);

  // Fetch events
  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch('/api/events/geopolitical');
        if (res.ok) {
          const payload = (await res.json()) as MonitorResponse<GdeltEvent[]> | GdeltEvent[];
          if (Array.isArray(payload)) {
            setAllEvents(payload.map(normalizeEventShape));
          } else {
            setAllEvents((payload.items || []).map(normalizeEventShape));
            setEventsMeta(payload.meta || null);
          }
        }
      } catch {
        // Silent fail
      }
    }
    loadEvents();
    const interval = setInterval(loadEvents, 5 * 60_000);
    return () => clearInterval(interval);
  }, []);

  // Fetch markets
  useEffect(() => {
    async function loadMarkets() {
      try {
        const res = await fetch('/api/markets/polymarket');
        if (res.ok) {
          const payload = (await res.json()) as MonitorResponse<PolymarketMarket[]> | PolymarketMarket[];
          if (Array.isArray(payload)) {
            setAllMarkets(payload.map(normalizeMarketShape));
          } else {
            setAllMarkets((payload.items || []).map(normalizeMarketShape));
            setMarketsMeta(payload.meta || null);
          }
        }
      } catch {
        // Silent fail
      }
    }
    loadMarkets();
    const interval = setInterval(loadMarkets, 10 * 60_000);
    return () => clearInterval(interval);
  }, []);

  // Fetch earthquakes
  useEffect(() => {
    async function loadEarthquakes() {
      try {
        const res = await fetch('/api/events/disasters');
        if (res.ok) {
          const payload = (await res.json()) as MonitorResponse<UsgsEarthquake[]> | UsgsEarthquake[];
          if (Array.isArray(payload)) {
            setAllEarthquakes(payload);
          } else {
            setAllEarthquakes(payload.items || []);
            setDisastersMeta(payload.meta || null);
          }
        }
      } catch {
        // Silent fail
      }
    }
    loadEarthquakes();
    const interval = setInterval(loadEarthquakes, 10 * 60_000);
    return () => clearInterval(interval);
  }, []);

  // Fetch NOTAM layer
  useEffect(() => {
    async function loadNotams() {
      try {
        const res = await fetch('/api/layers/notams');
        if (!res.ok) return;
        const payload = (await res.json()) as MonitorResponse<NotamZone[]>;
        setNotamZones(payload.items || []);
        setLayersMeta((prev) => ({ ...prev, notams: payload.meta || null }));
      } catch {
        // Silent fail
      }
    }
    loadNotams();
    const interval = setInterval(loadNotams, 15 * 60_000);
    return () => clearInterval(interval);
  }, []);

  // Fetch shipping layer
  useEffect(() => {
    async function loadShipping() {
      try {
        const res = await fetch('/api/layers/shipping');
        if (!res.ok) return;
        const payload = (await res.json()) as MonitorResponse<ShippingChokepoint[]>;
        setShippingChokepoints(payload.items || []);
        setLayersMeta((prev) => ({ ...prev, shipping: payload.meta || null }));
      } catch {
        // Silent fail
      }
    }
    loadShipping();
    const interval = setInterval(loadShipping, 10 * 60_000);
    return () => clearInterval(interval);
  }, []);

  // Fetch elections layer
  useEffect(() => {
    async function loadElections() {
      try {
        const res = await fetch('/api/layers/elections');
        if (!res.ok) return;
        const payload = (await res.json()) as MonitorResponse<ElectionCalendarItem[]>;
        setElections(payload.items || []);
        setLayersMeta((prev) => ({ ...prev, elections: payload.meta || null }));
      } catch {
        // Silent fail
      }
    }
    loadElections();
    const interval = setInterval(loadElections, 60 * 60_000);
    return () => clearInterval(interval);
  }, []);

  const themeCounts = useMemo(
    () => computeThemeCounts(allEvents, allMarkets, allEarthquakes),
    [allEvents, allMarkets, allEarthquakes],
  );

  const signalCounts = useMemo(() => ({
    events: allEvents.length,
    markets: allMarkets.length,
    disasters: allEarthquakes.length,
    infrastructure_overlays: notamZones.length + shippingChokepoints.length + elections.length,
    watch_zones: watchZones.length,
  }), [allEvents.length, allMarkets.length, allEarthquakes.length, notamZones.length, shippingChokepoints.length, elections.length]);

  const relatedMarkets = useMemo(() => {
    if (selectedItem?.type !== 'event') return [];
    return findRelatedMarkets(selectedItem.data, allMarkets);
  }, [selectedItem, allMarkets]);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#0B1120',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: "'Inter', 'Neue Montreal', sans-serif",
      }}
    >
      <NewsTicker />

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <FilterPanel
          focusMode={focusMode}
          activeSituationRoomId={activeRoom?.id || null}
          situationRooms={situationRooms}
          onSelectGlobalFocus={handleSelectGlobalFocus}
          onSelectSituationRoom={handleSituationRoomSelect}
          visibleThemes={visibleThemes}
          onToggleTheme={toggleTheme}
          themeCounts={themeCounts}
          visibleSignals={visibleSignals}
          onToggleSignal={toggleSignal}
          signalCounts={signalCounts}
          watchZones={watchZones}
          visibleWatchZones={visibleWatchZones}
          onToggleWatchZone={toggleWatchZone}
          sourceHealth={{
            events: eventsMeta,
            markets: marketsMeta,
            disasters: disastersMeta,
            notams: layersMeta.notams,
            shipping: layersMeta.shipping,
            elections: layersMeta.elections,
          }}
        />

        <div style={{ flex: 1, position: 'relative', minWidth: 0, overflow: 'hidden' }}>
          <MonitorMap
            onEventClick={handleEventClick}
            onMarketClick={handleMarketClick}
            onEarthquakeClick={handleEarthquakeClick}
            onWatchZoneClick={handleWatchZoneClick}
            onSelectionCandidates={handleSelectionCandidates}
            onMapClick={handleClosePanel}
            selectedEventCoords={
              selectedItem?.type === 'event'
                ? { lat: selectedItem.data.lat, lng: selectedItem.data.lng }
                : null
            }
            relatedMarkets={relatedMarkets}
            visibleThemes={visibleThemes}
            visibleSignals={visibleSignals}
            visibleWatchZones={visibleWatchZones}
            activeRoom={activeRoom}
            events={allEvents}
            markets={allMarkets}
            earthquakes={allEarthquakes}
            notamZones={notamZones}
            shippingChokepoints={shippingChokepoints}
            elections={elections}
            watchZones={watchZones}
          />
          <EventDetailPanel
            item={selectedItem}
            relatedMarkets={relatedMarkets}
            onSelectCandidate={handleSelectCandidate}
            onClose={handleClosePanel}
          />
        </div>
      </div>

      <PriceTicker />
    </div>
  );
}
