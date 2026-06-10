// Build-time content pipeline. Server-side only (uses fs) — import from server
// components or scripts, never from "use client" modules.
//
// Parses content/chapters/*.md (YAML frontmatter + per-beat copy under
// "## Beat {id}" headings) into typed Chapters, and data/sites.json into Sites.
// Validation is strict and aggregated: any unresolved site id, malformed beat,
// or orphaned copy section throws, which fails `next build` loudly.

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type {
  Beat,
  BeatCamera,
  BeatKind,
  Chapter,
  Site,
} from "../types";

const CHAPTERS_DIR = path.join(process.cwd(), "content", "chapters");
const SITES_FILE = path.join(process.cwd(), "data", "sites.json");

const BEAT_KINDS = new Set<BeatKind>(["text", "plate", "map", "diagram", "stamp"]);
const CAMERA_KEYS = new Set(["center", "zoom", "pitch", "bearing"]);

// Cache in production builds; re-read per render in dev so markdown edits
// show up without restarting the server.
const useCache = process.env.NODE_ENV === "production";
let sitesCache: Site[] | null = null;
let siteIndexCache: Map<string, Site> | null = null;
let chaptersCache: Chapter[] | null = null;

export function loadSites(): Site[] {
  if (useCache && sitesCache) return sitesCache;
  const raw = JSON.parse(fs.readFileSync(SITES_FILE, "utf8"));
  if (!Array.isArray(raw)) {
    throw new Error(`Atlas data: expected ${SITES_FILE} to be an array of sites`);
  }
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const site of raw as Site[]) {
    if (!site.id || typeof site.id !== "string") {
      errors.push(`site missing string id: ${JSON.stringify(site).slice(0, 80)}…`);
      continue;
    }
    if (seen.has(site.id)) errors.push(`duplicate site id "${site.id}"`);
    seen.add(site.id);
    if (typeof site.lat !== "number" || typeof site.lng !== "number") {
      errors.push(`site "${site.id}" has non-numeric coordinates`);
    }
    if (!site.name || !site.mega_layer) {
      errors.push(`site "${site.id}" missing name or mega_layer`);
    }
  }
  if (errors.length) {
    throw new Error(`Atlas data validation failed (data/sites.json):\n - ${errors.join("\n - ")}`);
  }
  sitesCache = raw as Site[];
  return sitesCache;
}

export function getSiteIndex(): Map<string, Site> {
  if (useCache && siteIndexCache) return siteIndexCache;
  siteIndexCache = new Map(loadSites().map((s) => [s.id, s]));
  return siteIndexCache;
}

