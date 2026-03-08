'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import type {
  EventEvidence,
  EventScenario,
  GdeltEvent,
  GeopoliticalEventsPayload,
} from '@/lib/monitor/events';
import type { PolymarketMarket } from '@/lib/monitor/polymarket';
import { findRelatedMarkets } from '@/lib/monitor/polymarket';
import type { UsgsEarthquake } from '@/lib/monitor/usgs';
import type {
  ActiveFanout,
  ElectionCalendarItem,
  EventConfidenceGate,
  MapInteractionMode,
  MapItem,
  MapSelectionCandidate,
  NotamZone,
  ShippingChokepoint,
  SignalKey,
  SituationRoomConfig,
  WatchZone,
} from '@/lib/monitor/types';
import { type ThemeKey, computeThemeCounts } from '@/lib/monitor/themes';
import type { MonitorResponse, MonitorResponseMeta } from '@/lib/monitor/response';
import watchZonesData from '@/app/monitor/data/watch-zones.json';
import roomsData from '@/app/monitor/data/situation-rooms.json';

const MonitorMap = dynamic(() => import('@/components/monitor/MonitorMap'), {
  ssr: false,
});

const PriceTicker = dynamic(() => import('@/components/monitor/PriceTicker'), {
  ssr: false,
});

const SituationBriefBar = dynamic(() => import('@/components/monitor/SituationBriefBar'), {
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

const watchZones = watchZonesData as WatchZone[];
const situationRooms = roomsData as SituationRoomConfig[];

type OffMapReasonCode = 'speculative' | 'geo_invalid' | 'geo_ambiguous' | 'low_confidence';

interface OffMapEventPreview {
  id: string;
  title: string;
  severity: GdeltEvent['severity'];
  lastSeenAt: string;
  reasonCode: OffMapReasonCode;
  reasonLabel: string;
  geoReason: string;
}

interface FocusEventRequest {
  lat: number;
  lng: number;
  seq: number;
}

function makeDefaultThemes(): Record<ThemeKey, boolean> {
  return {
    conflicts: true,
    elections: true,
    economy: true,
    disasters: true,
    infrastructure: true,
  };
}

function makeDefaultSignals(): Record<SignalKey, boolean> {
  return {
    events: true,
    markets: true,
    disasters: true,
    infrastructure_overlays: true,
    watch_zones: true,
  };
}

function makeDefaultWatchZoneVisibility(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const zone of watchZones) out[zone.id] = true;
  return out;
}

function roomSignalVisibility(room: SituationRoomConfig): Record<SignalKey, boolean> {
  const out: Record<SignalKey, boolean> = {
    events: false,
    markets: false,
    disasters: false,
    infrastructure_overlays: false,
    watch_zones: false,
  };
  const defaults = room.defaultSignalTypes || [];
  if (defaults.length === 0) return makeDefaultSignals();
  for (const key of defaults) out[key] = true;
  return out;
}

function roomWatchZoneVisibility(room: SituationRoomConfig): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const zone of watchZones) out[zone.id] = false;

  const configured = room.defaultWatchZoneIds || [];
  if (configured.length > 0) {
    for (const id of configured) out[id] = true;
    return out;
  }

  for (const zone of watchZones) {
    if (zone.roomIds.includes(room.id)) out[zone.id] = true;
  }

  return out;
}

function roomThemeVisibility(room: SituationRoomConfig): Record<ThemeKey, boolean> {
  return {
    conflicts: room.activeThemes.includes('conflicts'),
    elections: room.activeThemes.includes('elections'),
    economy: room.activeThemes.includes('economy'),
    disasters: room.activeThemes.includes('disasters'),
    infrastructure: room.activeThemes.includes('infrastructure'),
  };
}

function getInitialRoomFromStorage(): SituationRoomConfig | null {
  if (typeof window === 'undefined') return null;
  const saved = window.localStorage.getItem('monitor:last-focus');
  if (!saved || saved === 'global') return null;
  const [kind, roomId] = saved.split(':');
  if (kind !== 'room' || !roomId) return null;
  return situationRooms.find((room) => room.id === roomId) || null;
}

