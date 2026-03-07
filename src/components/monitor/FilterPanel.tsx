'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import Link from 'next/link';
import { THEMES, THEME_KEYS, type ThemeKey } from '@/lib/monitor/themes';
import type { MonitorResponseMeta } from '@/lib/monitor/response';
import type { SituationRoomConfig } from '@/lib/monitor/types';

type LayerKey = 'notams' | 'shipping' | 'elections';

interface FilterPanelProps {
  visibleThemes: Record<ThemeKey, boolean>;
  onToggleTheme: (key: ThemeKey) => void;
  visibleLayers: Record<LayerKey, boolean>;
  onToggleLayer: (key: LayerKey) => void;
  situationRooms: SituationRoomConfig[];
  activeSituationRoomId: string | null;
  onSelectSituationRoom: (roomId: string) => void;
  themeCounts: Record<ThemeKey, number>;
  sourceHealth?: {
    events?: MonitorResponseMeta | null;
    markets?: MonitorResponseMeta | null;
    disasters?: MonitorResponseMeta | null;
    notams?: MonitorResponseMeta | null;
    shipping?: MonitorResponseMeta | null;
    elections?: MonitorResponseMeta | null;
  };
}

/* ── SVG Icons (16x16) ── */

const IconCrosshair = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
    <circle cx="8" cy="8" r="5" />
    <line x1="8" y1="1" x2="8" y2="4" />
    <line x1="8" y1="12" x2="8" y2="15" />
    <line x1="1" y1="8" x2="4" y2="8" />
    <line x1="12" y1="8" x2="15" y2="8" />
  </svg>
);

const IconBallot = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
    <rect x="3" y="2" width="10" height="12" rx="1" />
    <line x1="6" y1="5" x2="10" y2="5" />
    <line x1="6" y1="8" x2="10" y2="8" />
    <line x1="6" y1="11" x2="9" y2="11" />
  </svg>
);

const IconTrending = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
    <polyline points="1,12 5,7 9,9 15,3" />
    <polyline points="11,3 15,3 15,7" />
  </svg>
);

const IconWave = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
    <path d="M1,8 Q3,4 5,8 Q7,12 9,8 Q11,4 13,8 Q14,10 15,8" />
    <line x1="1" y1="13" x2="15" y2="13" strokeWidth="0.8" opacity="0.5" />
  </svg>
);

const IconCable = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
    <circle cx="3" cy="8" r="2" />
    <circle cx="13" cy="8" r="2" />
    <line x1="5" y1="8" x2="11" y2="8" />
    <line x1="3" y1="3" x2="3" y2="6" />
    <line x1="13" y1="3" x2="13" y2="6" />
  </svg>
);

const IconHamburger = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <line x1="3" y1="5" x2="15" y2="5" />
    <line x1="3" y1="9" x2="15" y2="9" />
    <line x1="3" y1="13" x2="15" y2="13" />
  </svg>
);

const IconClose = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <line x1="4" y1="4" x2="14" y2="14" />
    <line x1="14" y1="4" x2="4" y2="14" />
  </svg>
);

