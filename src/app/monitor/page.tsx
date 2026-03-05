'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { GdeltEvent } from '@/lib/monitor/events';
import type { PolymarketMarket } from '@/lib/monitor/polymarket';
import { findRelatedMarkets } from '@/lib/monitor/polymarket';
import type { UsgsEarthquake } from '@/lib/monitor/usgs';
import type { MapItem, OngoingSituation } from '@/lib/monitor/types';
import { type ThemeKey, computeThemeCounts } from '@/lib/monitor/themes';
import ongoingSituationsData from '@/app/monitor/data/ongoing-situations.json';

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

export default function MonitorPage() {
  const [selectedItem, setSelectedItem] = useState<MapItem | null>(null);
  const [allEvents, setAllEvents] = useState<GdeltEvent[]>([]);
  const [allMarkets, setAllMarkets] = useState<PolymarketMarket[]>([]);
  const [allEarthquakes, setAllEarthquakes] = useState<UsgsEarthquake[]>([]);
  const [visibleThemes, setVisibleThemes] = useState<Record<ThemeKey, boolean>>({
    conflicts: true,
    elections: true,
    economy: true,
    disasters: true,
    infrastructure: true,
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

  // Fetch events
  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch('/api/events/geopolitical');
        if (res.ok) {
          const events: GdeltEvent[] = await res.json();
          setAllEvents(events);
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
          const markets: PolymarketMarket[] = await res.json();
          setAllMarkets(markets);
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
          const quakes: UsgsEarthquake[] = await res.json();
          setAllEarthquakes(quakes);
        }
      } catch {
        // Silent fail
      }
    }
    loadEarthquakes();
    const interval = setInterval(loadEarthquakes, 10 * 60_000);
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
          themeCounts={themeCounts}
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
            events={allEvents}
            markets={allMarkets}
            earthquakes={allEarthquakes}
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
