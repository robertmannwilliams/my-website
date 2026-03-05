'use client';

import { useEffect, useState, useCallback, memo } from 'react';

interface MarketPrice {
  symbol: string;
  name: string;
  price: number | null;
  change_percent: number | null;
  last_updated: string;
}

function formatPrice(price: number, symbol: string): string {
  if (symbol === 'BTC') return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (symbol === '10Y') return price.toFixed(3) + '%';
  if (symbol === 'VIX') return price.toFixed(2);
  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatChange(change: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
}

function PriceTicker() {
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const [minutesAgo, setMinutesAgo] = useState(0);

  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch('/api/markets/prices');
      if (!res.ok) return;
      const data: MarketPrice[] = await res.json();
      setPrices(data);
      setLastFetchedAt(Date.now());
    } catch {
      // Keep existing data on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 60_000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  // Update relative time every 30s
  useEffect(() => {
    const tick = () => {
      if (lastFetchedAt) {
        setMinutesAgo(Math.floor((Date.now() - lastFetchedAt) / 60_000));
      }
    };
    tick();
    const interval = setInterval(tick, 30_000);
    return () => clearInterval(interval);
  }, [lastFetchedAt]);

  return (
    <div
      style={{
        height: 40,
        minHeight: 40,
        background: '#111827',
        borderTop: '1px solid #334155',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 16,
        paddingRight: 16,
        gap: 0,
        overflow: 'hidden',
        fontFamily: "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace",
      }}
    >
      {/* Price items */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        {loading && prices.length === 0
          ? Array.from({ length: 7 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '0 16px',
                  }}
                >
                  <span
                    style={{
                      width: 28,
                      height: 10,
                      background: '#1E293B',
                      borderRadius: 2,
                      display: 'inline-block',
                      animation: 'tickerPulse 1.5s ease-in-out infinite',
                    }}
                  />
                  <span
                    style={{
                      width: 52,
                      height: 10,
                      background: '#1E293B',
                      borderRadius: 2,
                      display: 'inline-block',
                      animation: 'tickerPulse 1.5s ease-in-out infinite',
                      animationDelay: '0.2s',
                    }}
                  />
                </div>
                {i < 6 && (
                  <span style={{ color: '#334155', fontSize: 11 }}>|</span>
                )}
              </div>
            ))
          : prices.map((item, i) => (
              <div key={item.symbol} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '0 16px',
                  }}
                >
                  <span
                    style={{
                      color: '#64748B',
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '0.03em',
                    }}
                  >
                    {item.symbol}
                  </span>
                  <span style={{ color: '#E8E8ED', fontSize: 12 }}>
                    {item.price != null ? formatPrice(item.price, item.symbol) : '—'}
                  </span>
                  {item.change_percent != null && (
                    <span
                      style={{
                        color: item.change_percent >= 0 ? '#22C55E' : '#EF4444',
                        fontSize: 11,
                      }}
                    >
                      {formatChange(item.change_percent)}
                    </span>
                  )}
                </div>
                {i < prices.length - 1 && (
                  <span style={{ color: '#334155', fontSize: 11 }}>|</span>
                )}
              </div>
            ))}
      </div>

      {/* Last updated indicator */}
      {lastFetchedAt && (
        <span
          style={{
            color: '#475569',
            fontSize: 10,
            whiteSpace: 'nowrap',
            flexShrink: 0,
            paddingLeft: 12,
          }}
        >
          Updated {minutesAgo < 1 ? 'just now' : `${minutesAgo}m ago`}
        </span>
      )}

      <style>{`
        @keyframes tickerPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}

export default memo(PriceTicker);
