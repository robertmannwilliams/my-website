'use client';

import { memo, useEffect, useMemo, useState } from 'react';
import type { GdeltEvent } from '@/lib/monitor/events';
import type { PolymarketMarket } from '@/lib/monitor/polymarket';
import type { UsgsEarthquake } from '@/lib/monitor/usgs';
import type { SignalKey, SituationRoomConfig } from '@/lib/monitor/types';
import { marketCategoryToTheme, type ThemeKey } from '@/lib/monitor/themes';

interface SituationBriefBarProps {
  focusMode: 'global' | 'room';
  activeRoom: SituationRoomConfig | null;
  events: GdeltEvent[];
  markets: PolymarketMarket[];
  earthquakes: UsgsEarthquake[];
  visibleThemes: Record<ThemeKey, boolean>;
  visibleSignals: Record<SignalKey, boolean>;
}

function formatRecency(ts: string): string {
  const date = new Date(ts);
  if (!Number.isFinite(date.getTime())) return 'now';
  const diffMins = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  return `${Math.floor(diffHours / 24)}d`;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
}

function SituationBriefBar({
  focusMode,
  activeRoom,
  events,
  markets,
  earthquakes,
  visibleThemes,
  visibleSignals,
}: SituationBriefBarProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  const filteredEvents = useMemo(() => (
    events
      .filter((event) => event.status !== 'speculative' && visibleThemes[event.category])
      .sort((a, b) => b.mapPriority - a.mapPriority)
  ), [events, visibleThemes]);

  const filteredMarkets = useMemo(() => (
    markets
      .filter((market) => {
        const theme = marketCategoryToTheme(market.category);
        return theme ? visibleThemes[theme] : true;
      })
      .sort((a, b) => b.signalScore - a.signalScore)
  ), [markets, visibleThemes]);

  const visibleQuakes = useMemo(() => (
    earthquakes
      .filter((quake) => quake.magnitude >= 5.5)
      .sort((a, b) => b.magnitude - a.magnitude)
  ), [earthquakes]);

  const criticalCount = filteredEvents.filter((event) => event.severity === 'critical').length;
  const watchCount = filteredEvents.filter((event) => event.severity === 'watch').length;
  const upcomingCount = filteredEvents.filter((event) => event.status === 'upcoming').length;

  const messages = useMemo(() => {
    const out: string[] = [];
    const topEvent = filteredEvents[0];
    const upcoming = filteredEvents.find((event) => event.status === 'upcoming');
    const topMarket = filteredMarkets[0];
    const topQuake = visibleQuakes[0];

    if (topEvent && visibleSignals.events) {
      out.push(`${topEvent.severity.toUpperCase()} (${formatRecency(topEvent.lastSeenAt)}): ${truncate(topEvent.title, 110)}`);
    }

    if (upcoming && visibleSignals.events) {
      out.push(`UPCOMING (${formatRecency(upcoming.lastSeenAt)}): ${truncate(upcoming.title, 100)}`);
    }

    if (topMarket && visibleSignals.markets) {
      out.push(`MARKET ${Math.round(topMarket.probability * 100)}%: ${truncate(topMarket.title, 104)}`);
    }

    if (topQuake && visibleSignals.disasters && visibleThemes.disasters) {
      out.push(`DISASTER M${topQuake.magnitude.toFixed(1)}: ${truncate(topQuake.place, 104)}`);
    }

    if (out.length === 0) {
      out.push('No high-signal updates in this focus right now.');
    }

    return out;
  }, [filteredEvents, filteredMarkets, visibleQuakes, visibleSignals, visibleThemes.disasters]);

  useEffect(() => {
    if (messages.length <= 1) return;
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [messages.length]);

  const focusLabel = focusMode === 'room' && activeRoom ? activeRoom.name : 'Global';
  const activeMessage = messages[messageIndex % Math.max(messages.length, 1)] || messages[0];

  return (
    <div
      style={{
        height: 36,
        minHeight: 36,
        background: '#111827',
        borderBottom: '1px solid #334155',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#4A9EFF',
            display: 'inline-block',
          }}
        />
        <span
          style={{
            color: '#8FA7C4',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Situation Brief
        </span>
        <span
          style={{
            color: '#CBD5E1',
            fontSize: 11,
            padding: '2px 7px',
            borderRadius: 10,
            background: 'rgba(139,167,196,0.15)',
            border: '1px solid rgba(139,167,196,0.25)',
            whiteSpace: 'nowrap',
          }}
        >
          {focusLabel}
        </span>
      </div>

      <div
        style={{
          flex: 1,
          minWidth: 0,
          color: '#D6E2F1',
          fontSize: 12,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {activeMessage}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: '#64748B',
          fontSize: 10,
          flexShrink: 0,
          fontFamily: "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace",
        }}
      >
        <span>C {criticalCount}</span>
        <span>W {watchCount}</span>
        <span>U {upcomingCount}</span>
      </div>
    </div>
  );
}

export default memo(SituationBriefBar);