function getInitialEventConfidenceGate(): EventConfidenceGate {
  if (typeof window === 'undefined') return 'strict';
  const raw = window.localStorage.getItem('monitor:event-confidence-gate');
  if (raw === 'strict' || raw === 'balanced' || raw === 'all') return raw;
  return 'strict';
}

function offMapReasonForEvent(event: GdeltEvent, gate: EventConfidenceGate): OffMapReasonCode | null {
  const weakStrict =
    event.severity === 'monitor' &&
    event.sourceCount < 2 &&
    event.classificationConfidence < 0.72;
  const weakBalanced =
    event.severity === 'monitor' &&
    event.sourceCount < 2 &&
    event.classificationConfidence < 0.58;

  if (gate === 'strict') {
    if (event.status === 'speculative') return 'speculative';
    if (event.geoValidity === 'invalid') return 'geo_invalid';
    if (event.geoValidity === 'ambiguous') return 'geo_ambiguous';
    if (weakStrict) return 'low_confidence';
    return null;
  }

  if (gate === 'balanced') {
    if (event.status === 'speculative') return 'speculative';
    if (event.geoValidity === 'invalid') return 'geo_invalid';
    if (weakBalanced) return 'low_confidence';
    return null;
  }

  if (event.geoValidity === 'invalid') return 'geo_invalid';
  return null;
}

function offMapReasonLabel(reason: OffMapReasonCode): string {
  if (reason === 'speculative') return 'Speculative framing';
  if (reason === 'geo_invalid') return 'Geo unresolved';
  if (reason === 'geo_ambiguous') return 'Geo ambiguous';
  return 'Low confidence';
}

function severityOrder(severity: GdeltEvent['severity']): number {
  if (severity === 'critical') return 3;
  if (severity === 'watch') return 2;
  return 1;
}

function normalizeEventShape(event: GdeltEvent): GdeltEvent {
  const topicTags = Array.isArray(event.topicTags) ? event.topicTags : [];
  const signalScore = Number(event.signalScore) || 0;
  const status =
    event.status === 'observed' || event.status === 'upcoming' || event.status === 'speculative'
      ? event.status
      : 'observed';
  const actors = Array.isArray(event.actors)
    ? event.actors.filter((actor): actor is string => typeof actor === 'string').slice(0, 8)
    : [];
  const eventTime =
    typeof event.eventTime === 'string' && Number.isFinite(new Date(event.eventTime).getTime())
      ? new Date(event.eventTime).toISOString()
      : null;
  return {
    ...event,
    status,
    actors,
    eventTime,
    topicTags,
    signalScore,
    mapPriority: Number(event.mapPriority) || signalScore,
    geoValidity: event.geoValidity || 'invalid',
    geoReason: event.geoReason || 'location unavailable',
    evidenceIds: Array.isArray(event.evidenceIds) ? event.evidenceIds : [],
    scenarioIds: Array.isArray(event.scenarioIds) ? event.scenarioIds : [],
  };
}

function normalizeMarketShape(market: PolymarketMarket): PolymarketMarket {
  const topicTags = Array.isArray(market.topicTags) ? market.topicTags : [];
  const signalScore = Number(market.signalScore) || 0;
  return {
    ...market,
    topicTags,
    signalScore,
    mapPriority: Number(market.mapPriority) || signalScore,
    linkConfidence: market.linkConfidence != null ? Number(market.linkConfidence) : undefined,
    geoValidity: market.geoValidity || 'invalid',
    geoReason: market.geoReason || 'location unavailable',
  };
}

