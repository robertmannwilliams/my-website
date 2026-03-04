'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { GdeltEvent } from '@/lib/monitor/gdelt';
import type { PolymarketMarket } from '@/lib/monitor/polymarket';
import { findRelatedMarkets } from '@/lib/monitor/polymarket';
import type { UsgsEarthquake } from '@/lib/monitor/usgs';
import type { MapItem } from '@/lib/monitor/types';

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

export default function MonitorPage() {
  const [selectedItem, setSelectedItem] = useState<MapItem | null>(null);
  const [allMarkets, setAllMarkets] = useState<PolymarketMarket[]>([]);
  const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>({
    events: true,
    earthquakes: true,
    markets: true,
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

  const handleClosePanel = useCallback(() => {
    setSelectedItem(null);
  }, []);

  const toggleLayer = useCallback((key: string) => {
    setVisibleLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Fetch markets for related-market lookup
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
        background: '#0A0A0F',
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
        <FilterPanel visibleLayers={visibleLayers} onToggleLayer={toggleLayer} />

        {/* Map area + Event detail panel */}
        <div style={{ flex: 1, position: 'relative', minWidth: 0, overflow: 'hidden' }}>
          <MonitorMap
            onEventClick={handleEventClick}
            onMarketClick={handleMarketClick}
            onEarthquakeClick={handleEarthquakeClick}
            onMapClick={handleClosePanel}
            selectedEventCoords={
              selectedItem?.type === 'event'
                ? { lat: selectedItem.data.lat, lng: selectedItem.data.lng }
                : null
            }
            relatedMarkets={relatedMarkets}
            visibleLayers={visibleLayers}
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
