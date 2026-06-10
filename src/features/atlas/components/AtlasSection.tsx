"use client";

// Atlas mode: the full-viewport explorable map the story hands over to.
// Owns filter/selection state; mounts the (code-split) map only when the
// reader approaches it.

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as MapboxMap } from "mapbox-gl";
import {
  AtlasFilters,
  DEFAULT_FILTERS,
  filterSites,
  allSites,
  siteById,
  toFeatureCollection,
  toScenarioFeatureCollection,
  MEGA_LAYERS,
  SCENARIOS,
} from "../map/sites";
import type { MegaLayer, Site } from "../types";
import DetailPanel from "./DetailPanel";
import FilterPanel from "./FilterPanel";

const AtlasMap = dynamic(() => import("./AtlasMap"), {
  ssr: false,
  loading: () => <MapPlaceholder />,
});

function MapPlaceholder() {
  return (
    <div className="atlas-map-placeholder">
      <span className="atlas-mono">Drawing the map…</span>
    </div>
  );
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function AtlasSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const [filters, setFilters] = useState<AtlasFilters>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scenarioOn, setScenarioOn] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || nearViewport) return;
    if (process.env.NODE_ENV !== "production") {
      // Eager-mount in dev: simpler iteration, and HMR plus lazy-mount
      // interact badly. Mount-time setState is deliberate here and below:
      // whether the map mounts depends on measured layout, which only
      // exists after first paint.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNearViewport(true);
      return;
    }
    const withinRange = () => {
      const rect = el.getBoundingClientRect();
      return rect.top < window.innerHeight + 1200 && rect.bottom > -1200;
    };
    // Already in range at mount (e.g. landing directly on /aistack#atlas).
    if (withinRange()) {
      setNearViewport(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setNearViewport(true);
      },
      { rootMargin: "1200px 0px" },
    );
    observer.observe(el);
    // Scroll fallback for browsers where the observer misbehaves; passive
    // and cheap (a rect read per scroll sample until the map mounts).
    const onScroll = () => {
      if (withinRange()) setNearViewport(true);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [nearViewport]);

  const shownSites = useMemo(
    () => filterSites(allSites, filters),
    [filters],
  );
  const data = useMemo(() => toFeatureCollection(shownSites), [shownSites]);
  const scenario = SCENARIOS[0];
  const scenarioData = useMemo(
    () => (scenarioOn ? toScenarioFeatureCollection(allSites, scenario) : null),
    [scenarioOn, scenario],
  );

  // Mega tab counts respect every other active filter.
  const megaCounts = useMemo(() => {
    const withoutMega = filterSites(allSites, { ...filters, mega: "all", layer: "all" });
    const counts = { all: withoutMega.length } as Record<MegaLayer | "all", number>;
    for (const mega of MEGA_LAYERS) {
      counts[mega] = withoutMega.filter((s) => s.mega_layer === mega).length;
    }
    return counts;
  }, [filters]);

  const selectedSite = selectedId ? (siteById.get(selectedId) ?? null) : null;

  const focusSite = (site: Site) => {
    // Search is global; if the picked site is hidden by the active filters,
    // clear them so its pin is actually on the map.
    if (!filterSites([site], filters).length) setFilters(DEFAULT_FILTERS);
    setSelectedId(site.id);
    const map = mapRef.current;
    if (!map) return;
    const target: { center: [number, number]; zoom: number } = {
      center: [site.lng, site.lat],
      zoom: Math.max(map.getZoom(), 8.5),
    };
    if (prefersReducedMotion()) {
      map.jumpTo(target);
    } else {
      map.flyTo({ ...target, curve: 1.4, speed: 0.8 });
    }
  };

  return (
    <section
      ref={sectionRef}
      id="atlas"
      className="atlas-section"
      aria-label="The atlas — explorable map of all sites"
    >
      <header className="atlas-section__header">
        <span className="atlas-mono atlas-section__eyebrow">
          The Atlas · Sheet 13
        </span>
        <h2 className="atlas-section__title">Every site, yours to explore</h2>
      </header>
      <div className="atlas-section__map">
        {nearViewport ? (
          <>
            <AtlasMap
              data={data}
              scenarioData={scenarioData}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onMapReady={(map) => {
                mapRef.current = map;
              }}
            />
            <FilterPanel
              filters={filters}
              onChange={(next) => {
                setFilters(next);
                setSelectedId(null);
              }}
              megaCounts={megaCounts}
              shownCount={shownSites.length}
              onPickSite={focusSite}
              scenario={scenario}
              scenarioOn={scenarioOn}
              onToggleScenario={() => {
                setScenarioOn((on) => !on);
                setSelectedId(null);
              }}
            />
            {selectedSite && (
              <DetailPanel
                site={selectedSite}
                onClose={() => setSelectedId(null)}
              />
            )}
          </>
        ) : (
          <MapPlaceholder />
        )}
      </div>
    </section>
  );
}
