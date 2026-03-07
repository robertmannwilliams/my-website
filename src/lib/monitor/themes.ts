import type { GdeltEvent } from './events';
import type { PolymarketMarket } from './polymarket';
import type { UsgsEarthquake } from './usgs';

export type ThemeKey = 'conflicts' | 'elections' | 'economy' | 'disasters' | 'infrastructure';

export interface ThemeConfig {
  key: ThemeKey;
  label: string;
  description: string;
  color: string;
  eventCategories: string[];
  marketCategories: string[];
  includesEarthquakes: boolean;
}

export const THEMES: Record<ThemeKey, ThemeConfig> = {
  conflicts: {
    key: 'conflicts',
    label: 'Conflicts & Military',
    description: 'Interstate/intrastate violence and coercive escalation.',
    color: '#FF4444',
    eventCategories: ['conflicts'],
    marketCategories: ['conflict'],
    includesEarthquakes: false,
  },
  elections: {
    key: 'elections',
    label: 'Elections & Politics',
    description: 'Governance, leadership transitions, institutional instability.',
    color: '#4A9EFF',
    eventCategories: ['elections'],
    marketCategories: ['politics'],
    includesEarthquakes: false,
  },
  economy: {
    key: 'economy',
    label: 'Economy & Trade',
    description: 'Macro policy, sanctions economics, trade and energy pricing context.',
    color: '#22C55E',
    eventCategories: ['economy'],
    marketCategories: ['economy', 'diplomacy'],
    includesEarthquakes: false,
  },
  disasters: {
    key: 'disasters',
    label: 'Natural Disasters',
    description: 'Geophysical and weather hazards with humanitarian impact.',
    color: '#FF8C22',
    eventCategories: ['disasters'],
    marketCategories: ['climate'],
    includesEarthquakes: true,
  },
  infrastructure: {
    key: 'infrastructure',
    label: 'Infrastructure & Logistics',
    description: 'Chokepoints, airspace/nav notices, transport and grid disruptions.',
    color: '#06B6D4',
    eventCategories: ['infrastructure'],
    marketCategories: [],
    includesEarthquakes: false,
  },
};

export const THEME_KEYS = Object.keys(THEMES) as ThemeKey[];

export function eventCategoryToTheme(cat: string): ThemeKey | null {
  for (const theme of THEME_KEYS) {
    if (THEMES[theme].eventCategories.includes(cat)) return theme;
  }
  return null;
}

export function marketCategoryToTheme(cat: string): ThemeKey | null {
  for (const theme of THEME_KEYS) {
    if (THEMES[theme].marketCategories.includes(cat)) return theme;
  }
  return null;
}

/** Returns active event category strings for all enabled themes */
export function getActiveEventCategories(visibleThemes: Record<ThemeKey, boolean>): string[] {
  const cats: string[] = [];
  for (const key of THEME_KEYS) {
    if (visibleThemes[key]) cats.push(...THEMES[key].eventCategories);
  }
  return cats;
}

/** Returns active market category strings for all enabled themes */
export function getActiveMarketCategories(visibleThemes: Record<ThemeKey, boolean>): string[] {
  const cats: string[] = [];
  for (const key of THEME_KEYS) {
    if (visibleThemes[key]) cats.push(...THEMES[key].marketCategories);
  }
  return cats;
}

/** Count items per theme from all data arrays */
export function computeThemeCounts(
  events: GdeltEvent[],
  markets: PolymarketMarket[],
  earthquakes: UsgsEarthquake[],
): Record<ThemeKey, number> {
  const counts: Record<ThemeKey, number> = {
    conflicts: 0,
    elections: 0,
    economy: 0,
    disasters: 0,
    infrastructure: 0,
  };

  for (const e of events) {
    const t = eventCategoryToTheme(e.category);
    if (t) counts[t]++;
  }
  for (const m of markets) {
    const t = marketCategoryToTheme(m.category);
    if (t) counts[t]++;
  }
  counts.disasters += earthquakes.length;

  return counts;
}

/** Color for an event category */
export function categoryColor(cat: string): string {
  const t = eventCategoryToTheme(cat);
  return t ? THEMES[t].color : '#666680';
}

/** Color for a market category */
export function marketCategoryColor(cat: string): string {
  const t = marketCategoryToTheme(cat);
  return t ? THEMES[t].color : '#AA66FF';
}
