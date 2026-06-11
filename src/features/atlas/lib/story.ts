// Server-side: resolve site references into the minimal data the client story
// engine needs (passed as props — the story map never ships the full
// sites.json).

import { getSiteIndex } from "./content";
import type { Beat, Chapter, Site } from "../types";

export interface StorySite {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  lng: number;
  lat: number;
  status: Site["status"];
  monopoly: boolean;
  mega: Site["mega_layer"];
}

export function getStorySites(chapter: Chapter): Record<string, StorySite> {
  const index = getSiteIndex();
  const out: Record<string, StorySite> = {};
  for (const beat of chapter.beats) {
    for (const id of beat.sites ?? []) {
      if (out[id]) continue;
      const site = index.get(id);
      if (!site) continue; // loadChapters already failed the build if missing
      out[id] = {
        id: site.id,
        name: site.name,
        city: site.city ?? null,
        country: site.country ?? null,
        lng: site.lng,
        lat: site.lat,
        status: site.status,
        monopoly: site.chokepoint_severity === "monopoly",
        mega: site.mega_layer,
      };
    }
  }
  return out;
}

export interface FlowData {
  /** Every beat in story order — the chapters exist only as authoring files. */
  beats: Beat[];
  /** Union of all sites the story references. */
  sites: Record<string, StorySite>;
}

export function getFlowData(chapters: Chapter[]): FlowData {
  const beats = chapters.flatMap((c) => c.beats);
  const sites: Record<string, StorySite> = {};
  for (const chapter of chapters) {
    Object.assign(sites, getStorySites(chapter));
  }
  return { beats, sites };
}
