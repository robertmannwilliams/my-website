'use client';

import { useState, useEffect, memo } from 'react';
import Link from 'next/link';
import { THEMES, type ThemeKey } from '@/lib/monitor/themes';
import type { MonitorResponseMeta } from '@/lib/monitor/response';
import type { EventConfidenceGate, LayerKey, SituationRoomConfig, WatchZone } from '@/lib/monitor/types';

interface FilterPanelProps {
  focusMode: 'global' | 'room';
  situationRooms: SituationRoomConfig[];
  activeSituationRoomId: string | null;
  onSelectGlobalFocus: () => void;
  onSelectSituationRoom: (roomId: string) => void;
  visibleLayers: Record<LayerKey, boolean>;
  onToggleLayer: (key: LayerKey) => void;
  layerCounts: Record<LayerKey, number>;
  eventConfidenceGate: EventConfidenceGate;
  onChangeEventConfidenceGate: (value: EventConfidenceGate) => void;
  eventGateStats: {
    total: number;
    speculative: number;
    ambiguousGeo: number;
    invalidGeo: number;
    lowConfidence: number;
  };
  offMapEvents: Array<{
    id: string;
    title: string;
    severity: 'critical' | 'watch' | 'monitor';
    lastSeenAt: string;
    reasonCode: 'speculative' | 'geo_invalid' | 'geo_ambiguous' | 'low_confidence';
    reasonLabel: string;
    geoReason: string;
  }>;
  offMapSummary: {
    total: number;
    hiddenNow: number;
    plottedOverrides: number;
    byReason: Record<'speculative' | 'geo_invalid' | 'geo_ambiguous' | 'low_confidence', number>;
  };
  onSelectOffMapEvent: (eventId: string) => void;
  offMapPlottedIds: string[];
  onToggleOffMapPlot: (eventId: string) => void;
  onClearOffMapPlots: () => void;
  watchZones: WatchZone[];
  visibleWatchZones: Record<string, boolean>;
  onToggleWatchZone: (zoneId: string) => void;
  sourceHealth?: {
    events?: MonitorResponseMeta | null;
    markets?: MonitorResponseMeta | null;
    disasters?: MonitorResponseMeta | null;
    notams?: MonitorResponseMeta | null;
    shipping?: MonitorResponseMeta | null;
    elections?: MonitorResponseMeta | null;
  };
}

const LAYER_CONFIG: Record<LayerKey, { label: string; color: string }> = {
  events: { label: 'Events', color: '#FF6666' },
  markets: { label: 'Prediction Markets', color: '#66AAFF' },
  disasters: { label: 'Disaster Sensors', color: '#FFAA33' },
  notams: { label: 'NOTAM Airspace', color: '#FF8C42' },
  shipping: { label: 'Shipping Chokepoints', color: '#00DDCC' },
  elections: { label: 'Election Calendar', color: '#7AB4FF' },
  watch_zones: { label: 'Watch Zones', color: '#8B9BB5' },
  prices: { label: 'Macro Price Ticker', color: '#2DD4BF' },
};

const LAYER_KEYS: LayerKey[] = [
  'events',
  'markets',
  'disasters',
  'notams',
  'shipping',
  'elections',
  'watch_zones',
  'prices',
];

const EVENT_CONFIDENCE_MODES: Array<{
  id: EventConfidenceGate;
  label: string;
  description: string;
}> = [
  {
    id: 'strict',
    label: 'Strict',
    description: 'Default clean map: hides speculative, ambiguous geo, and weak monitor events.',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    description: 'Broader coverage: includes ambiguous geo and medium-confidence monitor events.',
  },
  {
    id: 'all',
    label: 'All Signals',
    description: 'Exploration mode: includes speculative and most low-confidence signals.',
  },
];

const themeDot = (theme: ThemeKey): string => THEMES[theme].color;

function ToggleSwitch({ on, color }: { on: boolean; color: string }) {
  return (
    <div
      style={{
        width: 32,
        height: 16,
        borderRadius: 8,
        background: on ? color : '#334155',
        position: 'relative',
        flexShrink: 0,
        transition: 'background 200ms ease',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: '#FFFFFF',
          position: 'absolute',
          top: 2,
          left: on ? 18 : 2,
          transition: 'left 200ms ease',
        }}
      />
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        color: '#64748B',
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        marginBottom: 10,
        display: 'block',
      }}
    >
      {children}
    </span>
  );
}

