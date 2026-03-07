'use client';

import { useState, useEffect, memo } from 'react';
import type { GdeltEvent } from '@/lib/monitor/events';
import type { PolymarketMarket } from '@/lib/monitor/polymarket';
import type { UsgsEarthquake } from '@/lib/monitor/usgs';
import type {
  ActiveFanout,
  MapInteractionMode,
  MapItem,
  MapSelectionCandidate,
  SituationRoomConfig,
  WatchZone,
} from '@/lib/monitor/types';
import { categoryColor, marketCategoryColor } from '@/lib/monitor/themes';

interface EventDetailPanelProps {
  item: MapItem | null;
  relatedMarkets?: PolymarketMarket[];
  onSelectCandidate: (candidate: MapSelectionCandidate) => void;
  canBackToSelection: boolean;
  onBackToSelection: () => void;
  canBackToFanout: boolean;
  onBackToFanout: () => void;
  onCollapseFanout: () => void;
  interactionMode: MapInteractionMode;
  onClose: () => void;
}

const SEVERITY_CONFIG = {
  critical: { label: 'CRITICAL', color: '#FF4444', bg: 'rgba(255,68,68,0.12)' },
  watch: { label: 'WATCH', color: '#FFAA22', bg: 'rgba(255,170,34,0.12)' },
  monitor: { label: 'MONITOR', color: '#666680', bg: 'rgba(102,102,128,0.12)' },
};

