import type { GdeltEvent } from './events';
import type { PolymarketMarket } from './polymarket';
import type { UsgsEarthquake } from './usgs';
import type { OngoingSituation } from './types';

export type ThemeKey = 'conflicts' | 'elections' | 'economy' | 'disasters' | 'infrastructure';

export interface ThemeConfig {
  key: ThemeKey;
  label: string;
  color: string;
  eventCategories: string[];
  marketCategories: string[];
  situationCategories: string[];
  includesEarthquakes: boolean;
}

export const THEMES: Record<ThemeKey, ThemeConfig> = {
  conflicts: {
    key: 'conflicts',
    label: 'Conflicts & Military',
    color: '#FF4444',
    eventCategories: ['conflicts'],
    marketCategories: ['conflict'],
    situationCategories: ['conflicts'],
    includesEarthquakes: false,
  },
  elections: {
    key: 'elections',
    label: 'Elections & Politics',
    color: '#4A9EFF',
    eventCategories: ['elections'],
    marketCategories: ['politics'],
    situationCategories: [],
    includesEarthquakes: false,
  },
  economy: {
    key: 'economy',
    label: 'Economy & Trade',
    color: '#22C55E',
    eventCategories: ['economy'],
    marketCategories: ['economy', 'diplomacy'],
    situationCategories: [],
    includesEarthquakes: false,
  },
  disasters: {
    key: 'disasters',
    label: 'Natural Disasters',
    color: '#FF8C22',
    eventCategories: ['disasters'],
    marketCategories: ['climate'],
    situationCategories: [],
    includesEarthquakes: true,
  },
  infrastructure: {
    key: 'infrastructure',
    label: 'Infrastructure',
    color: '#06B6D4',
    eventCategories: ['infrastructure'],
    marketCategories: [],
    situationCategories: ['infrastructure'],
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

export function situationCategoryToTheme(cat: string): ThemeKey | null {
  for (const theme of THEME_KEYS) {
    if (THEMES[theme].situationCategories.includes(cat)) return theme;
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

/** Returns active situation category strings for all enabled themes */
export function getActiveSituationCategories(visibleThemes: Record<ThemeKey, boolean>): string[] {
  const cats: string[] = [];
  for (const key of THEME_KEYS) {
    if (visibleThemes[key]) cats.push(...THEMES[key].situationCategories);
  }
  return cats;
}

/** Count items per theme from all data arrays */
export function computeThemeCounts(
  events: GdeltEvent[],
  markets: PolymarketMarket[],
  situations: OngoingSituation[],
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
  for (const s of situations) {
    const t = situationCategoryToTheme(s.category);
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