function formatSourceDetail(meta: MonitorResponseMeta | null | undefined, fallback: string): string {
  if (!meta) return `Pending - ${fallback}`;
  const coverage = meta.sourceCoverage || [];
  const healthy = coverage.filter((source) => !source.failed).length;
  const freshness = `${Math.max(0, Math.round(meta.freshnessSeconds))}s`;

  if (coverage.length > 0) {
    return `${healthy}/${coverage.length} healthy - ${freshness} - ${meta.cacheState}`;
  }
  return `${freshness} - ${meta.cacheState}`;
}

function formatAgo(ts: string): string {
  const ms = new Date(ts).getTime();
  if (!Number.isFinite(ms)) return 'now';
  const diffMins = Math.max(0, Math.floor((Date.now() - ms) / 60_000));
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  return `${Math.floor(diffHours / 24)}d`;
}

function severityColor(severity: 'critical' | 'watch' | 'monitor'): string {
  if (severity === 'critical') return '#FF4D4F';
  if (severity === 'watch') return '#F59E0B';
  return '#60A5FA';
}

function FilterPanel({
  focusMode,
  situationRooms,
  activeSituationRoomId,
  onSelectGlobalFocus,
  onSelectSituationRoom,
  visibleLayers,
  onToggleLayer,
  layerCounts,
  eventConfidenceGate,
  onChangeEventConfidenceGate,
  eventGateStats,
  offMapEvents,
  offMapSummary,
  onSelectOffMapEvent,
  offMapPlottedIds,
  onToggleOffMapPlot,
  onClearOffMapPlots,
  watchZones,
  visibleWatchZones,
  onToggleWatchZone,
  sourceHealth,
}: FilterPanelProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);
  const [offMapOpen, setOffMapOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
      if (!e.matches) setPanelOpen(false);
    };
    handler(mq);
    mq.addEventListener('change', handler as (e: MediaQueryListEvent) => void);
    return () => mq.removeEventListener('change', handler as (e: MediaQueryListEvent) => void);
  }, []);

  const dataSources = [
    {
      label: 'Geopolitical Events',
      detail: formatSourceDetail(sourceHealth?.events, 'RSS + rules/LLM'),
    },
    {
      label: 'Polymarket',
      detail: formatSourceDetail(sourceHealth?.markets, 'Prediction markets'),
    },
    {
      label: 'USGS',
      detail: formatSourceDetail(sourceHealth?.disasters, 'Earthquakes M4.5+'),
    },
    {
      label: 'NOTAM Overlay',
      detail: formatSourceDetail(sourceHealth?.notams, 'Airspace restrictions'),
    },
    {
      label: 'Shipping Overlay',
      detail: formatSourceDetail(sourceHealth?.shipping, 'Chokepoint activity'),
    },
    {
      label: 'Election Overlay',
      detail: formatSourceDetail(sourceHealth?.elections, 'Global election calendar'),
    },
  ];

  const panel = (
    <div
      style={{
        width: 260,
        minWidth: 260,
        height: '100%',
        background: '#111827',
        borderRight: '1px solid #334155',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 14px',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      <SectionHeader>Focus</SectionHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button
          onClick={onSelectGlobalFocus}
          style={{
            width: '100%',
            textAlign: 'left',
            background: focusMode === 'global' ? 'rgba(74,158,255,0.14)' : 'rgba(255,255,255,0.02)',
            border: focusMode === 'global' ? '1px solid rgba(74,158,255,0.35)' : '1px solid #1E293B',
            color: focusMode === 'global' ? '#CFE5FF' : '#94A3B8',
            borderRadius: 6,
            padding: '8px 10px',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Global
        </button>
        {situationRooms.map((room) => {
          const active = activeSituationRoomId === room.id;
          return (
            <button
              key={room.id}
              onClick={() => onSelectSituationRoom(room.id)}
              style={{
                width: '100%',
                textAlign: 'left',
                background: active ? 'rgba(74,158,255,0.14)' : 'rgba(255,255,255,0.02)',
                border: active ? '1px solid rgba(74,158,255,0.35)' : '1px solid #1E293B',
                color: active ? '#CFE5FF' : '#94A3B8',
                borderRadius: 6,
                padding: '8px 10px',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{room.name}</div>
              <div style={{ fontSize: 10, color: active ? '#9EC8FF' : '#64748B', lineHeight: 1.3 }}>
                {room.summary}
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ borderTop: '1px solid #1E293B', margin: '14px 0' }} />

      <SectionHeader>Layers</SectionHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {LAYER_KEYS.map((key) => {
          const cfg = LAYER_CONFIG[key];
          const isOn = visibleLayers[key];
          return (
            <div
              key={key}
              onClick={() => onToggleLayer(key)}
              style={{
                padding: '7px 8px',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                color: isOn ? '#CBD5E1' : '#64748B',
              }}
            >
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: isOn ? cfg.color : '#475569' }} />
              <span style={{ flex: 1, fontSize: 12, lineHeight: '16px' }}>{cfg.label}</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: isOn ? cfg.color : '#475569',
                  background: isOn ? `${cfg.color}18` : 'transparent',
                  padding: '1px 5px',
                  borderRadius: 3,
                  minWidth: 20,
                  textAlign: 'center',
                }}
              >
                {layerCounts[key]}
              </span>
              <ToggleSwitch on={isOn} color={cfg.color} />
            </div>
          );
        })}
      </div>

      <div style={{ borderTop: '1px solid #1E293B', margin: '14px 0' }} />

      <SectionHeader>Event Confidence</SectionHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {EVENT_CONFIDENCE_MODES.map((mode) => {
          const active = eventConfidenceGate === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => onChangeEventConfidenceGate(mode.id)}
              style={{
                width: '100%',
                textAlign: 'left',
                background: active ? 'rgba(74,158,255,0.14)' : 'rgba(255,255,255,0.02)',
                border: active ? '1px solid rgba(74,158,255,0.35)' : '1px solid #1E293B',
                color: active ? '#CFE5FF' : '#94A3B8',
                borderRadius: 6,
                padding: '8px 10px',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{mode.label}</div>
              <div style={{ fontSize: 10, color: active ? '#9EC8FF' : '#64748B', lineHeight: 1.3 }}>
                {mode.description}
              </div>
            </button>
          );
        })}
        <div
          style={{
            marginTop: 2,
            fontSize: 9,
            color: '#475569',
            lineHeight: '13px',
            padding: '0 2px',
          }}
        >
          Out of {eventGateStats.total} events: strict hides {eventGateStats.speculative} speculative, {eventGateStats.ambiguousGeo + eventGateStats.invalidGeo} low-geo, {eventGateStats.lowConfidence} weak-confidence.
        </div>
      </div>

      <div style={{ borderTop: '1px solid #1E293B', margin: '14px 0' }} />

      <div
        onClick={() => setOffMapOpen((prev) => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          marginBottom: offMapOpen ? 8 : 0,
        }}
      >
        <SectionHeader>Off-Map Events</SectionHeader>
        <span style={{ color: '#64748B', fontSize: 11 }}>{offMapOpen ? '−' : '+'}</span>
      </div>

      <div style={{ fontSize: 9, color: '#475569', lineHeight: '13px', marginBottom: offMapOpen ? 8 : 0 }}>
        {offMapSummary.hiddenNow} hidden now · {offMapSummary.plottedOverrides} plotted overrides · {offMapSummary.total} default-hidden total
      </div>
      <div style={{ fontSize: 9, color: '#475569', lineHeight: '13px', marginBottom: offMapOpen ? 8 : 0 }}>
        Spec {offMapSummary.byReason.speculative} · Geo {offMapSummary.byReason.geo_invalid + offMapSummary.byReason.geo_ambiguous} · Confidence {offMapSummary.byReason.low_confidence}
      </div>

      {offMapOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {offMapPlottedIds.length > 0 && (
            <button
              onClick={onClearOffMapPlots}
              style={{
                width: '100%',
                textAlign: 'center',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid #334155',
                color: '#94A3B8',
                borderRadius: 6,
                fontSize: 10,
                padding: '5px 6px',
                cursor: 'pointer',
              }}
            >
              Clear plotted overrides ({offMapPlottedIds.length})
            </button>
          )}
          {offMapEvents.length === 0 && (
            <div style={{ fontSize: 10, color: '#64748B', padding: '2px 2px' }}>
              No hidden events for current filters.
            </div>
          )}
          {offMapEvents.map((event) => (
            <div
              key={event.id}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.02)',
                border: offMapPlottedIds.includes(event.id)
                  ? '1px solid rgba(74,158,255,0.3)'
                  : '1px solid #1E293B',
                borderRadius: 6,
                padding: '7px 8px',
                color: '#CBD5E1',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: severityColor(event.severity), display: 'inline-block' }} />
                <span style={{ fontSize: 9, color: '#64748B', textTransform: 'uppercase' }}>{event.reasonLabel}</span>
                <span style={{ fontSize: 9, color: '#475569' }}>{formatAgo(event.lastSeenAt)}</span>
                {offMapPlottedIds.includes(event.id) && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: 9,
                      color: '#9EC8FF',
                      textTransform: 'uppercase',
                    }}
                  >
                    plotted
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, lineHeight: '14px', marginBottom: 2 }}>
                {event.title}
              </div>
              <div style={{ fontSize: 9, color: '#475569', lineHeight: '12px' }}>
                {event.geoReason}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 7 }}>
                <button
                  onClick={() => onSelectOffMapEvent(event.id)}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid #334155',
                    color: '#AFC2D9',
                    borderRadius: 5,
                    fontSize: 10,
                    padding: '4px 6px',
                    cursor: 'pointer',
                  }}
                >
                  View
                </button>
                <button
                  onClick={() => onToggleOffMapPlot(event.id)}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    background: offMapPlottedIds.includes(event.id) ? 'rgba(74,158,255,0.18)' : 'rgba(74,158,255,0.08)',
                    border: offMapPlottedIds.includes(event.id) ? '1px solid rgba(74,158,255,0.38)' : '1px solid rgba(74,158,255,0.24)',
                    color: offMapPlottedIds.includes(event.id) ? '#D6E8FF' : '#9EC8FF',
                    borderRadius: 5,
                    fontSize: 10,
                    padding: '4px 6px',
                    cursor: 'pointer',
                  }}
                >
                  {offMapPlottedIds.includes(event.id) ? 'Unplot' : 'Plot anyway'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ borderTop: '1px solid #1E293B', margin: '14px 0' }} />

      <SectionHeader>Watch Zones</SectionHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {watchZones.map((zone) => {
          const isOn = Boolean(visibleWatchZones[zone.id]);
          return (
            <div
              key={zone.id}
              onClick={() => onToggleWatchZone(zone.id)}
              style={{
                padding: '6px 8px',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                color: isOn ? '#CBD5E1' : '#64748B',
              }}
            >
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: isOn ? themeDot(zone.theme) : '#475569' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, lineHeight: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {zone.name}
                </div>
                <div style={{ fontSize: 9, color: '#475569', textTransform: 'uppercase' }}>{zone.severity}</div>
              </div>
              <ToggleSwitch on={isOn} color={themeDot(zone.theme)} />
            </div>
          );
        })}
      </div>

      <div style={{ borderTop: '1px solid #1E293B', margin: '14px 0' }} />

      <div
        onClick={() => setHealthOpen((prev) => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          marginBottom: healthOpen ? 8 : 0,
        }}
      >
        <SectionHeader>Data Health</SectionHeader>
        <span style={{ color: '#64748B', fontSize: 11 }}>{healthOpen ? '−' : '+'}</span>
      </div>

      {healthOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 4 }}>
          {dataSources.map(({ label, detail }) => (
            <div key={label} style={{ padding: '4px 6px', borderRadius: 4 }}>
              <div style={{ fontSize: 11, color: '#94A3B8', lineHeight: '14px' }}>{label}</div>
              <div style={{ fontSize: 9, color: '#475569', lineHeight: '12px' }}>{detail}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ flex: 1 }} />

      <div
        style={{
          paddingTop: 12,
          borderTop: '1px solid #1E293B',
          marginTop: 14,
          textAlign: 'center',
        }}
      >
        <span style={{ fontSize: 10, color: '#334155' }}>
          Built by{' '}
          <Link href="/" style={{ color: '#475569', textDecoration: 'none' }}>
            Robert Williams
          </Link>
        </span>
      </div>
    </div>
  );

  if (!isMobile) return panel;

  return (
    <div style={{ width: 0, minWidth: 0, position: 'relative' }}>
      {!panelOpen && (
        <button
          onClick={() => setPanelOpen(true)}
          style={{
            position: 'fixed',
            top: 44,
            left: 12,
            zIndex: 25,
            width: 36,
            height: 36,
            borderRadius: 8,
            background: 'rgba(17,24,39,0.85)',
            border: '1px solid #334155',
            color: '#94A3B8',
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          ☰
        </button>
      )}

      {panelOpen && (
        <div
          onClick={() => setPanelOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 20,
            background: 'rgba(0,0,0,0.5)',
          }}
        />
      )}

      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 22,
          transform: panelOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 250ms ease',
        }}
      >
        {panel}
      </div>
    </div>
  );
}

export default memo(FilterPanel);