const CATEGORY_LABELS: Record<string, string> = {
  conflicts: 'Conflicts',
  elections: 'Elections',
  economy: 'Economy',
  disasters: 'Disasters',
  infrastructure: 'Infrastructure',
  conflict: 'Conflict',
  politics: 'Politics',
  diplomacy: 'Diplomacy',
  climate: 'Climate',
};

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatEndDate(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function EventContent({ event, relatedMarkets }: { event: GdeltEvent; relatedMarkets?: PolymarketMarket[] }) {
  const sev = SEVERITY_CONFIG[event.severity];

  return (
    <>
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #334155' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: sev.color, background: sev.bg, padding: '2px 8px', borderRadius: 3 }}>
            {sev.label}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.04em',
              color: categoryColor(event.category),
              background: `${categoryColor(event.category)}18`,
              padding: '2px 8px',
              borderRadius: 3,
              textTransform: 'uppercase',
            }}
          >
            {CATEGORY_LABELS[event.category] || event.category}
          </span>
        </div>
        <h3 style={{ color: '#E8E8ED', fontSize: 15, fontWeight: 600, lineHeight: 1.35, margin: 0 }}>{event.title}</h3>
      </div>

      <div style={{ padding: '12px 16px', borderBottom: '1px solid #334155', display: 'flex', gap: 16, fontSize: 11, color: '#64748B' }}>
        <span>{formatTimestamp(event.timestamp)}</span>
        <span>{event.sourceCount} sources</span>
        <span>{event.region.replace('_', ' ')}</span>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <p style={{ color: '#CBD5E1', fontSize: 13, lineHeight: 1.5, margin: '0 0 16px' }}>{event.summary}</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: '#64748B' }}>
            Confidence: <span style={{ color: '#CBD5E1' }}>{Math.round(event.classificationConfidence * 100)}%</span>
          </div>
          <div style={{ fontSize: 11, color: '#64748B' }}>
            Method: <span style={{ color: '#CBD5E1', textTransform: 'uppercase' }}>{event.classificationMethod}</span>
          </div>
          <div style={{ fontSize: 11, color: '#64748B' }}>
            First Seen: <span style={{ color: '#CBD5E1' }}>{formatTimestamp(event.firstSeenAt)}</span>
          </div>
          <div style={{ fontSize: 11, color: '#64748B' }}>
            Last Seen: <span style={{ color: '#CBD5E1' }}>{formatTimestamp(event.lastSeenAt)}</span>
          </div>
          <div style={{ fontSize: 10, color: '#475569', gridColumn: '1 / -1', fontFamily: 'monospace' }}>
            Canonical: {event.canonicalId} · {event.fingerprint}
          </div>
          <div style={{ fontSize: 11, color: '#64748B', gridColumn: '1 / -1' }}>
            Geo: <span style={{ color: '#CBD5E1' }}>{event.geoValidity}</span> · <span style={{ color: '#94A3B8' }}>{event.geoReason}</span>
          </div>
        </div>

        {event.sources.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <span style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, display: 'block', marginBottom: 8 }}>
              Sources
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {event.sources.map((src, i) => (
                <a
                  key={i}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#4A9EFF', fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <span style={{ color: '#64748B' }}>{src.name}</span>
                  <span style={{ color: '#4A9EFF' }}>→</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {relatedMarkets && relatedMarkets.length > 0 && (
          <div>
            <span style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, display: 'block', marginBottom: 8 }}>
              Related Markets
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {relatedMarkets.map((m) => (
                <a
                  key={m.id}
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    padding: '8px 10px',
                    borderRadius: 4,
                    border: `1px solid ${marketCategoryColor(m.category)}33`,
                    background: `${marketCategoryColor(m.category)}0D`,
                    textDecoration: 'none',
                    cursor: 'pointer',
                    flexDirection: 'column',
                  }}
                >
                  <div style={{ display: 'flex', width: '100%', gap: 10, alignItems: 'center' }}>
                    <span style={{ color: marketCategoryColor(m.category), fontSize: 12, fontWeight: 700, fontFamily: 'monospace', minWidth: 38 }}>
                      {Math.round(m.probability * 100)}%
                    </span>
                    <span style={{ color: '#CBD5E1', fontSize: 12, lineHeight: 1.35 }}>{m.title}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {m.linkConfidence != null && (
                      <span style={{ fontSize: 10, color: '#A7B5CA', background: 'rgba(167,181,202,0.1)', padding: '2px 6px', borderRadius: 10 }}>
                        link {Math.round(m.linkConfidence * 100)}%
                      </span>
                    )}
                    {(m.topicTags || []).slice(0, 3).map((tag) => (
                      <span key={tag} style={{ fontSize: 10, color: '#8BC7FF', background: 'rgba(139,199,255,0.1)', padding: '2px 6px', borderRadius: 10 }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function MarketContent({ market }: { market: PolymarketMarket }) {
  const yesPercent = Math.round(market.probability * 100);
  const noPercent = 100 - yesPercent;
  const mColor = marketCategoryColor(market.category);

  return (
    <>
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #334155' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: mColor, background: `${mColor}1F`, padding: '2px 8px', borderRadius: 3 }}>
            MARKET
          </span>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', color: mColor, background: `${mColor}18`, padding: '2px 8px', borderRadius: 3, textTransform: 'uppercase' }}>
            {CATEGORY_LABELS[market.category] || market.category}
          </span>
        </div>
        <h3 style={{ color: '#E8E8ED', fontSize: 15, fontWeight: 600, lineHeight: 1.35, margin: 0 }}>{market.title}</h3>
      </div>

      <div style={{ padding: '12px 16px', borderBottom: '1px solid #334155', display: 'flex', gap: 16, fontSize: 11, color: '#64748B' }}>
        <span>Vol: {market.volume}</span>
        <span>Ends: {formatEndDate(market.endDate)}</span>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#22C55E' }}>YES {yesPercent}%</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#FF4444' }}>NO {noPercent}%</span>
          </div>
          <div style={{ width: '100%', height: 8, background: '#334155', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${yesPercent}%`, height: '100%', background: '#22C55E', borderRadius: 4 }} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: '#64748B' }}>Volume</span>
            <span style={{ color: '#CBD5E1', fontFamily: 'monospace' }}>{market.volume}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: '#64748B' }}>Liquidity</span>
            <span style={{ color: '#CBD5E1', fontFamily: 'monospace' }}>${Math.round(market.liquidity).toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: '#64748B' }}>Geo Quality</span>
            <span style={{ color: '#CBD5E1' }}>{Math.round(market.geoConfidence * 100)}% ({market.geoMethod})</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: '#64748B' }}>Geo Validity</span>
            <span style={{ color: '#CBD5E1' }}>{market.geoValidity}</span>
          </div>
          <div style={{ fontSize: 11, color: '#94A3B8' }}>{market.geoReason}</div>
        </div>

        <a
          href={market.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '10px 16px',
            borderRadius: 6,
            border: `1px solid ${mColor}4D`,
            background: `${mColor}14`,
            color: mColor,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          View on Polymarket →
        </a>
      </div>
    </>
  );
}

function EarthquakeContent({ eq }: { eq: UsgsEarthquake }) {
  const color = eq.magnitude >= 7.0 ? '#FF2222' : eq.magnitude >= 5.5 ? '#FF6622' : '#FFAA22';
  return (
    <>
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #334155' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color, background: `${color}1F`, padding: '2px 8px', borderRadius: 3 }}>
            EARTHQUAKE
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', color: '#E8E8ED', background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: 3, fontFamily: 'monospace' }}>
            M {eq.magnitude.toFixed(1)}
          </span>
        </div>
        <h3 style={{ color: '#E8E8ED', fontSize: 15, fontWeight: 600, lineHeight: 1.35, margin: 0 }}>{eq.place}</h3>
      </div>

      <div style={{ padding: '12px 16px', borderBottom: '1px solid #334155', display: 'flex', gap: 16, fontSize: 11, color: '#64748B' }}>
        <span>{formatTimestamp(eq.timestamp)}</span>
        <span>Depth: {eq.depth.toFixed(1)} km</span>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <div style={{ marginBottom: 16, color: '#CBD5E1', fontSize: 13 }}>Magnitude {eq.magnitude.toFixed(1)} ({eq.magType})</div>
        <a
          href={eq.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '10px 16px',
            borderRadius: 6,
            border: `1px solid ${color}4D`,
            background: `${color}14`,
            color,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          View on USGS →
        </a>
      </div>
    </>
  );
}

function WatchZoneContent({ zone }: { zone: WatchZone }) {
  const sev = SEVERITY_CONFIG[zone.severity];
  const color = categoryColor(zone.theme);

  return (
    <>
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #334155' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: sev.color, background: sev.bg, padding: '2px 8px', borderRadius: 3 }}>
            {sev.label}
          </span>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', color, background: `${color}18`, padding: '2px 8px', borderRadius: 3, textTransform: 'uppercase' }}>
            {CATEGORY_LABELS[zone.theme] || zone.theme}
          </span>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', color: '#9DB2CC', background: 'rgba(157,178,204,0.12)', padding: '2px 8px', borderRadius: 3 }}>
            WATCH ZONE
          </span>
        </div>
        <h3 style={{ color: '#E8E8ED', fontSize: 15, fontWeight: 600, lineHeight: 1.35, margin: 0 }}>{zone.name}</h3>
      </div>

      <div style={{ padding: '12px 16px', borderBottom: '1px solid #334155', display: 'flex', gap: 16, fontSize: 11, color: '#64748B' }}>
        <span>{zone.scope}</span>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <p style={{ color: '#CBD5E1', fontSize: 13, lineHeight: 1.5, margin: '0 0 16px' }}>{zone.summary}</p>

        <div style={{ padding: '10px 12px', borderRadius: 6, background: 'rgba(102,170,255,0.06)', border: '1px solid rgba(102,170,255,0.15)', marginBottom: 16, color: '#66AAFF', fontSize: 12, fontWeight: 500 }}>
          {zone.status}
        </div>

        <div style={{ fontSize: 11, color: '#64748B', marginBottom: 8 }}>Updated {zone.updatedAt}</div>

        {zone.assets.length > 0 && (
          <div>
            <span style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, display: 'block', marginBottom: 8 }}>
              Prioritized Assets
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {zone.assets.map((asset) => (
                <span key={asset} style={{ fontSize: 11, color: '#94A3B8', background: 'rgba(148,163,184,0.08)', padding: '3px 10px', borderRadius: 12, border: '1px solid rgba(148,163,184,0.12)' }}>
                  {asset}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function RoomContent({ room }: { room: SituationRoomConfig }) {
  return (
    <>
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #334155' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: '#66AAFF', background: 'rgba(102,170,255,0.14)', padding: '2px 8px', borderRadius: 3 }}>
            SITUATION ROOM
          </span>
        </div>
        <h3 style={{ color: '#E8E8ED', fontSize: 15, fontWeight: 600, lineHeight: 1.35, margin: 0 }}>{room.name}</h3>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <p style={{ color: '#CBD5E1', fontSize: 13, lineHeight: 1.5, margin: '0 0 14px' }}>{room.summary}</p>
        <div style={{ marginBottom: 16, fontSize: 12, color: '#94A3B8' }}>
          Map View: {room.center[1].toFixed(1)}, {room.center[0].toFixed(1)} · zoom {room.zoom.toFixed(1)}
        </div>

        <div style={{ marginBottom: 18 }}>
          <span style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, display: 'block', marginBottom: 8 }}>
            Default Signal Types
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(room.defaultSignalTypes || []).map((signal) => (
              <span key={signal} style={{ fontSize: 11, color: '#8FB8F2', background: 'rgba(74,158,255,0.12)', padding: '3px 10px', borderRadius: 12, border: '1px solid rgba(74,158,255,0.2)' }}>
                {signal}
              </span>
            ))}
          </div>
        </div>

        <div>
          <span style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, display: 'block', marginBottom: 8 }}>
            Highlighted Assets
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(room.highlightedAssets || []).map((asset) => (
              <span key={asset} style={{ fontSize: 11, color: '#94A3B8', background: 'rgba(148,163,184,0.08)', padding: '3px 10px', borderRadius: 12, border: '1px solid rgba(148,163,184,0.12)' }}>
                {asset}
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function FanoutContextContent({ fanout }: { fanout: ActiveFanout }) {
  const signalLabel = fanout.signalType === 'markets' ? 'Markets' : 'Events';
  const freshness = fanout.freshestTimestamp ? formatTimestamp(fanout.freshestTimestamp) : 'unknown';
  const themeRows = Object.entries(fanout.themeMix)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <>
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #334155' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: '#66AAFF', background: 'rgba(102,170,255,0.14)', padding: '2px 8px', borderRadius: 3, display: 'inline-block', marginBottom: 10 }}>
          FAN-OUT
        </div>
        <h3 style={{ color: '#E8E8ED', fontSize: 15, fontWeight: 600, lineHeight: 1.35, margin: 0 }}>
          {signalLabel} Cluster Context
        </h3>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#64748B' }}>
            Signal Type: <span style={{ color: '#CBD5E1' }}>{signalLabel}</span>
          </div>
          <div style={{ fontSize: 12, color: '#64748B' }}>
            Item Count: <span style={{ color: '#CBD5E1' }}>{fanout.itemCount}</span>
          </div>
          <div style={{ fontSize: 12, color: '#64748B' }}>
            Freshness: <span style={{ color: '#CBD5E1' }}>{freshness}</span>
          </div>
          <div style={{ fontSize: 12, color: '#64748B' }}>
            Location: <span style={{ color: '#CBD5E1', fontFamily: 'monospace' }}>{fanout.locationLabel}</span>
          </div>
        </div>

        <div>
          <span style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, display: 'block', marginBottom: 8 }}>
            Theme Mix
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {themeRows.map(([theme, count]) => (
              <div key={theme} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: categoryColor(theme as keyof typeof fanout.themeMix), textTransform: 'capitalize' }}>
                  {theme}
                </span>
                <span style={{ color: '#CBD5E1' }}>{count}</span>
              </div>
            ))}
            {themeRows.length === 0 && (
              <div style={{ fontSize: 12, color: '#94A3B8' }}>No theme mix data.</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function SelectionContent({
  title,
  candidates,
  onSelectCandidate,
}: {
  title: string;
  candidates: MapSelectionCandidate[];
  onSelectCandidate: (candidate: MapSelectionCandidate) => void;
}) {
  return (
    <>
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #334155' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: '#66AAFF', background: 'rgba(102,170,255,0.14)', padding: '2px 8px', borderRadius: 3, display: 'inline-block', marginBottom: 10 }}>
          STACKED SIGNALS
        </div>
        <h3 style={{ color: '#E8E8ED', fontSize: 15, fontWeight: 600, lineHeight: 1.35, margin: 0 }}>{title}</h3>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {candidates.map((candidate) => (
          <button
            key={`${candidate.type}:${candidate.id}`}
            onClick={() => onSelectCandidate(candidate)}
            style={{
              width: '100%',
              textAlign: 'left',
              borderRadius: 6,
              border: '1px solid #334155',
              background: 'rgba(255,255,255,0.02)',
              padding: '10px 12px',
              cursor: 'pointer',
            }}
          >
            <div style={{ color: '#E8E8ED', fontSize: 12, marginBottom: 4 }}>{candidate.title}</div>
            <div style={{ color: '#64748B', fontSize: 11 }}>{candidate.subtitle}</div>
          </button>
        ))}
      </div>
    </>
  );
}

function EventDetailPanel({
  item,
  relatedMarkets,
  onSelectCandidate,
  canBackToSelection,
  onBackToSelection,
  canBackToFanout,
  onBackToFanout,
  onCollapseFanout,
  interactionMode,
  onClose,
}: EventDetailPanelProps) {
  const isOpen = item !== null;
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
    };
    handler(mq);
    mq.addEventListener('change', handler as (e: MediaQueryListEvent) => void);
    return () => mq.removeEventListener('change', handler as (e: MediaQueryListEvent) => void);
  }, []);

  const panelBody = item && (
    <>
      {item.type === 'event' && <EventContent event={item.data} relatedMarkets={relatedMarkets} />}
      {item.type === 'market' && <MarketContent market={item.data} />}
      {item.type === 'earthquake' && <EarthquakeContent eq={item.data} />}
      {item.type === 'watch_zone' && <WatchZoneContent zone={item.data} />}
      {item.type === 'fanout' && <FanoutContextContent fanout={item.data} />}
      {item.type === 'room' && <RoomContent room={item.data} />}
      {item.type === 'selection' && (
        <SelectionContent
          title={item.data.title}
          candidates={item.data.candidates}
          onSelectCandidate={onSelectCandidate}
        />
      )}
    </>
  );

  if (isMobile) {
    return (
      <>
        {isOpen && (
          <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 14, background: 'rgba(0,0,0,0.5)' }} />
        )}
        <div
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            maxHeight: '70vh',
            background: '#1E293B',
            borderTop: '1px solid #334155',
            borderRadius: '12px 12px 0 0',
            transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
            transition: 'transform 200ms ease-out',
            zIndex: 15,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {item && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 12px 0', position: 'relative' }}>
                <div style={{ width: 32, height: 4, borderRadius: 2, background: '#334155' }} />
                {canBackToFanout && item.type !== 'fanout' && (
                  <button
                    onClick={onBackToFanout}
                    style={{
                      position: 'absolute',
                      left: 12,
                      top: 8,
                      background: 'none',
                      border: '1px solid #334155',
                      color: '#9DB2CC',
                      cursor: 'pointer',
                      padding: '3px 8px',
                      fontSize: 11,
                      borderRadius: 4,
                      lineHeight: 1.3,
                    }}
                  >
                    Back
                  </button>
                )}
                {canBackToSelection && item.type !== 'selection' && !canBackToFanout && (
                  <button
                    onClick={onBackToSelection}
                    style={{
                      position: 'absolute',
                      left: 12,
                      top: 8,
                      background: 'none',
                      border: '1px solid #334155',
                      color: '#9DB2CC',
                      cursor: 'pointer',
                      padding: '3px 8px',
                      fontSize: 11,
                      borderRadius: 4,
                      lineHeight: 1.3,
                    }}
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={onClose}
                  style={{ position: 'absolute', right: 12, top: 8, background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 4, fontSize: 18, lineHeight: 1 }}
                >
                  ×
                </button>
              </div>
              {panelBody}
            </>
          )}
        </div>
      </>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: 390,
        background: '#1E293B',
        borderLeft: '1px solid #334155',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 150ms ease-out',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {item && (
        <>
          {canBackToFanout && item.type !== 'fanout' && (
            <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 11 }}>
              <button
                onClick={onBackToFanout}
                style={{
                  background: 'rgba(13,23,43,0.9)',
                  border: '1px solid #334155',
                  color: '#9DB2CC',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: 4,
                  fontSize: 11,
                }}
              >
                Back to fan-out
              </button>
            </div>
          )}
          {interactionMode !== 'idle' && (
            <div style={{ position: 'absolute', top: 12, left: canBackToFanout ? 124 : 12, zIndex: 11 }}>
              <button
                onClick={onCollapseFanout}
                style={{
                  background: 'rgba(13,23,43,0.9)',
                  border: '1px solid #334155',
                  color: '#9DB2CC',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: 4,
                  fontSize: 11,
                }}
              >
                Collapse
              </button>
            </div>
          )}
          <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 11 }}>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 4, fontSize: 18, lineHeight: 1 }}
            >
              ×
            </button>
          </div>
          {panelBody}
        </>
      )}
    </div>
  );
}

export default memo(EventDetailPanel);