export default function MonitorPage() {
  const initialRoom = getInitialRoomFromStorage();

  const [selectedItem, setSelectedItem] = useState<MapItem | null>(
    () => (initialRoom ? { type: 'room', data: initialRoom } : null),
  );
  const [activeRoom, setActiveRoom] = useState<SituationRoomConfig | null>(initialRoom);
  const [focusMode, setFocusMode] = useState<'global' | 'room'>(initialRoom ? 'room' : 'global');
  const [allEvents, setAllEvents] = useState<GdeltEvent[]>([]);
  const [allEventEvidence, setAllEventEvidence] = useState<EventEvidence[]>([]);
  const [allEventScenarios, setAllEventScenarios] = useState<EventScenario[]>([]);
  const [allMarkets, setAllMarkets] = useState<PolymarketMarket[]>([]);
  const [allEarthquakes, setAllEarthquakes] = useState<UsgsEarthquake[]>([]);
  const [notamZones, setNotamZones] = useState<NotamZone[]>([]);
  const [shippingChokepoints, setShippingChokepoints] = useState<ShippingChokepoint[]>([]);
  const [elections, setElections] = useState<ElectionCalendarItem[]>([]);
  const [eventsMeta, setEventsMeta] = useState<MonitorResponseMeta | null>(null);
  const [marketsMeta, setMarketsMeta] = useState<MonitorResponseMeta | null>(null);
  const [disastersMeta, setDisastersMeta] = useState<MonitorResponseMeta | null>(null);
  const [layersMeta, setLayersMeta] = useState<{
    notams: MonitorResponseMeta | null;
    shipping: MonitorResponseMeta | null;
    elections: MonitorResponseMeta | null;
  }>({
    notams: null,
    shipping: null,
    elections: null,
  });
  const [visibleThemes, setVisibleThemes] = useState<Record<ThemeKey, boolean>>(
    () => (initialRoom ? roomThemeVisibility(initialRoom) : makeDefaultThemes()),
  );
  const [visibleSignals, setVisibleSignals] = useState<Record<SignalKey, boolean>>(
    () => (initialRoom ? roomSignalVisibility(initialRoom) : makeDefaultSignals()),
  );
  const [visibleWatchZones, setVisibleWatchZones] = useState<Record<string, boolean>>(
    () => (initialRoom ? roomWatchZoneVisibility(initialRoom) : makeDefaultWatchZoneVisibility()),
  );
  const [eventConfidenceGate, setEventConfidenceGate] = useState<EventConfidenceGate>(() => getInitialEventConfidenceGate());
  const [temporaryPlottedEventIds, setTemporaryPlottedEventIds] = useState<string[]>([]);
  const [focusEventRequest, setFocusEventRequest] = useState<FocusEventRequest | null>(null);
  const [selectionContext, setSelectionContext] = useState<{ title: string; candidates: MapSelectionCandidate[] } | null>(null);
  const [activeFanout, setActiveFanout] = useState<ActiveFanout | null>(null);
  const [interactionMode, setInteractionMode] = useState<MapInteractionMode>('idle');
  const [forceClearFanoutKey, setForceClearFanoutKey] = useState(0);

  const globalSnapshotRef = useRef({
    themes: makeDefaultThemes(),
    signals: makeDefaultSignals(),
    watchZones: makeDefaultWatchZoneVisibility(),
  });

  const handleEventClick = useCallback((event: GdeltEvent) => {
    setSelectionContext(null);
    setInteractionMode(activeFanout && activeFanout.candidateIds.includes(event.id) ? 'selected' : 'idle');
    setSelectedItem({ type: 'event', data: event });
  }, [activeFanout]);

  const handleMarketClick = useCallback((market: PolymarketMarket) => {
    setSelectionContext(null);
    setInteractionMode(activeFanout && activeFanout.candidateIds.includes(market.id) ? 'selected' : 'idle');
    setSelectedItem({ type: 'market', data: market });
  }, [activeFanout]);

  const handleEarthquakeClick = useCallback((eq: UsgsEarthquake) => {
    setSelectionContext(null);
    setInteractionMode('idle');
    setSelectedItem({ type: 'earthquake', data: eq });
  }, []);

  const handleWatchZoneClick = useCallback((watchZone: WatchZone) => {
    setSelectionContext(null);
    setInteractionMode('idle');
    setSelectedItem({ type: 'watch_zone', data: watchZone });
  }, []);

  const handleSelectionCandidates = useCallback((title: string, candidates: MapSelectionCandidate[]) => {
    const context = { title, candidates };
    setSelectionContext(context);
    setInteractionMode('idle');

    if (candidates.length === 1) {
      const candidate = candidates[0];
      if (candidate.type === 'event') setSelectedItem({ type: 'event', data: candidate.data });
      if (candidate.type === 'market') setSelectedItem({ type: 'market', data: candidate.data });
      if (candidate.type === 'earthquake') setSelectedItem({ type: 'earthquake', data: candidate.data });
      if (candidate.type === 'watch_zone') setSelectedItem({ type: 'watch_zone', data: candidate.data });
      return;
    }

    setSelectedItem({
      type: 'selection',
      data: context,
    });
  }, []);

  const handleSelectCandidate = useCallback((candidate: MapSelectionCandidate) => {
    if (candidate.type === 'event') setSelectedItem({ type: 'event', data: candidate.data });
    if (candidate.type === 'market') setSelectedItem({ type: 'market', data: candidate.data });
    if (candidate.type === 'earthquake') setSelectedItem({ type: 'earthquake', data: candidate.data });
    if (candidate.type === 'watch_zone') setSelectedItem({ type: 'watch_zone', data: candidate.data });
    if (activeFanout && candidate.originClusterId === activeFanout.clusterId && candidate.signalType === activeFanout.signalType) {
      setInteractionMode('selected');
    } else {
      setInteractionMode('idle');
    }
  }, [activeFanout]);

  const handleBackToSelection = useCallback(() => {
    if (!selectionContext) return;
    setInteractionMode('idle');
    setSelectedItem({
      type: 'selection',
      data: selectionContext,
    });
  }, [selectionContext]);

  const collapseFanoutAndPanel = useCallback(() => {
    setForceClearFanoutKey((prev) => prev + 1);
    setActiveFanout(null);
    setInteractionMode('idle');
    setSelectionContext(null);
    setSelectedItem(null);
  }, []);

  const handleClosePanel = useCallback(() => {
    if (activeFanout) {
      collapseFanoutAndPanel();
      return;
    }
    setInteractionMode('idle');
    setSelectedItem(null);
  }, [activeFanout, collapseFanoutAndPanel]);

  const handleFanoutChange = useCallback((fanout: ActiveFanout | null) => {
    setActiveFanout((previous) => {
      if (!fanout && previous) {
        const previousIds = new Set(previous.candidateIds);
        setInteractionMode('idle');
        setSelectedItem((current) => {
          if (!current) return null;
          if (current.type === 'fanout') return null;
          if ((current.type === 'event' || current.type === 'market') && previousIds.has(current.data.id)) {
            return null;
          }
          return current;
        });
      }

      if (fanout) {
        setSelectedItem((current) => {
          if (!current) {
            setInteractionMode('fanout');
            return { type: 'fanout', data: fanout };
          }

          if (current.type === 'event' && fanout.candidateIds.includes(current.data.id)) {
            setInteractionMode('selected');
            return current;
          }

          if (current.type === 'market' && fanout.candidateIds.includes(current.data.id)) {
            setInteractionMode('selected');
            return current;
          }

          if (current.type === 'selection') {
            setInteractionMode('idle');
            return current;
          }

          setInteractionMode('fanout');
          return { type: 'fanout', data: fanout };
        });
      }

      return fanout;
    });
  }, []);

  const handleBackToFanout = useCallback(() => {
    if (!activeFanout) return;
    setSelectionContext(null);
    setInteractionMode('fanout');
    setSelectedItem({ type: 'fanout', data: activeFanout });
  }, [activeFanout]);

  const toggleTheme = useCallback((key: ThemeKey) => {
    setVisibleThemes((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (focusMode === 'global') globalSnapshotRef.current.themes = next;
      return next;
    });
  }, [focusMode]);

  const toggleSignal = useCallback((key: SignalKey) => {
    setVisibleSignals((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (focusMode === 'global') globalSnapshotRef.current.signals = next;
      return next;
    });
  }, [focusMode]);

  const toggleWatchZone = useCallback((zoneId: string) => {
    setVisibleWatchZones((prev) => {
      const next = { ...prev, [zoneId]: !prev[zoneId] };
      if (focusMode === 'global') globalSnapshotRef.current.watchZones = next;
      return next;
    });
  }, [focusMode]);

  const handleSelectGlobalFocus = useCallback(() => {
    setForceClearFanoutKey((prev) => prev + 1);
    setFocusMode('global');
    setActiveRoom(null);
    setVisibleThemes(globalSnapshotRef.current.themes);
    setVisibleSignals(globalSnapshotRef.current.signals);
    setVisibleWatchZones(globalSnapshotRef.current.watchZones);
    setActiveFanout(null);
    setInteractionMode('idle');
    setSelectedItem(null);
    window.localStorage.setItem('monitor:last-focus', 'global');
  }, []);

  const handleSituationRoomSelect = useCallback((roomId: string) => {
    const room = situationRooms.find((r) => r.id === roomId);
    if (!room) return;

    if (focusMode === 'global') {
      globalSnapshotRef.current = {
        themes: visibleThemes,
        signals: visibleSignals,
        watchZones: visibleWatchZones,
      };
    }

    setFocusMode('room');
    setForceClearFanoutKey((prev) => prev + 1);
    setActiveRoom(room);
    setActiveFanout(null);
    setInteractionMode('idle');
    setSelectedItem({ type: 'room', data: room });

    setVisibleThemes(roomThemeVisibility(room));

    setVisibleSignals(roomSignalVisibility(room));
    setVisibleWatchZones(roomWatchZoneVisibility(room));

    window.localStorage.setItem('monitor:last-focus', `room:${room.id}`);
  }, [focusMode, visibleThemes, visibleSignals, visibleWatchZones]);

  // Fetch events
  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch('/api/events/geopolitical');
        if (res.ok) {
          const payload = (await res.json()) as
            | MonitorResponse<GdeltEvent[] | GeopoliticalEventsPayload>
            | GdeltEvent[]
            | GeopoliticalEventsPayload;
          if (Array.isArray(payload)) {
            setAllEvents(payload.map(normalizeEventShape));
            setAllEventEvidence([]);
            setAllEventScenarios([]);
          } else {
            const payloadItems = 'items' in payload ? payload.items : payload;
            if (Array.isArray(payloadItems)) {
              setAllEvents(payloadItems.map(normalizeEventShape));
              setAllEventEvidence([]);
              setAllEventScenarios([]);
            } else {
              setAllEvents((payloadItems.events || []).map(normalizeEventShape));
              setAllEventEvidence(payloadItems.evidence || []);
              setAllEventScenarios(payloadItems.scenarios || []);
            }
            if ('meta' in payload) {
              setEventsMeta(payload.meta || null);
            }
          }
        }
      } catch {
        // Silent fail
      }
    }
    loadEvents();
    const interval = setInterval(loadEvents, 5 * 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    window.localStorage.setItem('monitor:event-confidence-gate', eventConfidenceGate);
  }, [eventConfidenceGate]);

  // Fetch markets
  useEffect(() => {
    async function loadMarkets() {
      try {
        const res = await fetch('/api/markets/polymarket');
        if (res.ok) {
          const payload = (await res.json()) as MonitorResponse<PolymarketMarket[]> | PolymarketMarket[];
          if (Array.isArray(payload)) {
            setAllMarkets(payload.map(normalizeMarketShape));
          } else {
            setAllMarkets((payload.items || []).map(normalizeMarketShape));
            setMarketsMeta(payload.meta || null);
          }
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
          const payload = (await res.json()) as MonitorResponse<UsgsEarthquake[]> | UsgsEarthquake[];
          if (Array.isArray(payload)) {
            setAllEarthquakes(payload);
          } else {
            setAllEarthquakes(payload.items || []);
            setDisastersMeta(payload.meta || null);
          }
        }
      } catch {
        // Silent fail
      }
    }
    loadEarthquakes();
    const interval = setInterval(loadEarthquakes, 10 * 60_000);
    return () => clearInterval(interval);
  }, []);

  // Fetch NOTAM layer
  useEffect(() => {
    async function loadNotams() {
      try {
        const res = await fetch('/api/layers/notams');
        if (!res.ok) return;
        const payload = (await res.json()) as MonitorResponse<NotamZone[]>;
        setNotamZones(payload.items || []);
        setLayersMeta((prev) => ({ ...prev, notams: payload.meta || null }));
      } catch {
        // Silent fail
      }
    }
    loadNotams();
    const interval = setInterval(loadNotams, 15 * 60_000);
    return () => clearInterval(interval);
  }, []);

  // Fetch shipping layer
  useEffect(() => {
    async function loadShipping() {
      try {
        const res = await fetch('/api/layers/shipping');
        if (!res.ok) return;
        const payload = (await res.json()) as MonitorResponse<ShippingChokepoint[]>;
        setShippingChokepoints(payload.items || []);
        setLayersMeta((prev) => ({ ...prev, shipping: payload.meta || null }));
      } catch {
        // Silent fail
      }
    }
    loadShipping();
    const interval = setInterval(loadShipping, 10 * 60_000);
    return () => clearInterval(interval);
  }, []);

  // Fetch elections layer
  useEffect(() => {
    async function loadElections() {
      try {
        const res = await fetch('/api/layers/elections');
        if (!res.ok) return;
        const payload = (await res.json()) as MonitorResponse<ElectionCalendarItem[]>;
        setElections(payload.items || []);
        setLayersMeta((prev) => ({ ...prev, elections: payload.meta || null }));
      } catch {
        // Silent fail
      }
    }
    loadElections();
    const interval = setInterval(loadElections, 60 * 60_000);
    return () => clearInterval(interval);
  }, []);

  const themeCounts = useMemo(
    () => computeThemeCounts(allEvents, allMarkets, allEarthquakes),
    [allEvents, allMarkets, allEarthquakes],
  );

  const signalCounts = useMemo(() => ({
    events: allEvents.filter((event) => event.status !== 'speculative').length,
    markets: allMarkets.length,
    disasters: allEarthquakes.length,
    infrastructure_overlays: notamZones.length + shippingChokepoints.length + elections.length,
    watch_zones: watchZones.length,
  }), [allEvents, allMarkets.length, allEarthquakes.length, notamZones.length, shippingChokepoints.length, elections.length]);

  const eventGateStats = useMemo(() => {
    const speculative = allEvents.filter((event) => event.status === 'speculative').length;
    const ambiguousGeo = allEvents.filter((event) => event.geoValidity === 'ambiguous').length;
    const invalidGeo = allEvents.filter((event) => event.geoValidity === 'invalid').length;
    const lowConfidence = allEvents.filter((event) =>
      event.severity === 'monitor' &&
      event.status !== 'speculative' &&
      event.sourceCount < 2 &&
      event.classificationConfidence < 0.72,
    ).length;

    return {
      total: allEvents.length,
      speculative,
      ambiguousGeo,
      invalidGeo,
      lowConfidence,
    };
  }, [allEvents]);

  const offMapPreview = useMemo(() => {
    const forced = new Set(temporaryPlottedEventIds);

    const items: OffMapEventPreview[] = allEvents
      .filter((event) => visibleThemes[event.category])
      .map((event) => {
        const reasonCode = offMapReasonForEvent(event, eventConfidenceGate);
        if (!reasonCode) return null;
        return {
          id: event.id,
          title: event.title,
          severity: event.severity,
          lastSeenAt: event.lastSeenAt,
          reasonCode,
          reasonLabel: offMapReasonLabel(reasonCode),
          geoReason: event.geoReason,
        };
      })
      .filter((event): event is OffMapEventPreview => Boolean(event))
      .sort((a, b) => {
        const aForced = forced.has(a.id) ? 1 : 0;
        const bForced = forced.has(b.id) ? 1 : 0;
        if (bForced !== aForced) return bForced - aForced;
        const sevDelta = severityOrder(b.severity) - severityOrder(a.severity);
        if (sevDelta !== 0) return sevDelta;
        return new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime();
      });

    const plottedOverrides = items.filter((event) => forced.has(event.id)).length;
    const byReason = items
      .filter((event) => !forced.has(event.id))
      .reduce<Record<OffMapReasonCode, number>>((acc, event) => ({
        ...acc,
        [event.reasonCode]: acc[event.reasonCode] + 1,
      }), {
        speculative: 0,
        geo_invalid: 0,
        geo_ambiguous: 0,
        low_confidence: 0,
      });

    const hiddenNow = Math.max(0, items.length - plottedOverrides);

    return {
      items: items.slice(0, 30),
      summary: {
        total: items.length,
        hiddenNow,
        plottedOverrides,
        byReason,
      },
    };
  }, [allEvents, eventConfidenceGate, temporaryPlottedEventIds, visibleThemes]);

  const handleSelectOffMapEvent = useCallback((eventId: string) => {
    const event = allEvents.find((candidate) => candidate.id === eventId);
    if (!event) return;
    setSelectionContext(null);
    setActiveFanout(null);
    setInteractionMode('idle');
    setSelectedItem({ type: 'event', data: event });
    setFocusEventRequest((prev) => ({
      lat: event.lat,
      lng: event.lng,
      seq: (prev?.seq || 0) + 1,
    }));
  }, [allEvents]);

  const handleToggleOffMapPlot = useCallback((eventId: string) => {
    const event = allEvents.find((candidate) => candidate.id === eventId);
    if (!event) return;

    setTemporaryPlottedEventIds((prev) => {
      const exists = prev.includes(eventId);
      if (exists) return prev.filter((id) => id !== eventId);
      return [...prev, eventId];
    });

    setSelectionContext(null);
    setActiveFanout(null);
    setInteractionMode('idle');
    setSelectedItem({ type: 'event', data: event });
    setFocusEventRequest((prev) => ({
      lat: event.lat,
      lng: event.lng,
      seq: (prev?.seq || 0) + 1,
    }));
  }, [allEvents]);

  const handleClearOffMapPlots = useCallback(() => {
    setTemporaryPlottedEventIds([]);
  }, []);

  const selectedEventEvidence = useMemo(() => {
    if (selectedItem?.type !== 'event') return [];
    const evidenceById = new Map(allEventEvidence.map((item) => [item.id, item] as const));
    const fromIds = selectedItem.data.evidenceIds
      .map((id) => evidenceById.get(id))
      .filter((item): item is EventEvidence => Boolean(item));
    if (fromIds.length > 0) return fromIds;
    return allEventEvidence.filter((item) => item.eventId === selectedItem.data.id);
  }, [selectedItem, allEventEvidence]);

  const selectedEventScenarios = useMemo(() => {
    if (selectedItem?.type !== 'event') return [];
    const scenarioById = new Map(allEventScenarios.map((item) => [item.id, item] as const));
    const fromIds = selectedItem.data.scenarioIds
      .map((id) => scenarioById.get(id))
      .filter((item): item is EventScenario => Boolean(item));
    if (fromIds.length > 0) return fromIds;
    return allEventScenarios.filter((item) => item.eventId === selectedItem.data.id);
  }, [selectedItem, allEventScenarios]);

  const relatedMarkets = useMemo(() => {
    if (selectedItem?.type !== 'event') return [];

    if (selectedEventScenarios.length > 0) {
      const marketsById = new Map(allMarkets.map((market) => [market.id, market] as const));
      const linked: PolymarketMarket[] = [];
      for (const scenario of selectedEventScenarios) {
        const market = marketsById.get(scenario.marketId);
        if (!market) continue;
        linked.push({
          ...market,
          linkConfidence: scenario.linkConfidence,
          topicTags: scenario.topicTags.length > 0 ? scenario.topicTags : market.topicTags,
        });
      }

      if (linked.length > 0) return linked;
    }

    return findRelatedMarkets(selectedItem.data, allMarkets);
  }, [selectedItem, allMarkets, selectedEventScenarios]);

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
      <SituationBriefBar
        focusMode={focusMode}
        activeRoom={activeRoom}
        events={allEvents}
        markets={allMarkets}
        earthquakes={allEarthquakes}
        visibleThemes={visibleThemes}
        visibleSignals={visibleSignals}
      />

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <FilterPanel
          focusMode={focusMode}
          activeSituationRoomId={activeRoom?.id || null}
          situationRooms={situationRooms}
          onSelectGlobalFocus={handleSelectGlobalFocus}
          onSelectSituationRoom={handleSituationRoomSelect}
          visibleThemes={visibleThemes}
          onToggleTheme={toggleTheme}
          themeCounts={themeCounts}
          visibleSignals={visibleSignals}
          onToggleSignal={toggleSignal}
          signalCounts={signalCounts}
          eventConfidenceGate={eventConfidenceGate}
          onChangeEventConfidenceGate={setEventConfidenceGate}
          eventGateStats={eventGateStats}
          offMapEvents={offMapPreview.items}
          offMapSummary={offMapPreview.summary}
          onSelectOffMapEvent={handleSelectOffMapEvent}
          offMapPlottedIds={temporaryPlottedEventIds}
          onToggleOffMapPlot={handleToggleOffMapPlot}
          onClearOffMapPlots={handleClearOffMapPlots}
          watchZones={watchZones}
          visibleWatchZones={visibleWatchZones}
          onToggleWatchZone={toggleWatchZone}
          sourceHealth={{
            events: eventsMeta,
            markets: marketsMeta,
            disasters: disastersMeta,
            notams: layersMeta.notams,
            shipping: layersMeta.shipping,
            elections: layersMeta.elections,
          }}
        />

        <div style={{ flex: 1, position: 'relative', minWidth: 0, overflow: 'hidden' }}>
          <MonitorMap
            onEventClick={handleEventClick}
            onMarketClick={handleMarketClick}
            onEarthquakeClick={handleEarthquakeClick}
            onWatchZoneClick={handleWatchZoneClick}
            onSelectionCandidates={handleSelectionCandidates}
            onMapClick={handleClosePanel}
            onFanoutChange={handleFanoutChange}
            forceClearFanoutKey={forceClearFanoutKey}
            focusEventRequest={focusEventRequest}
            selectedEventCoords={
              selectedItem?.type === 'event'
                ? { lat: selectedItem.data.lat, lng: selectedItem.data.lng }
                : null
            }
            relatedMarkets={relatedMarkets}
            visibleThemes={visibleThemes}
            visibleSignals={visibleSignals}
            visibleWatchZones={visibleWatchZones}
            eventConfidenceGate={eventConfidenceGate}
            temporaryPlottedEventIds={temporaryPlottedEventIds}
            activeRoom={activeRoom}
            events={allEvents}
            markets={allMarkets}
            earthquakes={allEarthquakes}
            notamZones={notamZones}
            shippingChokepoints={shippingChokepoints}
            elections={elections}
            watchZones={watchZones}
          />
          <EventDetailPanel
            item={selectedItem}
            eventEvidence={selectedEventEvidence}
            eventScenarios={selectedEventScenarios}
            relatedMarkets={relatedMarkets}
            onSelectCandidate={handleSelectCandidate}
            canBackToSelection={Boolean(selectionContext && selectedItem?.type !== 'selection')}
            onBackToSelection={handleBackToSelection}
            canBackToFanout={Boolean(activeFanout && selectedItem && selectedItem.type !== 'fanout' && selectedItem.type !== 'selection')}
            onBackToFanout={handleBackToFanout}
            onCollapseFanout={collapseFanoutAndPanel}
            interactionMode={interactionMode}
            onClose={handleClosePanel}
          />
        </div>
      </div>

      <PriceTicker />
    </div>
  );
}
