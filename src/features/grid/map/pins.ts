// Fuel-family pins per GRID-DESIGN.md §The map: the aistack surveyor's
// circle, interior wash by fuel family. Families sharing the teal wash
// differentiate by a small ink tick (wave = hydro, blade = wind, rays =
// solar, none = geothermal); storage draws as a small square. Coal renders
// in --ink-faint until the umber token is signed off. Under construction =
// dashed ring. Night variants are dimmed and uniform — night is a story
// state, not an analysis state; only shape and status survive the dark.
// Registered as pin-{d|n}-{fuel}-{status}.

import type { Map as MapboxMap } from "mapbox-gl";
import type { FuelFamily } from "../types";

const PAPER = "#F8F4E9";
const INK = "#2B4A8C";
const INK_FAINT = "#9DACC9";
const OCHRE = "#C99A3C";
const RED = "#C8502E";
const TEAL = "#4E7E74";

// Night kit — mirrors grid.css tokens (quarantined to the night set piece).
const NIGHT_SHEET = "#16213D";
const NIGHT_LINE = "#9FAECE";
const NIGHT_LAMP = "#E3C87E";

export const FUEL_FAMILIES: FuelFamily[] = [
  "nuclear", "gas", "coal", "oil", "hydro", "wind", "solar",
  "storage", "geothermal", "biomass", "other",
];

/** Interior wash per family (null = plain paper). Coal pending umber sign-off. */
const FUEL_WASH: Record<FuelFamily, string | null> = {
  nuclear: INK,
  gas: OCHRE,
  coal: INK_FAINT,
  oil: RED,
  hydro: TEAL,
  wind: TEAL,
  solar: TEAL,
  geothermal: TEAL,
  storage: TEAL,
  biomass: null,
  other: null,
};

const WASH_OPACITY = 0.32;
const CSS_SIZE = 30;
const SCALE = 2;

type Status = "operating" | "construction";
type Mode = "d" | "n";

function drawTick(ctx: CanvasRenderingContext2D, c: number, fuel: FuelFamily, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.lineCap = "round";
  if (fuel === "hydro") {
    // A small wave across the circle's waist.
    ctx.beginPath();
    ctx.moveTo(c - 3, c + 0.6);
    ctx.quadraticCurveTo(c - 1.5, c - 1.6, c, c + 0.6);
    ctx.quadraticCurveTo(c + 1.5, c + 2.8, c + 3, c + 0.6);
    ctx.stroke();
  } else if (fuel === "wind") {
    // Three blades from the hub.
    for (const a of [-90, 30, 150]) {
      const r = (a * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(c, c);
      ctx.lineTo(c + Math.cos(r) * 3.4, c + Math.sin(r) * 3.4);
      ctx.stroke();
    }
  } else if (fuel === "solar") {
    // Four short rays at the diagonals.
    for (const a of [45, 135, 225, 315]) {
      const r = (a * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(c + Math.cos(r) * 1.4, c + Math.sin(r) * 1.4);
      ctx.lineTo(c + Math.cos(r) * 3.4, c + Math.sin(r) * 3.4);
      ctx.stroke();
    }
  }
}

function drawPin(fuel: FuelFamily, status: Status, mode: Mode): ImageData {
  const size = CSS_SIZE * SCALE;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(SCALE, SCALE);
  const c = CSS_SIZE / 2;

  const night = mode === "n";
  const sheet = night ? NIGHT_SHEET : PAPER;
  const stroke = night ? NIGHT_LINE : INK;

  // Cleared disc: brush the sheet clean so the mark reads over lines/labels.
  ctx.beginPath();
  ctx.arc(c, c, 10.5, 0, Math.PI * 2);
  ctx.globalAlpha = night ? 0.72 : 0.88;
  ctx.fillStyle = sheet;
  ctx.fill();
  ctx.globalAlpha = 1;

  // Under construction: dashed ring (aistack's planned convention, promoted).
  if (status === "construction") {
    ctx.beginPath();
    ctx.arc(c, c, 8.4, 0, Math.PI * 2);
    ctx.strokeStyle = night ? NIGHT_LINE : INK_FAINT;
    ctx.lineWidth = 1.25;
    ctx.setLineDash([2.4, 2.2]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // The mark: circle for generation, square for storage.
  const square = fuel === "storage";
  const path = () => {
    ctx.beginPath();
    if (square) {
      const h = 4.9;
      ctx.rect(c - h, c - h, h * 2, h * 2);
    } else {
      ctx.arc(c, c, 5.5, 0, Math.PI * 2);
    }
  };

  path();
  ctx.fillStyle = sheet;
  ctx.fill();
  const wash = night ? NIGHT_LAMP : FUEL_WASH[fuel];
  if (wash) {
    ctx.globalAlpha = night ? 0.18 : WASH_OPACITY;
    ctx.fillStyle = wash;
    path();
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  path();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Family tick, day only — night keeps just shape and status.
  if (!night) drawTick(ctx, c, fuel, INK);

  return ctx.getImageData(0, 0, size, size);
}

export function addGridPinImages(map: MapboxMap) {
  for (const mode of ["d", "n"] as Mode[]) {
    for (const fuel of FUEL_FAMILIES) {
      for (const status of ["operating", "construction"] as Status[]) {
        const name = `pin-${mode}-${fuel}-${status}`;
        if (!map.hasImage(name)) {
          map.addImage(name, drawPin(fuel, status, mode), { pixelRatio: SCALE });
        }
      }
    }
  }
}

/** Data-driven icon expression; `mode` swaps the whole fleet day/night. */
export function pinIconExpression(mode: Mode) {
  return [
    "concat",
    `pin-${mode}-`,
    ["get", "fuel"],
    "-",
    ["get", "status"],
  ] as const;
}

/** Pins grow with zoom (aistack curve) scaled by capacity step:
 *  <250 MW ×0.85, 250–1000 ×1.0, >1000 ×1.25 (GRID-DESIGN). */
export const PIN_SIZE_EXPRESSION = [
  "interpolate", ["linear"], ["zoom"],
  3, ["step", ["get", "mw"], 0.72, 250, 0.85, 1000, 1.06],
  8, ["step", ["get", "mw"], 0.85, 250, 1, 1000, 1.25],
  11, ["step", ["get", "mw"], 1.02, 250, 1.2, 1000, 1.5],
] as const;
