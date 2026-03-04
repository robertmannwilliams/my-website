'use client';

import { useEffect, useState, useCallback, memo } from 'react';

interface Headline {
  title: string;
  source: string;
  url: string;
  timestamp: string;
  isBreaking: boolean;
}

function NewsTicker() {
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHeadlines = useCallback(async () => {
    try {
      const res = await fetch('/api/events/headlines');
      if (!res.ok) return;
      const data: Headline[] = await res.json();
      setHeadlines(data);
    } catch {
      // Keep existing data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHeadlines();
    const interval = setInterval(fetchHeadlines, 10 * 60_000);
    return () => clearInterval(interval);
  }, [fetchHeadlines]);

  // Duplicate items for seamless infinite scroll
  const items = headlines.length > 0 ? [...headlines, ...headlines] : [];

  return (
    <div
      style={{
        height: 32,
        minHeight: 32,
        background: '#12121A',
        borderBottom: '1px solid #2A2A35',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* LIVE indicator */}
      <div
        style={{
          paddingLeft: 16,
          paddingRight: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          zIndex: 1,
          background: '#12121A',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#FF4444',
            display: 'inline-block',
            animation: 'livePulse 2s ease-in-out infinite',
          }}
        />
        <span
          style={{
            color: '#4A9EFF',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          Live
        </span>
      </div>

      {/* Scrolling area */}
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
          maskImage:
            'linear-gradient(to right, transparent 0%, black 2%, black 98%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to right, transparent 0%, black 2%, black 98%, transparent 100%)',
        }}
      >
        {loading && headlines.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              height: '100%',
              paddingLeft: 8,
              gap: 24,
            }}
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    width: 36,
                    height: 10,
                    background: '#1A1A25',
                    borderRadius: 2,
                    display: 'inline-block',
                    animation: 'newsPulse 1.5s ease-in-out infinite',
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
                <span
                  style={{
                    width: 100 + i * 20,
                    height: 10,
                    background: '#1A1A25',
                    borderRadius: 2,
                    display: 'inline-block',
                    animation: 'newsPulse 1.5s ease-in-out infinite',
                    animationDelay: `${i * 0.15 + 0.1}s`,
                  }}
                />
              </div>
            ))}
          </div>
        ) : headlines.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              height: '100%',
              paddingLeft: 8,
            }}
          >
            <span style={{ color: '#6B6B78', fontSize: 12 }}>
              No headlines available
            </span>
          </div>
        ) : (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: '100%',
              whiteSpace: 'nowrap',
              animation: `tickerScroll ${headlines.length * 4}s linear infinite`,
            }}
          >
            {items.map((h, i) => (
              <a
                key={`${h.url}-${i}`}
                href={h.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  paddingRight: 32,
                  textDecoration: 'none',
                  flexShrink: 0,
                }}
              >
                {h.isBreaking && (
                  <span
                    style={{
                      color: '#FF4444',
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                    }}
                  >
                    BREAKING
                  </span>
                )}
                <span
                  style={{
                    color: '#6B6B78',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {h.source}:
                </span>
                <span
                  style={{
                    color: h.isBreaking ? '#FF4444' : '#E8E8ED',
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  {h.title}
                </span>
                <span style={{ color: '#2A2A35', padding: '0 8px' }}>
                  /
                </span>
              </a>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes tickerScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes livePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes newsPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}

export default memo(NewsTicker);