const IconChevron = ({ open }: { open: boolean }) => (
  <svg
    width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
    style={{ transition: 'transform 200ms ease', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
  >
    <polyline points="4,2 8,6 4,10" />
  </svg>
);

const IconCheck = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round">
    <polyline points="2,6 5,9 10,3" />
  </svg>
);

/* ── Theme icon mapping ── */

const THEME_ICONS: Record<ThemeKey, React.FC> = {
  conflicts: IconCrosshair,
  elections: IconBallot,
  economy: IconTrending,
  disasters: IconWave,
  infrastructure: IconCable,
};

const LAYER_CONFIGS: Record<LayerKey, { label: string; color: string }> = {
  notams: { label: 'NOTAM Airspace', color: '#FF6B3D' },
  shipping: { label: 'Shipping Chokepoints', color: '#00DDCC' },
  elections: { label: 'Election Calendar', color: '#66AAFF' },
};

/* ── Toggle switch ── */

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

/* ── Section header ── */

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

/* ── Data sources section ── */

function formatSourceDetail(meta: MonitorResponseMeta | null | undefined, fallback: string): string {
  if (!meta) return `Pending • ${fallback}`;
  const coverage = meta.sourceCoverage || [];
  const healthy = coverage.filter((s) => !s.failed).length;
  const freshness = `${Math.max(0, Math.round(meta.freshnessSeconds))}s`;

  if (coverage.length > 0) {
    return `${healthy}/${coverage.length} healthy • ${freshness} • ${meta.cacheState}`;
  }
  return `${freshness} • ${meta.cacheState}`;
}

/* ── Main component ── */

function FilterPanel({
  visibleThemes,
  onToggleTheme,
  visibleLayers,
  onToggleLayer,
  situationRooms,
  activeSituationRoomId,
  onSelectSituationRoom,
  themeCounts,
  sourceHealth,
}: FilterPanelProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
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
      detail: formatSourceDetail(sourceHealth?.notams, 'Airspace closures'),
    },
    {
      label: 'Shipping Overlay',
      detail: formatSourceDetail(sourceHealth?.shipping, 'Chokepoint traffic'),
    },
    {
      label: 'Election Overlay',
      detail: formatSourceDetail(sourceHealth?.elections, 'Global election calendar'),
    },
    {
      label: 'Ongoing Situations',
      detail: 'Curated static dataset',
    },
  ];

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

  const togglePanel = useCallback(() => setPanelOpen((p) => !p), []);
  const closePanel = useCallback(() => setPanelOpen(false), []);

  const panelContent = (
    <div
      style={{
        width: 240,
        minWidth: 240,
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
      {/* Header with close button on mobile */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <SectionHeader>Themes</SectionHeader>
        {isMobile && (
          <button
            onClick={closePanel}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: 'transparent',
              border: '1px solid #334155',
              color: '#64748B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              marginBottom: 10,
            }}
          >
            <IconClose />
          </button>
        )}
      </div>

      {/* Theme toggles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {THEME_KEYS.map((key) => {
          const theme = THEMES[key];
          const Icon = THEME_ICONS[key];
          const isOn = visibleThemes[key];
          const count = themeCounts[key];

          return (
            <div
              key={key}
              onClick={() => onToggleTheme(key)}
              style={{
                padding: '7px 8px',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'background 150ms ease',
                color: isOn ? '#CBD5E1' : '#64748B',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#1E293B'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              {/* Colored dot */}
              <div
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: isOn ? theme.color : '#475569',
                  flexShrink: 0,
                  transition: 'background 150ms ease',
                }}
              />
              {/* Icon */}
              <span style={{ flexShrink: 0, opacity: isOn ? 0.9 : 0.4, transition: 'opacity 150ms ease' }}>
                <Icon />
              </span>
              {/* Label */}
              <span style={{ flex: 1, fontSize: 12, lineHeight: '16px' }}>{theme.label}</span>
              {/* Count badge */}
              {count > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: isOn ? theme.color : '#475569',
                    background: isOn ? `${theme.color}15` : 'transparent',
                    padding: '1px 5px',
                    borderRadius: 3,
                    minWidth: 20,
                    textAlign: 'center',
                    transition: 'color 150ms ease, background 150ms ease',
                  }}
                >
                  {count}
                </span>
              )}
              {/* Toggle */}
              <ToggleSwitch on={isOn} color={theme.color} />
            </div>
          );
        })}
      </div>

      <div style={{ borderTop: '1px solid #1E293B', margin: '14px 0' }} />

      <SectionHeader>Layers</SectionHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {(Object.keys(LAYER_CONFIGS) as LayerKey[]).map((key) => {
          const cfg = LAYER_CONFIGS[key];
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
                userSelect: 'none',
                transition: 'background 150ms ease',
                color: isOn ? '#CBD5E1' : '#64748B',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#1E293B'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <div
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: isOn ? cfg.color : '#475569',
                }}
              />
              <span style={{ flex: 1, fontSize: 12, lineHeight: '16px' }}>{cfg.label}</span>
              <ToggleSwitch on={isOn} color={cfg.color} />
            </div>
          );
        })}
      </div>

      <div style={{ borderTop: '1px solid #1E293B', margin: '14px 0' }} />

      <SectionHeader>Situation Rooms</SectionHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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

      {/* Divider */}
      <div style={{ borderTop: '1px solid #1E293B', margin: '14px 0' }} />

      {/* Data Sources (collapsible) */}
      <div
        onClick={() => setSourcesOpen((p) => !p)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          cursor: 'pointer',
          userSelect: 'none',
          marginBottom: sourcesOpen ? 10 : 0,
        }}
      >
        <IconChevron open={sourcesOpen} />
        <span
          style={{
            color: '#64748B',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Data Sources
        </span>
      </div>

      {sourcesOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 4 }}>
          {dataSources.map(({ label, detail }) => (
            <div
              key={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 6px',
                borderRadius: 4,
              }}
            >
              <IconCheck />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: '#94A3B8', lineHeight: '14px' }}>{label}</div>
                <div style={{ fontSize: 9, color: '#475569', lineHeight: '12px' }}>{detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Footer */}
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
          <Link
            href="/"
            style={{
              color: '#475569',
              textDecoration: 'none',
              transition: 'color 150ms ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = '#64748B';
              (e.currentTarget as HTMLElement).style.textDecoration = 'underline';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = '#475569';
              (e.currentTarget as HTMLElement).style.textDecoration = 'none';
            }}
          >
            Robert Williams
          </Link>
        </span>
      </div>
    </div>
  );

  // Desktop: always visible
  if (!isMobile) {
    return panelContent;
  }

  // Mobile: zero-width in flex flow, everything absolutely positioned
  return (
    <div style={{ width: 0, minWidth: 0, position: 'relative' }}>
      {/* Hamburger button (only when panel closed) */}
      {!panelOpen && (
        <button
          onClick={togglePanel}
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          <IconHamburger />
        </button>
      )}

      {/* Overlay */}
      {panelOpen && (
        <div
          onClick={closePanel}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 20,
            background: 'rgba(0,0,0,0.5)',
          }}
        />
      )}

      {/* Sliding panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 22,
          transform: panelOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 300ms ease',
        }}
      >
        {panelContent}
      </div>
    </div>
  );
}

export default memo(FilterPanel);
