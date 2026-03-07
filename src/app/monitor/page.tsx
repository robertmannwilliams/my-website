'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { GdeltEvent } from '@/lib/monitor/events';
import type { PolymarketMarket } from '@/lib/monitor/polymarket';
import { findRelatedMarkets } from '@/lib/monitor/polymarket';
import type { UsgsEarthquake } from '@/lib/monitor/usgs';
import type {
  ElectionCalendarItem,
  MapItem,
  NotamZone,
  OngoingSituation,
  ShippingChokepoint,
  SituationRoomConfig,
} from '@/lib/monitor/types';
import { type ThemeKey, computeThemeCounts } from '@/lib/monitor/themes';
import type { MonitorResponse, MonitorResponseMeta } from '@/lib/monitor/response';
import ongoingSituationsData from '@/app/monitor/data/ongoing-situations.json';
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

const situations = ongoingSituationsData as OngoingSituation[];
const situationRooms = roomsData as SituationRoomConfig[];

export default function MonitorPage() {
  const [selectedItem, setSelectedItem] = useState<MapItem | null>(null);
  const [activeRoom, setActiveRoom] = useState<SituationRoomConfig | null>(null);
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
  const [visibleThemes, setVisibleThemes] = useState<Record<ThemeKey, boolean>>({
    conflicts: true,
    elections: true,
    economy: true,
    disasters: true,
    infrastructure: true,
  });
  const [visibleLayers, setVisibleLayers] = useState<Record<'notams' | 'shipping' | 'elections', boolean>>({
    notams: true,
    shipping: true,
    elections: true,
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

  const handleSituationClick = useCallback((situation: OngoingSituation) => {
    setSelectedItem({ type: 'situation', data: situation });
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedItem(null);
  }, []);

  const toggleTheme = useCallback((key: ThemeKey) => {
    setVisibleThemes((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const toggleLayer = useCallback((key: 'notams' | 'shipping' | 'elections') => {
    setVisibleLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleSituationRoomSelect = useCallback((roomId: string) => {
    const room = situationRooms.find((r) => r.id === roomId);
    if (!room) return;

    setActiveRoom(room);
    setSelectedItem({ type: 'room', data: room });

    setVisibleThemes({
      conflicts: room.activeThemes.includes('conflicts'),
      elections: room.activeThemes.includes('elections'),
      economy: room.activeThemes.includes('economy'),
      disasters: room.activeThemes.includes('disasters'),
      infrastructure: room.activeThemes.includes('infrastructure'),
    });

    setVisibleLayers({
      notams: room.activeLayers.includes('notams'),
      shipping: room.activeLayers.includes('shipping'),
      elections: room.activeLayers.includes('elections'),
    });
  }, []);

  // Fetch events
  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch('/api/events/geopolitical');
        if (res.ok) {
          const payload = (await res.json()) as MonitorResponse<GdeltEvent[]> | GdeltEvent[];
          if (Array.isArray(payload)) {
            setAllEvents(payload);
          } else {
            setAllEvents(payload.items || []);
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
            setAllMarkets(payload);
          } else {
            setAllMarkets(payload.items || []);
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

  // Compute theme counts
  const themeCounts = useMemo(
    () => computeThemeCounts(allEvents, allMarkets, situations, allEarthquakes),
    [allEvents, allMarkets, allEarthquakes],
  );

  // Compute related markets when an event is selected
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
      {/* Top news ticker */}
      <NewsTicker />

      {/* Main content area */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Left filter panel */}
        <FilterPanel
          visibleThemes={visibleThemes}
          onToggleTheme={toggleTheme}
          visibleLayers={visibleLayers}
          onToggleLayer={toggleLayer}
          situationRooms={situationRooms}
          activeSituationRoomId={activeRoom?.id || null}
          onSelectSituationRoom={handleSituationRoomSelect}
          themeCounts={themeCounts}
          sourceHealth={{
            events: eventsMeta,
            markets: marketsMeta,
            disasters: disastersMeta,
            notams: layersMeta.notams,
            shipping: layersMeta.shipping,
            elections: layersMeta.elections,
          }}
        />

        {/* Map area + Event detail panel */}
        <div style={{ flex: 1, position: 'relative', minWidth: 0, overflow: 'hidden' }}>
          <MonitorMap
            onEventClick={handleEventClick}
            onMarketClick={handleMarketClick}
            onEarthquakeClick={handleEarthquakeClick}
            onSituationClick={handleSituationClick}
            onMapClick={handleClosePanel}
            selectedEventCoords={
              selectedItem?.type === 'event'
                ? { lat: selectedItem.data.lat, lng: selectedItem.data.lng }
                : null
            }
            relatedMarkets={relatedMarkets}
            visibleThemes={visibleThemes}
            visibleLayers={visibleLayers}
            activeRoom={activeRoom}
            events={allEvents}
            markets={allMarkets}
            earthquakes={allEarthquakes}
            notamZones={notamZones}
            shippingChokepoints={shippingChokepoints}
            elections={elections}
          />
          <EventDetailPanel
            item={selectedItem}
            relatedMarkets={relatedMarkets}
            onClose={handleClosePanel}
          />
        </div>
      </div>

      {/* Bottom price ticker */}
      <PriceTicker />
    </div>
  );
}
