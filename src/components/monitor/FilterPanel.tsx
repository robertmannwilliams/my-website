'use client';

import { useState, useEffect, useCallback, memo } from 'react';

interface FilterPanelProps {
  visibleLayers: Record<string, boolean>;
  onToggleLayer: (key: string) => void;
}

/* ── SVG Icons (16×16) ── */

const IconCrosshair = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
    <circle cx="8" cy="8" r="5" />
    <line x1="8" y1="1" x2="8" y2="4" />
    <line x1="8" y1="12" x2="8" y2="15" />
    <line x1="1" y1="8" x2="4" y2="8" />
    <line x1="12" y1="8" x2="15" y2="8" />
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

const IconPlane = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
    <path d="M8,2 L10,7 L15,8 L10,9 L8,14 L6,9 L1,8 L6,7 Z" />
  </svg>
);

const IconShip = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
    <path d="M2,10 L4,5 L12,5 L14,10" />
    <line x1="8" y1="5" x2="8" y2="2" />
    <path d="M1,10 Q4,13 8,13 Q12,13 15,10" />
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

const IconBallot = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
    <rect x="3" y="2" width="10" height="12" rx="1" />
    <line x1="6" y1="5" x2="10" y2="5" />
    <line x1="6" y1="8" x2="10" y2="8" />
    <line x1="6" y1="11" x2="9" y2="11" />
  </svg>
);

const IconShield = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
    <path d="M8,2 L13,4 L13,9 Q13,13 8,14 Q3,13 3,9 L3,4 Z" />
    <line x1="5" y1="6" x2="11" y2="12" />
    <line x1="11" y1="6" x2="5" y2="12" />
  </svg>
);

const IconBarrel = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
    <ellipse cx="8" cy="3" rx="5" ry="1.5" />
    <ellipse cx="8" cy="13" rx="5" ry="1.5" />
    <line x1="3" y1="3" x2="3" y2="13" />
    <line x1="13" y1="3" x2="13" y2="13" />
    <ellipse cx="8" cy="8" rx="5" ry="1.5" strokeDasharray="2 2" opacity="0.5" />
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

/* ── Layer config ── */

const ACTIVE_LAYERS = [
  { key: 'events', label: 'Geopolitical Events', Icon: IconCrosshair },
  { key: 'markets', label: 'Prediction Markets', Icon: IconTrending },
  { key: 'earthquakes', label: 'Earthquakes', Icon: IconWave },
] as const;

const FUTURE_LAYERS = [
  { label: 'Airspace', Icon: IconPlane },
  { label: 'Shipping', Icon: IconShip },
  { label: 'Cables', Icon: IconCable },
  { label: 'Elections', Icon: IconBallot },
  { label: 'Sanctions', Icon: IconShield },
  { label: 'Commodities', Icon: IconBarrel },
] as const;

const SITUATION_ROOMS = [
  { label: 'Ukraine', icon: '\u{1F1FA}\u{1F1E6}' },
  { label: 'Middle East', icon: '\u{1F30D}' },
  { label: 'South China Sea', icon: '\u{2693}' },
  { label: 'Global Elections', icon: '\u{1F5F3}\u{FE0F}' },
] as const;

/* ── Toggle switch ── */

function ToggleSwitch({ on, disabled }: { on: boolean; disabled?: boolean }) {
  return (
    <div
      style={{
        width: 32,
        height: 16,
        borderRadius: 8,
        background: disabled ? '#252530' : on ? '#4A9EFF' : '#333345',
        position: 'relative',
        flexShrink: 0,
        transition: 'background 200ms ease',
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: disabled ? '#444458' : '#FFFFFF',
          position: 'absolute',
          top: 2,
          left: on && !disabled ? 18 : 2,
          transition: 'left 200ms ease',
        }}
      />
    </div>
  );
}

/* ── Tooltip wrapper ── */

function WithTooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: 6,
            padding: '4px 8px',
            borderRadius: 4,
            background: '#1A1A25',
            border: '1px solid #2A2A35',
            color: '#8888A0',
            fontSize: 10,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 20,
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
}

/* ── Section header ── */

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        color: '#6B6B78',
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

/* ── Main component ── */

function FilterPanel({ visibleLayers, onToggleLayer }: FilterPanelProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

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
        background: '#12121A',
        borderRight: '1px solid #2A2A35',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 14px',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      {/* ── Layers header with close button on mobile ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <SectionHeader>Layers</SectionHeader>
        {isMobile && (
          <button
            onClick={closePanel}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: 'transparent',
              border: '1px solid #2A2A35',
              color: '#6B6B78',
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Active layers */}
        {ACTIVE_LAYERS.map(({ key, label, Icon }) => {
          const isOn = visibleLayers[key] !== false;
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
                color: isOn ? '#C0C0CC' : '#555568',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#1A1A25'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <span style={{ flexShrink: 0, opacity: isOn ? 0.9 : 0.4, transition: 'opacity 150ms ease' }}>
                <Icon />
              </span>
              <span style={{ flex: 1, fontSize: 12, lineHeight: '16px' }}>{label}</span>
              <ToggleSwitch on={isOn} />
            </div>
          );
        })}

        {/* Future layers */}
        {FUTURE_LAYERS.map(({ label, Icon }) => (
          <WithTooltip key={label} text="Coming Soon">
            <div
              style={{
                padding: '7px 8px',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                opacity: 0.35,
                cursor: 'default',
                userSelect: 'none',
                color: '#555568',
              }}
            >
              <span style={{ flexShrink: 0 }}>
                <Icon />
              </span>
              <span style={{ flex: 1, fontSize: 12, lineHeight: '16px' }}>{label}</span>
              <ToggleSwitch on={false} disabled />
            </div>
          </WithTooltip>
        ))}
      </div>

      {/* ── Divider ── */}
      <div style={{ borderTop: '1px solid #1E1E2A', margin: '14px 0' }} />

      {/* ── Situation Rooms ── */}
      <SectionHeader>Situation Rooms</SectionHeader>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {SITUATION_ROOMS.map(({ label, icon }) => (
          <WithTooltip key={label} text="Coming Soon">
            <div
              style={{
                padding: '6px 8px',
                borderRadius: 6,
                border: '1px solid #1E1E2A',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                opacity: 0.35,
                cursor: 'default',
                userSelect: 'none',
              }}
            >
              <span style={{ fontSize: 14, lineHeight: 1 }}>{icon}</span>
              <span style={{ fontSize: 12, color: '#555568' }}>{label}</span>
            </div>
          </WithTooltip>
        ))}
      </div>

      {/* ── Spacer ── */}
      <div style={{ flex: 1 }} />

      {/* ── Footer ── */}
      <div
        style={{
          paddingTop: 12,
          borderTop: '1px solid #1E1E2A',
          marginTop: 14,
          textAlign: 'center',
        }}
      >
        <span style={{ fontSize: 10, color: '#333345' }}>
          Built by{' '}
          <a
            href="/"
            style={{
              color: '#444458',
              textDecoration: 'none',
              transition: 'color 150ms ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = '#6B6B78';
              (e.currentTarget as HTMLElement).style.textDecoration = 'underline';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = '#444458';
              (e.currentTarget as HTMLElement).style.textDecoration = 'none';
            }}
          >
            Robert Williams
          </a>
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
            background: 'rgba(18,18,26,0.85)',
            border: '1px solid #2A2A35',
            color: '#8888A0',
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