export function loadChapters(): Chapter[] {
  if (useCache && chaptersCache) return chaptersCache;

  const siteIndex = getSiteIndex();
  const errors: string[] = [];
  const files = fs
    .readdirSync(CHAPTERS_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();

  if (files.length === 0) {
    throw new Error(`Atlas content: no chapter files found in ${CHAPTERS_DIR}`);
  }

  const chapters: Chapter[] = [];
  for (const file of files) {
    const fullPath = path.join(CHAPTERS_DIR, file);
    const { data, content: body } = matter(fs.readFileSync(fullPath, "utf8"));
    const chapter = parseChapter(file, data, body, siteIndex, errors);
    if (chapter) chapters.push(chapter);
  }

  const ids = new Set<number>();
  for (const c of chapters) {
    if (ids.has(c.id)) errors.push(`duplicate chapter id ${c.id}`);
    ids.add(c.id);
  }

  if (errors.length) {
    throw new Error(`Atlas content validation failed:\n - ${errors.join("\n - ")}`);
  }

  chapters.sort((a, b) => a.id - b.id);
  chaptersCache = chapters;
  return chapters;
}

function parseChapter(
  file: string,
  data: Record<string, unknown>,
  body: string,
  siteIndex: Map<string, Site>,
  errors: string[],
): Chapter | null {
  const before = errors.length;

  if (typeof data.id !== "number" || !Number.isInteger(data.id) || data.id < 0) {
    errors.push(`${file}: frontmatter "id" must be a non-negative integer`);
  }
  for (const key of ["slug", "title", "kicker"] as const) {
    if (typeof data[key] !== "string" || !(data[key] as string).trim()) {
      errors.push(`${file}: frontmatter "${key}" must be a non-empty string`);
    }
  }
  if (!Array.isArray(data.beats) || data.beats.length === 0) {
    errors.push(`${file}: frontmatter "beats" must be a non-empty list`);
    return null;
  }

  const copyByBeat = splitBeatCopy(file, body, errors);
  const claimedCopy = new Set<string>();

  const beats: Beat[] = [];
  for (const rawBeat of data.beats as unknown[]) {
    const beat = parseBeat(file, rawBeat, siteIndex, errors);
    if (!beat) continue;
    if (beats.some((b) => b.id === beat.id)) {
      errors.push(`${file}: duplicate beat id "${beat.id}"`);
      continue;
    }
    const copy = copyByBeat.get(beat.id);
    if (!copy) {
      errors.push(`${file}: beat ${beat.id} has no "## Beat ${beat.id}" copy section`);
    } else {
      beat.copy = copy;
      claimedCopy.add(beat.id);
    }
    beats.push(beat);
  }

  for (const id of copyByBeat.keys()) {
    if (!claimedCopy.has(id)) {
      errors.push(`${file}: copy section "## Beat ${id}" matches no beat in frontmatter`);
    }
  }

  if (errors.length > before) return null;
  return {
    id: data.id as number,
    slug: data.slug as string,
    title: data.title as string,
    kicker: data.kicker as string,
    beats,
  };
}

function parseBeat(
  file: string,
  raw: unknown,
  siteIndex: Map<string, Site>,
  errors: string[],
): Beat | null {
  if (typeof raw !== "object" || raw === null) {
    errors.push(`${file}: beat entry is not a mapping`);
    return null;
  }
  const b = raw as Record<string, unknown>;

  // YAML parses `id: 4.1` as a float; normalize to string. A trailing-zero id
  // like "7.10" would collapse to "7.1" — the duplicate-id and orphaned-copy
  // checks both catch that loudly.
  if (typeof b.id !== "number" && typeof b.id !== "string") {
    errors.push(`${file}: beat missing "id"`);
    return null;
  }
  const id = String(b.id);
  const at = `${file}: beat ${id}`;

  if (typeof b.kind !== "string" || !BEAT_KINDS.has(b.kind as BeatKind)) {
    errors.push(`${at}: kind "${String(b.kind)}" is not one of ${[...BEAT_KINDS].join(" | ")}`);
    return null;
  }
  const kind = b.kind as BeatKind;
  const beat: Beat = { id, kind, copy: [] };

  if (b.plate !== undefined) {
    if (kind !== "plate" && kind !== "diagram") {
      errors.push(`${at}: "plate" is only valid on plate/diagram beats`);
    } else if (typeof b.plate !== "string" || !b.plate.trim()) {
      errors.push(`${at}: "plate" must be a non-empty asset key`);
    } else {
      beat.plate = b.plate;
    }
  }
  if (kind === "plate" && !beat.plate) {
    errors.push(`${at}: plate beats require a "plate" asset key`);
  }

  if (b.stamp !== undefined) {
    if (kind !== "stamp") {
      errors.push(`${at}: "stamp" is only valid on stamp beats`);
    } else if (typeof b.stamp !== "string" || !b.stamp.trim()) {
      errors.push(`${at}: "stamp" must be non-empty text`);
    } else {
      beat.stamp = b.stamp;
    }
  }
  if (kind === "stamp" && !beat.stamp) {
    errors.push(`${at}: stamp beats require "stamp" text`);
  }

  if (b.atlas_handoff !== undefined) {
    if (typeof b.atlas_handoff !== "boolean") {
      errors.push(`${at}: "atlas_handoff" must be boolean`);
    } else {
      beat.atlasHandoff = b.atlas_handoff;
    }
  }

  if (b.sites !== undefined) {
    if (kind !== "map") {
      errors.push(`${at}: "sites" is only valid on map beats`);
    } else if (!Array.isArray(b.sites) || b.sites.some((s) => typeof s !== "string")) {
      errors.push(`${at}: "sites" must be a list of site ids`);
    } else {
      const unknown = (b.sites as string[]).filter((s) => !siteIndex.has(s));
      if (unknown.length) {
        errors.push(`${at}: unknown site id(s) ${unknown.map((s) => `"${s}"`).join(", ")} — not in data/sites.json`);
      }
      beat.sites = b.sites as string[];
    }
  }
  if (kind === "map") {
    if (!beat.sites) {
      errors.push(`${at}: map beats require a "sites" list`);
    } else if (beat.sites.length === 0 && !beat.atlasHandoff) {
      errors.push(`${at}: map beat has empty "sites" but is not the atlas handoff`);
    }
  }

  if (b.draw_links !== undefined) {
    if (kind !== "map" || typeof b.draw_links !== "boolean") {
      errors.push(`${at}: "draw_links" must be a boolean on a map beat`);
    } else {
      beat.drawLinks = b.draw_links;
    }
  }

  if (b.camera !== undefined) {
    const camera = parseCamera(at, b.camera, errors);
    if (camera) beat.camera = camera;
  }

  return beat;
}

function parseCamera(
  at: string,
  raw: unknown,
  errors: string[],
): BeatCamera | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    errors.push(`${at}: "camera" must be a mapping`);
    return null;
  }
  const c = raw as Record<string, unknown>;
  const camera: BeatCamera = {};
  for (const key of Object.keys(c)) {
    if (!CAMERA_KEYS.has(key)) {
      errors.push(`${at}: camera key "${key}" is not one of center | zoom | pitch | bearing`);
    }
  }
  for (const key of ["zoom", "pitch", "bearing"] as const) {
    if (c[key] !== undefined) {
      if (typeof c[key] !== "number") {
        errors.push(`${at}: camera.${key} must be a number`);
      } else {
        camera[key] = c[key] as number;
      }
    }
  }
  if (c.center !== undefined) {
    const ok =
      Array.isArray(c.center) &&
      c.center.length === 2 &&
      c.center.every((v) => typeof v === "number");
    if (!ok) {
      errors.push(`${at}: camera.center must be [lng, lat]`);
    } else {
      camera.center = c.center as [number, number];
    }
  }
  return camera;
}

/**
 * Split chapter body into per-beat paragraph lists keyed by beat id.
 * Soft line wraps inside a paragraph are collapsed to spaces.
 */
function splitBeatCopy(
  file: string,
  body: string,
  errors: string[],
): Map<string, string[]> {
  const sections = new Map<string, string[]>();
  let current: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (current !== null) {
      if (sections.has(current)) {
        errors.push(`${file}: duplicate copy heading "## Beat ${current}"`);
      } else {
        sections.set(current, toParagraphs(buffer.join("\n")));
      }
    } else if (buffer.join("\n").trim()) {
      errors.push(`${file}: copy found before the first "## Beat" heading`);
    }
  };

  for (const line of body.split("\n")) {
    const m = line.match(/^##\s+Beat\s+([0-9][0-9.]*)\s*$/);
    if (m) {
      flush();
      current = m[1];
      buffer = [];
    } else {
      buffer.push(line);
    }
  }
  flush();
  return sections;
}

function toParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}
