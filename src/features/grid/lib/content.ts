// Grid story content pipeline (GRID-PLAN Phase 2–3). Parses content/grid/
// act files (frontmatter beats + per-beat copy under "## Beat {id}") and
// resolves site ids against data/plants.json — failing the build loudly on
// anything malformed, per the aistack discipline.

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { plants } from "./plants";
import type { FuelFamily } from "../types";

export type BeatKind = "map" | "text" | "widget" | "diagram" | "live";
export type WidgetName = "dispatch-stack" | "duck-curve" | "hold-60";
export type DiagramName = "balance" | "bill" | "demand-bend";
export type OverlayName =
  | "regions" | "regulation" | "interconnections" | "ties" | "quebec";

export interface BeatSite {
  id: string;
  name: string;
  fuel: FuelFamily;
  lng: number;
  lat: number;
}

export interface StoryBeat {
  id: string;
  kind: BeatKind;
  copy: string;
  sites: BeatSite[];
  camera?: { center?: [number, number]; zoom?: number };
  widget?: WidgetName;
  diagram?: DiagramName;
  overlays: OverlayName[];
  night: boolean;
  /** Beat 3.5 — the signature moment: the Texas glow flickers out. */
  uri: boolean;
}

const WIDGETS: WidgetName[] = ["dispatch-stack", "duck-curve", "hold-60"];
const DIAGRAMS: DiagramName[] = ["balance", "bill", "demand-bend"];
const OVERLAYS: OverlayName[] = [
  "regions", "regulation", "interconnections", "ties", "quebec",
];
const KINDS: BeatKind[] = ["map", "text", "widget", "diagram", "live"];

interface RawBeat {
  id: string | number;
  kind: string;
  sites?: string[];
  camera?: { center?: [number, number]; zoom?: number };
  widget?: string;
  diagram?: string;
  overlay?: string | string[];
  night?: boolean;
  uri?: boolean;
}

export function loadAct(actFile: string): StoryBeat[] {
  const file = path.join(process.cwd(), "content", "grid", actFile);
  const { data, content } = matter(fs.readFileSync(file, "utf8"));
  const raw = (data.beats ?? []) as RawBeat[];
  const errors: string[] = [];

  // Split copy by "## Beat {id}" headings.
  const copyById = new Map<string, string>();
  for (const block of content.split(/^## Beat /m).slice(1)) {
    const firstBreak = block.indexOf("\n");
    const id = block.slice(0, firstBreak).trim();
    const text = block.slice(firstBreak).trim();
    if (copyById.has(id)) errors.push(`duplicate copy heading for beat ${id}`);
    copyById.set(id, text);
  }

  const plantById = new Map(plants.map((p) => [p.id, p]));
  const beats: StoryBeat[] = [];

  for (const b of raw) {
    const id = String(b.id);
    if (!KINDS.includes(b.kind as BeatKind)) {
      errors.push(`beat ${id}: unknown kind "${b.kind}"`);
      continue;
    }
    const copy = copyById.get(id);
    if (!copy) errors.push(`beat ${id}: no copy under "## Beat ${id}"`);
    copyById.delete(id);

    const sites: BeatSite[] = [];
    for (const sid of b.sites ?? []) {
      const p = plantById.get(sid);
      if (!p) {
        errors.push(`beat ${id}: site "${sid}" not in data/plants.json`);
        continue;
      }
      sites.push({ id: p.id, name: p.name, fuel: p.fuel, lng: p.lng, lat: p.lat });
    }

    const overlays = (
      Array.isArray(b.overlay) ? b.overlay : b.overlay ? [b.overlay] : []
    ) as OverlayName[];
    for (const o of overlays) {
      if (!OVERLAYS.includes(o)) errors.push(`beat ${id}: unknown overlay "${o}"`);
    }
    if (b.kind === "widget" && !WIDGETS.includes(b.widget as WidgetName)) {
      errors.push(`beat ${id}: unknown widget "${b.widget}"`);
    }
    if (b.kind === "diagram" && !DIAGRAMS.includes(b.diagram as DiagramName)) {
      errors.push(`beat ${id}: unknown diagram "${b.diagram}"`);
    }
    if (b.kind === "map" && sites.length === 0 && !b.camera?.center) {
      errors.push(`beat ${id}: map beat needs sites or camera.center`);
    }

    beats.push({
      id,
      kind: b.kind as BeatKind,
      copy: copy ?? "",
      sites,
      camera: b.camera,
      widget: b.widget as WidgetName | undefined,
      diagram: b.diagram as DiagramName | undefined,
      overlays,
      night: Boolean(b.night),
      uri: Boolean(b.uri),
    });
  }

  for (const orphan of copyById.keys()) {
    errors.push(`copy for beat ${orphan} has no frontmatter entry`);
  }
  if (errors.length) {
    throw new Error(
      `content/grid/${actFile} failed validation:\n  - ${errors.join("\n  - ")}`,
    );
  }
  return beats;
}

/** Load acts in order into one continuous flow (no chapter headers). */
export function loadActs(...actFiles: string[]): StoryBeat[] {
  return actFiles.flatMap((f) => loadAct(f));
}
