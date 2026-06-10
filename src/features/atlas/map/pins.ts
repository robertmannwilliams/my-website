// Ink-drawn map pins per DESIGN.md §The map: 4–5px circle with a 1.25px ink
// stroke and paper fill — never a teardrop. Status rings (ochre construction,
// dashed planned), a small red tick for monopoly chokepoints, and a filled
// active state. Drawn on canvas at 2x and registered as map images.

import type { Map as MapboxMap } from "mapbox-gl";
import type { SiteStatus } from "../types";

const PAPER = "#F8F4E9";
const INK = "#2B4A8C";
const INK_FAINT = "#9DACC9";
const OCHRE = "#C99A3C";
const RED = "#C8502E";

const CSS_SIZE = 26; // icon box in CSS px; rings + tick need the margin
const SCALE = 2;

interface PinVariant {
  status: SiteStatus;
  monopoly: boolean;
  active: boolean;
}

export function pinName(v: PinVariant): string {
  return `pin-${v.status}${v.monopoly ? "-mono" : ""}${v.active ? "-active" : ""}`;
}

function drawPin(v: PinVariant): ImageData {
  const size = CSS_SIZE * SCALE;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(SCALE, SCALE);
  const c = CSS_SIZE / 2;

  // Status ring
  if (v.status === "construction") {
    ctx.beginPath();
    ctx.arc(c, c, 7.25, 0, Math.PI * 2);
    ctx.strokeStyle = OCHRE;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else if (v.status === "planned") {
    ctx.beginPath();
    ctx.arc(c, c, 7.25, 0, Math.PI * 2);
    ctx.strokeStyle = INK_FAINT;
    ctx.lineWidth = 1.25;
    ctx.setLineDash([2.4, 2.2]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Active halo: a fine offset ring
  if (v.active) {
    ctx.beginPath();
    ctx.arc(c, c, v.status === "operational" ? 7 : 9.5, 0, Math.PI * 2);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // The pin itself
  ctx.beginPath();
  ctx.arc(c, c, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = v.active ? INK : PAPER;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.25;
  ctx.stroke();

  // Monopoly tick at NE, in red
  if (v.monopoly) {
    ctx.beginPath();
    ctx.moveTo(c + 5.4, c - 5.4);
    ctx.lineTo(c + 8.6, c - 8.6);
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
    for (const monopoly of [false, true]) {
      for (const active of [false, true]) {
        const v = { status, monopoly, active };
        const name = pinName(v);
        if (!map.hasImage(name)) {
          map.addImage(name, drawPin(v), { pixelRatio: SCALE });
        }
      }
    }
  }
}

/** Data-driven icon expression for site features. */
export const PIN_ICON_EXPRESSION = [
  "concat",
  "pin-",
  ["get", "status"],
  ["case", ["get", "monopoly"], "-mono", ""],
] as const;
