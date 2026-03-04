'use client';

import { useState, useEffect, memo } from 'react';
import type { GdeltEvent } from '@/lib/monitor/gdelt';
import type { PolymarketMarket } from '@/lib/monitor/polymarket';
import type { UsgsEarthquake } from '@/lib/monitor/usgs';
import type { MapItem } from '@/lib/monitor/types';

interface EventDetailPanelProps {
  item: MapItem | null;
  relatedMarkets?: PolymarketMarket[];
  onClose: () => void;
}

const SEVERITY_CONFIG = {
  critical: { label: 'CRITICAL', color: '#FF4444', bg: 'rgba(255,68,68,0.12)' },
  watch: { label: 'WATCH', color: '#FFAA22', bg: 'rgba(255,170,34,0.12)' },
  monitor: { label: 'MONITOR', color: '#666680', bg: 'rgba(102,102,128,0.12)' },
};

const CATEGORY_LABELS: Record<string, string> = {
  conflict: 'Conflict',
  politics: 'Politics',
  disaster: 'Natural Disaster',
  economy: 'Economy',
  protest: 'Protest',
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

// --- Event content ---

function EventContent({
  event,
  relatedMarkets,
}: {
  event: GdeltEvent;
  relatedMarkets?: PolymarketMarket[];
}) {
  const sev = SEVERITY_CONFIG[event.severity];

  return (
    <>
      {/* Header */}
      <div
        style={{
          padding: '16px 16px 12px',
          borderBottom: '1px solid #2A2A35',
        }}
      >
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: sev.color,
              background: sev.bg,
              padding: '2px 8px',
              borderRadius: 3,
            }}
          >
            {sev.label}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.04em',
              color: '#8888A0',
              background: 'rgba(136,136,160,0.1)',
              padding: '2px 8px',
              borderRadius: 3,
              textTransform: 'uppercase',
            }}
          >
            {CATEGORY_LABELS[event.category] || event.category}
          </span>
        </div>
        <h3
          style={{
            color: '#E8E8ED',
            fontSize: 15,
            fontWeight: 600,
            lineHeight: 1.35,
            margin: 0,
          }}
        >
          {event.title}
        </h3>
      </div>

      {/* Meta info */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #2A2A35',
          display: 'flex',
          gap: 16,
          fontSize: 11,
          color: '#6B6B78',
        }}
      >
        <span>{formatTimestamp(event.timestamp)}</span>
        <span>
          {event.lat.toFixed(2)}, {event.lng.toFixed(2)}
        </span>
        <span style={{ textTransform: 'capitalize' }}>
          {event.region.replace('_', ' ')}
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <p
          style={{
            color: '#B0B0BE',
            fontSize: 13,
            lineHeight: 1.5,
            margin: '0 0 20px',
          }}
        >
          {event.summary}
        </p>

        {/* Tone indicator */}
        <div style={{ marginBottom: 20 }}>
          <span
            style={{
              fontSize: 11,
              color: '#6B6B78',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              fontWeight: 600,
            }}
          >
            Sentiment
          </span>
          <div
            style={{
              marginTop: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div
              style={{
                width: 120,
                height: 4,
                background: '#2A2A35',
                borderRadius: 2,
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: `${Math.max(0, Math.min(100, ((event.tone + 10) / 20) * 100))}%`,
                  top: -3,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background:
                    event.tone < -3
                      ? '#FF4444'
                      : event.tone > 3
                        ? '#22C55E'
                        : '#FFAA22',
                  transform: 'translateX(-50%)',
                }}
              />
            </div>
            <span
              style={{
                fontSize: 12,
                fontFamily: 'monospace',
                color:
                  event.tone < -3
                    ? '#FF4444'
                    : event.tone > 3
                      ? '#22C55E'
                      : '#FFAA22',
              }}
            >
              {event.tone > 0 ? '+' : ''}
              {event.tone.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Sources */}
        {event.sources.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <span
              style={{
                fontSize: 11,
                color: '#6B6B78',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                fontWeight: 600,
                display: 'block',
                marginBottom: 8,
              }}
            >
              Sources
            </span>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              {event.sources.map((src, i) => (
                <a
                  key={i}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#4A9EFF',
                    fontSize: 12,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span style={{ color: '#6B6B78' }}>{src.name}</span>
                  <span style={{ color: '#4A9EFF' }}>→</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Related Markets */}
        {relatedMarkets && relatedMarkets.length > 0 && (
          <div>
            <span
              style={{
                fontSize: 11,
                color: '#6B6B78',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                fontWeight: 600,
                display: 'block',
                marginBottom: 8,
              }}
            >
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
                    border: '1px solid rgba(170,102,255,0.2)',
                    background: 'rgba(170,102,255,0.05)',
                    textDecoration: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      color: '#AA66FF',
                      fontSize: 12,
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      minWidth: 38,
                      flexShrink: 0,
                    }}
                  >
                    {Math.round(m.probability * 100)}%
                  </span>
                  <span
                    style={{
                      color: '#B0B0BE',
                      fontSize: 12,
                      lineHeight: 1.35,
                    }}
                  >
                    {m.title}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// --- Market content ---

function MarketContent({ market }: { market: PolymarketMarket }) {
  const yesPercent = Math.round(market.probability * 100);
  const noPercent = 100 - yesPercent;

  return (
    <>
      {/* Header */}
      <div
        style={{
          padding: '16px 16px 12px',
          borderBottom: '1px solid #2A2A35',
        }}
      >
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: '#AA66FF',
              background: 'rgba(170,102,255,0.12)',
              padding: '2px 8px',
              borderRadius: 3,
            }}
          >
            MARKET
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.04em',
              color: '#8888A0',
              background: 'rgba(136,136,160,0.1)',
              padding: '2px 8px',
              borderRadius: 3,
              textTransform: 'uppercase',
            }}
          >
            {CATEGORY_LABELS[market.category] || market.category}
          </span>
        </div>
        <h3
          style={{
            color: '#E8E8ED',
            fontSize: 15,
            fontWeight: 600,
            lineHeight: 1.35,
            margin: 0,
          }}
        >
          {market.title}
        </h3>
      </div>

      {/* Meta info */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #2A2A35',
          display: 'flex',
          gap: 16,
          fontSize: 11,
          color: '#6B6B78',
        }}
      >
        <span>Vol: {market.volume}</span>
        <span>Ends: {formatEndDate(market.endDate)}</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {/* Probability bar */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#22C55E',
              }}
            >
              YES {yesPercent}%
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#FF4444',
              }}
            >
              NO {noPercent}%
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: 8,
              background: '#2A2A35',
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${yesPercent}%`,
                height: '100%',
                background: '#22C55E',
                borderRadius: 4,
                transition: 'width 300ms ease',
              }}
            />
          </div>
        </div>

        {/* Market details */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
            }}
          >
            <span style={{ color: '#6B6B78' }}>Volume</span>
            <span style={{ color: '#B0B0BE', fontFamily: 'monospace' }}>
              {market.volume}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
            }}
          >
            <span style={{ color: '#6B6B78' }}>Liquidity</span>
            <span style={{ color: '#B0B0BE', fontFamily: 'monospace' }}>
              ${market.liquidity >= 1000
                ? `${(market.liquidity / 1000).toFixed(0)}K`
                : market.liquidity.toFixed(0)}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
            }}
          >
            <span style={{ color: '#6B6B78' }}>End Date</span>
            <span style={{ color: '#B0B0BE' }}>
              {formatEndDate(market.endDate)}
            </span>
          </div>
        </div>

        {/* Link to Polymarket */}
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
            border: '1px solid rgba(170,102,255,0.3)',
            background: 'rgba(170,102,255,0.08)',
            color: '#AA66FF',
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
            cursor: 'pointer',
          }}
        >
          View on Polymarket →
        </a>
      </div>
    </>
  );
}

// --- Earthquake content ---

function magColor(mag: number): string {
  if (mag >= 7.0) return '#FF2222';
  if (mag >= 5.5) return '#FF6622';
  return '#FFAA22';
}

function EarthquakeContent({ eq }: { eq: UsgsEarthquake }) {
  const color = magColor(eq.magnitude);

  return (
    <>
      {/* Header */}
      <div
        style={{
          padding: '16px 16px 12px',
          borderBottom: '1px solid #2A2A35',
        }}
      >
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.06em',
              color,
              background: `${color}1F`,
              padding: '2px 8px',
              borderRadius: 3,
            }}
          >
            EARTHQUAKE
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.04em',
              color: '#E8E8ED',
              background: 'rgba(255,255,255,0.08)',
              padding: '2px 8px',
              borderRadius: 3,
              fontFamily: 'monospace',
            }}
          >
            M {eq.magnitude.toFixed(1)}
          </span>
        </div>
        <h3
          style={{
            color: '#E8E8ED',
            fontSize: 15,
            fontWeight: 600,
            lineHeight: 1.35,
            margin: 0,
          }}
        >
          {eq.place}
        </h3>
      </div>

      {/* Meta info */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #2A2A35',
          display: 'flex',
          gap: 16,
          fontSize: 11,
          color: '#6B6B78',
        }}
      >
        <span>{formatTimestamp(eq.timestamp)}</span>
        <span>
          {eq.lat.toFixed(2)}, {eq.lng.toFixed(2)}
        </span>
        <span>Depth: {eq.depth.toFixed(1)} km</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {/* Magnitude display */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 24,
            padding: '16px',
            borderRadius: 8,
            background: `${color}0A`,
            border: `1px solid ${color}30`,
          }}
        >
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              fontFamily: 'monospace',
              color,
              lineHeight: 1,
            }}
          >
            {eq.magnitude.toFixed(1)}
          </div>
          <div>
            <div style={{ color: '#B0B0BE', fontSize: 12, marginBottom: 2 }}>
              Magnitude ({eq.magType})
            </div>
            <div style={{ color: '#6B6B78', fontSize: 11 }}>
              {eq.magnitude >= 7.0
                ? 'Major earthquake'
                : eq.magnitude >= 5.5
                  ? 'Moderate earthquake'
                  : 'Light earthquake'}
            </div>
          </div>
        </div>

        {/* Tsunami warning */}
        {eq.tsunami && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 12px',
              borderRadius: 6,
              background: 'rgba(255,34,34,0.08)',
              border: '1px solid rgba(255,34,34,0.25)',
              marginBottom: 20,
              color: '#FF4444',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <span style={{ fontSize: 16 }}>⚠</span>
            Tsunami Warning Issued
          </div>
        )}

        {/* Details */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
            }}
          >
            <span style={{ color: '#6B6B78' }}>Depth</span>
            <span style={{ color: '#B0B0BE', fontFamily: 'monospace' }}>
              {eq.depth.toFixed(1)} km
            </span>
          </div>
          {eq.felt != null && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12,
              }}
            >
              <span style={{ color: '#6B6B78' }}>Felt Reports</span>
              <span style={{ color: '#B0B0BE', fontFamily: 'monospace' }}>
                {eq.felt.toLocaleString()}
              </span>
            </div>
          )}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
            }}
          >
            <span style={{ color: '#6B6B78' }}>Significance</span>
            <span style={{ color: '#B0B0BE', fontFamily: 'monospace' }}>
              {eq.significance}
            </span>
          </div>
          {eq.alert && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12,
              }}
            >
              <span style={{ color: '#6B6B78' }}>Alert Level</span>
              <span
                style={{
                  color:
                    eq.alert === 'red'
                      ? '#FF2222'
                      : eq.alert === 'orange'
                        ? '#FF6622'
                        : eq.alert === 'yellow'
                          ? '#FFAA22'
                          : '#22C55E',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  fontSize: 11,
                }}
              >
                {eq.alert}
              </span>
            </div>
          )}
        </div>

        {/* Link to USGS */}
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
            cursor: 'pointer',
          }}
        >
          View on USGS →
        </a>
      </div>
    </>
  );
}

// --- Main panel ---

function EventDetailPanel({
  item,
  relatedMarkets,
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

  // Mobile: bottom sheet
  if (isMobile) {
    return (
      <>
        {/* Backdrop overlay */}
        {isOpen && (
          <div
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 14,
              background: 'rgba(0,0,0,0.5)',
            }}
          />
        )}
        <div
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            maxHeight: '70vh',
            background: '#1A1A25',
            borderTop: '1px solid #2A2A35',
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
              {/* Drag handle + close */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px 12px 0',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 4,
                    borderRadius: 2,
                    background: '#333345',
                  }}
                />
                <button
                  onClick={onClose}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: 8,
                    background: 'none',
                    border: 'none',
                    color: '#6B6B78',
                    cursor: 'pointer',
                    padding: 4,
                    fontSize: 18,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>

              {item.type === 'event' && (
                <EventContent event={item.data} relatedMarkets={relatedMarkets} />
              )}
              {item.type === 'market' && <MarketContent market={item.data} />}
              {item.type === 'earthquake' && <EarthquakeContent eq={item.data} />}
            </>
          )}
        </div>
      </>
    );
  }

  // Desktop: right sidebar
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: 380,
        background: '#1A1A25',
        borderLeft: '1px solid #2A2A35',
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
          {/* Close button row */}
          <div
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              zIndex: 11,
            }}
          >
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#6B6B78',
                cursor: 'pointer',
                padding: 4,
                fontSize: 18,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          {item.type === 'event' && (
            <EventContent event={item.data} relatedMarkets={relatedMarkets} />
          )}
          {item.type === 'market' && <MarketContent market={item.data} />}
          {item.type === 'earthquake' && <EarthquakeContent eq={item.data} />}
        </>
      )}
    </div>
  );
}

export default memo(EventDetailPanel);
