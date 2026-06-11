// Ink-drawn map pins per DESIGN.md §The map: a surveyor's circle — ink
// stroke with a mega-layer watercolor wash inside, planted on a small
// cleared disc of paper so the mark stays legible over pond outlines and
// town names. Never a teardrop. Status rings (ochre construction, dashed
// planned), a small red tick for monopoly chokepoints, and a filled active
// state. Drawn on canvas at 2x and registered as map images named
// pin-{status}-{mega}[-mono][-active].

import type { Map as MapboxMap } from "mapbox-gl";
import type { SiteStatus } from "../types";

const PAPER = "#F8F4E9";
const INK = "#2B4A8C";
const INK_FAINT = "#9DACC9";
const OCHRE = "#C99A3C";
const RED = "#C8502E";
const TEAL = "#4E7E74";

/** Watercolor interiors by mega layer (wash behind ink line work, never a
 *  solid fill). Deployment stays plain paper — the datacenters are the base
 *  condition; color marks the upstream stack. */
const MEGA_KEYS = [
  "inputs",
  "toolchain",
  "silicon",
  "systems",
  "deployment",
] as const;
type MegaKey = (typeof MEGA_KEYS)[number];
const MEGA_WASH: Record<MegaKey, string | null> = {
  inputs: OCHRE,
  toolchain: RED,
  silicon: INK,
  systems: TEAL,
  deployment: null,
};
const WASH_OPACITY = 0.32;

const CSS_SIZE = 30; // icon box in CSS px; halo + rings + tick need the margin
const SCALE = 2;

interface PinVariant {
  status: SiteStatus;
  mega: MegaKey;
  monopoly: boolean;
  active: boolean;
}

export function pinName(v: PinVariant): string {
  return `pin-${v.status}-${v.mega}${v.monopoly ? "-mono" : ""}${v.active ? "-active" : ""}`;
}

function drawPin(v: PinVariant): ImageData {
  const size = CSS_SIZE * SCALE;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(SCALE, SCALE);
  const c = CSS_SIZE / 2;

  // Cleared paper disc: brush the sheet clean before planting the marker,
  // so the pin reads over water lines and labels behind it.
  ctx.beginPath();
  ctx.arc(c, c, 10.5, 0, Math.PI * 2);
  ctx.globalAlpha = 0.88;
  ctx.fillStyle = PAPER;
  ctx.fill();
  ctx.globalAlpha = 1;

  // Status ring
  if (v.status === "construction") {
    ctx.beginPath();
    ctx.arc(c, c, 8.4, 0, Math.PI * 2);
    ctx.strokeStyle = OCHRE;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else if (v.status === "planned") {
    ctx.beginPath();
    ctx.arc(c, c, 8.4, 0, Math.PI * 2);
    ctx.strokeStyle = INK_FAINT;
    ctx.lineWidth = 1.25;
    ctx.setLineDash([2.4, 2.2]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Active halo: a fine offset ring
  if (v.active) {
    ctx.beginPath();
    ctx.arc(c, c, v.status === "operational" ? 8.2 : 10.6, 0, Math.PI * 2);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // The pin itself: paper base, mega-layer wash, ink stroke.
  ctx.beginPath();
  ctx.arc(c, c, 5.5, 0, Math.PI * 2);
  ctx.fillStyle = PAPER;
  ctx.fill();
  const wash = MEGA_WASH[v.mega];
  if (v.active) {
    ctx.fillStyle = INK;
    ctx.fill();
  } else if (wash) {
    ctx.globalAlpha = WASH_OPACITY;
    ctx.fillStyle = wash;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Monopoly tick at NE, in red
  if (v.monopoly) {
    ctx.beginPath();
    ctx.moveTo(c + 6.4, c - 6.4);
    ctx.lineTo(c + 9.6, c - 9.6);
    ctx.strokeStyle = RED;
    ctx.lineWidth = 1.75;
    ctx.lineCap = "round";
    ctx.stroke();
  }

  return ctx.getImageData(0, 0, size, size);
}

const STATUSES: SiteStatus[] = ["operational", "construction", "planned"];

export function addPinImages(map: MapboxMap) {
  for (const status of STATUSES) {
    for (const mega of MEGA_KEYS) {
      for (const monopoly of [false, true]) {
        for (const active of [false, true]) {
          const v = { status, mega, monopoly, active };
          const name = pinName(v);
          if (!map.hasImage(name)) {
            map.addImage(name, drawPin(v), { pixelRatio: SCALE });
          }
        }
      }
    }
  }
}

/** Data-driven icon expression for site features (`mega` property holds the
 *  capitalized mega_layer; missing values fall back to the neutral pin). */
export const PIN_ICON_EXPRESSION = [
  "concat",
  "pin-",
  ["get", "status"],
  "-",
  ["downcase", ["coalesce", ["get", "mega"], "Deployment"]],
  ["case", ["coalesce", ["get", "monopoly"], false], "-mono", ""],
] as const;
