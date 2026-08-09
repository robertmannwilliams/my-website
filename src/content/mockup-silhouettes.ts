import type { SilhouetteDraw } from "@/components/StipplePlate";

// All silhouettes are drawn in white on black, to be sampled by StipplePlate's
// rejection-sampling routine. Shapes favor simple industrial masses with a few
// vertical or horizontal accents so the dot distribution reads as an object.

// ───────────────────────── refinery (landing) ─────────────────────────
export const drawRefinery: SilhouetteDraw = (ctx, w, h) => {
  const ground = h * 0.88;

  // Ground line
  ctx.fillRect(0, ground, w, 2);

  // Main distillation column — tall cylinder with dome
  const col1X = w * 0.44;
  const col1W = w * 0.11;
  const col1Top = h * 0.1;
  ctx.fillRect(col1X - col1W / 2, col1Top, col1W, ground - col1Top);
  ctx.beginPath();
  ctx.arc(col1X, col1Top, col1W / 2, Math.PI, 2 * Math.PI);
  ctx.fill();
  // Platform rings
  for (let py = col1Top + h * 0.06; py < ground - 20; py += h * 0.09) {
    ctx.fillRect(col1X - col1W / 2 - 5, py, col1W + 10, 3);
  }

  // Secondary column — shorter, thinner
  const col2X = w * 0.64;
  const col2W = w * 0.075;
  const col2Top = h * 0.28;
  ctx.fillRect(col2X - col2W / 2, col2Top, col2W, ground - col2Top);
  ctx.beginPath();
  ctx.arc(col2X, col2Top, col2W / 2, Math.PI, 2 * Math.PI);
  ctx.fill();
  for (let py = col2Top + h * 0.06; py < ground - 20; py += h * 0.08) {
    ctx.fillRect(col2X - col2W / 2 - 4, py, col2W + 8, 2);
  }

  // Tall smokestack, far-right
  const stX = w * 0.84;
  const stW = w * 0.05;
  const stTop = h * 0.04;
  ctx.fillRect(stX - stW / 2, stTop, stW, ground - stTop);
  ctx.fillRect(stX - stW / 2 - 3, stTop, stW + 6, 6);

  // Horizontal cylindrical storage tank
  const tkTop = ground - h * 0.11;
  const tkH = h * 0.09;
  ctx.fillRect(w * 0.08, tkTop, w * 0.26, tkH);
  ctx.beginPath();
  ctx.arc(w * 0.08, tkTop + tkH / 2, tkH / 2, 0.5 * Math.PI, 1.5 * Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(w * 0.34, tkTop + tkH / 2, tkH / 2, 1.5 * Math.PI, 0.5 * Math.PI);
  ctx.fill();

  // Spherical tank on legs
  const sphereR = Math.min(w, h) * 0.07;
  const sphereCX = w * 0.2;
  const sphereCY = ground - h * 0.22;
  ctx.beginPath();
  ctx.arc(sphereCX, sphereCY, sphereR, 0, 2 * Math.PI);
  ctx.fill();
  // Legs
  ctx.fillRect(sphereCX - sphereR * 0.9, sphereCY + 4, 3, ground - sphereCY - 4);
  ctx.fillRect(sphereCX + sphereR * 0.6, sphereCY + 4, 3, ground - sphereCY - 4);

  // Flare stack with flame
  const flX = w * 0.04;
  const flTop = h * 0.22;
  ctx.fillRect(flX, flTop, 3, ground - flTop);
  // Flame (tapered)
  ctx.beginPath();
  ctx.moveTo(flX - 4, flTop);
  ctx.quadraticCurveTo(flX + 1.5, flTop - h * 0.08, flX + 7, flTop);
  ctx.closePath();
  ctx.fill();

  // Horizontal piping bands
  ctx.fillRect(col1X, h * 0.38, stX - col1X, 3);
  ctx.fillRect(col2X, h * 0.55, stX - col2X, 3);
  ctx.fillRect(w * 0.35, h * 0.72, col1X - w * 0.35, 3);
};

// ───────────────────────── refrigerant cylinder ─────────────────────────
export const drawRefrigerantCylinder: SilhouetteDraw = (ctx, w, h) => {
  const cx = w / 2;
  const bodyW = w * 0.34;
  const bodyTop = h * 0.2;
  const bodyBot = h * 0.9;

  // Cylinder body
  ctx.fillRect(cx - bodyW / 2, bodyTop, bodyW, bodyBot - bodyTop);
  // Rounded dome top
  ctx.beginPath();
  ctx.ellipse(cx, bodyTop, bodyW / 2, h * 0.08, 0, Math.PI, 2 * Math.PI);
  ctx.fill();
  // Rounded base
  ctx.beginPath();
  ctx.ellipse(cx, bodyBot, bodyW / 2, h * 0.04, 0, 0, Math.PI);
  ctx.fill();

  // Collar neck
  const neckW = bodyW * 0.38;
  ctx.fillRect(cx - neckW / 2, bodyTop - h * 0.05, neckW, h * 0.05);

  // Valve cap (squat rectangle atop)
  const capW = bodyW * 0.22;
  const capTop = bodyTop - h * 0.11;
  ctx.fillRect(cx - capW / 2, capTop, capW, h * 0.06);
  // Valve handle
  ctx.fillRect(cx - capW * 1.2, capTop - 3, capW * 2.4, 4);

  // Base ring
  ctx.fillRect(cx - bodyW / 2 - 6, bodyBot - 4, bodyW + 12, 6);

  // Label band (thin line across middle)
  ctx.fillRect(cx - bodyW / 2 + 4, h * 0.46, bodyW - 8, 2);
  ctx.fillRect(cx - bodyW / 2 + 4, h * 0.5, bodyW - 8, 1);
};

// ───────────────────────── turbofan engine ─────────────────────────
export const drawTurbofan: SilhouetteDraw = (ctx, w, h) => {
  const cx = w * 0.48;
  const cy = h * 0.58;
  const rX = w * 0.38;
  const rY = h * 0.24;

  // Main nacelle (horizontal ellipse)
  ctx.beginPath();
  ctx.ellipse(cx, cy, rX, rY, 0, 0, 2 * Math.PI);
  ctx.fill();

  // Inlet lip (thin ring at front)
  ctx.fillStyle = "black";
  ctx.beginPath();
  ctx.ellipse(cx - rX * 0.85, cy, rX * 0.12, rY * 0.82, 0, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = "white";
  // Central hub / spinner
  ctx.beginPath();
  ctx.ellipse(cx - rX * 0.85, cy, rX * 0.04, rY * 0.25, 0, 0, 2 * Math.PI);
  ctx.fill();
  // Fan blades (radiating strokes from hub)
  ctx.lineWidth = 2;
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
    ctx.beginPath();
    ctx.moveTo(cx - rX * 0.85, cy);
    ctx.lineTo(
      cx - rX * 0.85 + Math.cos(a) * rX * 0.11,
      cy + Math.sin(a) * rY * 0.75
    );
    ctx.stroke();
  }
  ctx.lineWidth = 1;

  // Nozzle cone at rear (narrower)
  ctx.beginPath();
  ctx.moveTo(cx + rX * 0.85, cy - rY * 0.85);
  ctx.lineTo(cx + rX * 1.08, cy - rY * 0.3);
  ctx.lineTo(cx + rX * 1.08, cy + rY * 0.3);
  ctx.lineTo(cx + rX * 0.85, cy + rY * 0.85);
  ctx.closePath();
  ctx.fill();

  // Pylon connecting to wing above
  ctx.beginPath();
  ctx.moveTo(cx - rX * 0.2, cy - rY);
  ctx.lineTo(cx + rX * 0.2, cy - rY);
  ctx.lineTo(cx + rX * 0.4, cy - rY * 1.8);
  ctx.lineTo(cx - rX * 0.4, cy - rY * 1.8);
  ctx.closePath();
  ctx.fill();

  // Wing underside (horizontal slab)
  ctx.fillRect(cx - w * 0.4, h * 0.08, w * 0.95, h * 0.08);
};

// ───────────────────────── wind turbine ─────────────────────────
export const drawWindTurbine: SilhouetteDraw = (ctx, w, h) => {
  const baseX = w * 0.5;
  const ground = h * 0.95;
  const hubY = h * 0.4;

  // Tapered tower
  const botW = w * 0.07;
  const topW = w * 0.035;
  ctx.beginPath();
  ctx.moveTo(baseX - botW / 2, ground);
  ctx.lineTo(baseX - topW / 2, hubY);
  ctx.lineTo(baseX + topW / 2, hubY);
  ctx.lineTo(baseX + botW / 2, ground);
  ctx.closePath();
  ctx.fill();

  // Nacelle
  const nacW = w * 0.16;
  const nacH = h * 0.07;
  ctx.fillRect(baseX - nacW * 0.35, hubY - nacH / 2, nacW, nacH);
  // Hub
  ctx.beginPath();
  ctx.arc(baseX + nacW * 0.55, hubY, h * 0.035, 0, 2 * Math.PI);
  ctx.fill();

  // Three blades — 120° apart, tapered
  const hubX = baseX + nacW * 0.55;
  const bladeLen = h * 0.35;
  const bladeBaseW = w * 0.035;
  const angles = [-Math.PI / 2, -Math.PI / 2 + (2 * Math.PI) / 3, -Math.PI / 2 + (4 * Math.PI) / 3];
  for (const a of angles) {
    const tipX = hubX + Math.cos(a) * bladeLen;
    const tipY = hubY + Math.sin(a) * bladeLen;
    const perpX = -Math.sin(a);
    const perpY = Math.cos(a);
    ctx.beginPath();
    ctx.moveTo(hubX + perpX * bladeBaseW, hubY + perpY * bladeBaseW);
    ctx.lineTo(hubX - perpX * bladeBaseW, hubY - perpY * bladeBaseW);
    ctx.lineTo(tipX, tipY);
    ctx.closePath();
    ctx.fill();
  }

  // Ground line
  ctx.fillRect(0, ground, w, 2);
};

// ───────────────────────── containership ─────────────────────────
export const drawContainership: SilhouetteDraw = (ctx, w, h) => {
  const waterline = h * 0.7;
  const hullTop = h * 0.55;
  const hullBot = h * 0.82;
  const bowX = w * 0.92;
  const sternX = w * 0.06;

  // Hull body
  ctx.beginPath();
  ctx.moveTo(sternX, hullTop);
  ctx.lineTo(bowX - w * 0.04, hullTop);
  // Bow curve
  ctx.quadraticCurveTo(bowX + w * 0.03, hullTop + h * 0.04, bowX - w * 0.02, hullBot - h * 0.02);
  ctx.lineTo(sternX + w * 0.02, hullBot);
  // Stern curve back to start
  ctx.quadraticCurveTo(sternX - w * 0.01, hullBot, sternX, hullTop);
  ctx.closePath();
  ctx.fill();

  // Bulbous bow underwater
  ctx.beginPath();
  ctx.ellipse(bowX, hullBot - h * 0.02, w * 0.03, h * 0.035, 0, 0, 2 * Math.PI);
  ctx.fill();

  // Bridge superstructure at stern
  const brX = w * 0.14;
  const brW = w * 0.09;
  const brH = h * 0.18;
  ctx.fillRect(brX, hullTop - brH, brW, brH);
  // Bridge deck windows row (just a darker slit — blacked out)
  ctx.fillStyle = "black";
  ctx.fillRect(brX + 3, hullTop - brH + 6, brW - 6, 3);
  ctx.fillStyle = "white";
  // Funnel
  ctx.fillRect(brX + brW * 0.35, hullTop - brH - h * 0.06, brW * 0.35, h * 0.06);

  // Container stacks on deck — rows of rectangles stepping in height
  const stackBot = hullTop;
  const stackX0 = w * 0.26;
  const stackX1 = w * 0.88;
  const stackH = h * 0.14;
  // Base layer
  ctx.fillRect(stackX0, stackBot - stackH, stackX1 - stackX0, stackH);
  // Gaps (vertical black slits to suggest individual containers)
  ctx.fillStyle = "black";
  for (let sx = stackX0 + 10; sx < stackX1 - 4; sx += 14) {
    ctx.fillRect(sx, stackBot - stackH + 2, 1, stackH - 4);
  }
  ctx.fillStyle = "white";
  // Top layer (shorter, in middle)
  ctx.fillRect(stackX0 + w * 0.1, stackBot - stackH - h * 0.05, stackX1 - stackX0 - w * 0.2, h * 0.05);

  // Waterline — faint horizontal band below hull
  for (let wx = 0; wx < w; wx += 4) {
    if ((wx / 4) % 3 === 0) {
      ctx.fillRect(wx, waterline + h * 0.12, 6, 1);
    }
  }
};

// ───────────────────────── battery container stack ─────────────────────────
export const drawBatteryStack: SilhouetteDraw = (ctx, w, h) => {
  const ground = h * 0.88;
  const unitH = h * 0.3;
  const unitW = w * 0.24;
  const gap = w * 0.03;
  const totalW = unitW * 3 + gap * 2;
  const startX = (w - totalW) / 2;
  const rowTop = ground - unitH * 2 - h * 0.02;

  // Row 1 (back row, slightly smaller feel achieved by shifting up)
  for (let i = 0; i < 3; i++) {
    const x = startX + i * (unitW + gap);
    ctx.fillRect(x, rowTop, unitW, unitH);
    // Door seams
    ctx.fillStyle = "black";
    ctx.fillRect(x + unitW / 2, rowTop + 4, 1, unitH - 8);
    // Louvers — thin horizontal slits
    for (let ly = rowTop + 10; ly < rowTop + unitH - 10; ly += 6) {
      ctx.fillRect(x + 8, ly, unitW - 16, 1);
    }
    ctx.fillStyle = "white";
    // Corner posts (retain edge dots)
    ctx.fillRect(x, rowTop, 3, unitH);
    ctx.fillRect(x + unitW - 3, rowTop, 3, unitH);
    ctx.fillRect(x, rowTop, unitW, 3);
    ctx.fillRect(x, rowTop + unitH - 3, unitW, 3);
  }

  // Row 2 (front row, on the ground)
  const row2Top = ground - unitH;
  for (let i = 0; i < 3; i++) {
    const x = startX + i * (unitW + gap) + unitW * 0.12;
    if (x + unitW > w) break;
    ctx.fillRect(x, row2Top, unitW, unitH);
    ctx.fillStyle = "black";
    ctx.fillRect(x + unitW / 2, row2Top + 4, 1, unitH - 8);
    for (let ly = row2Top + 10; ly < row2Top + unitH - 10; ly += 6) {
      ctx.fillRect(x + 8, ly, unitW - 16, 1);
    }
    ctx.fillStyle = "white";
    ctx.fillRect(x, row2Top, 3, unitH);
    ctx.fillRect(x + unitW - 3, row2Top, 3, unitH);
    ctx.fillRect(x, row2Top, unitW, 3);
    ctx.fillRect(x, row2Top + unitH - 3, unitW, 3);
  }

  // Conduit bundles overhead
  for (let cy = rowTop - 14; cy < rowTop - 4; cy += 3) {
    ctx.fillRect(startX - 6, cy, totalW + 12, 1);
  }

  // Ground
  ctx.fillRect(0, ground, w, 2);
};

// ───────────────────────── cooling tower ─────────────────────────
export const drawCoolingTower: SilhouetteDraw = (ctx, w, h) => {
  const ground = h * 0.9;
  const topY = h * 0.18;
  const cx = w / 2;
  const botHalf = w * 0.28;
  const midHalf = w * 0.15;
  const topHalf = w * 0.22;

  // Left silhouette curve
  ctx.beginPath();
  ctx.moveTo(cx - botHalf, ground);
  ctx.quadraticCurveTo(cx - midHalf * 0.7, (ground + topY) / 2, cx - midHalf, h * 0.42);
  ctx.quadraticCurveTo(cx - topHalf * 0.9, topY + h * 0.08, cx - topHalf, topY);
  // Top rim
  ctx.lineTo(cx + topHalf, topY);
  // Right silhouette back down
  ctx.quadraticCurveTo(cx + topHalf * 0.9, topY + h * 0.08, cx + midHalf, h * 0.42);
  ctx.quadraticCurveTo(cx + midHalf * 0.7, (ground + topY) / 2, cx + botHalf, ground);
  ctx.closePath();
  ctx.fill();

  // Interior shadow ring at top (hollow)
  ctx.fillStyle = "black";
  ctx.beginPath();
  ctx.ellipse(cx, topY + 6, topHalf * 0.85, h * 0.02, 0, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = "white";

  // Faint steam plume above — a few scattered ellipses
  for (let i = 0; i < 6; i++) {
    const px = cx + (Math.sin(i * 2.3) * topHalf * 0.6);
    const py = topY - 10 - i * 8;
    ctx.beginPath();
    ctx.ellipse(px, py, topHalf * (0.55 + i * 0.07), h * (0.02 + i * 0.008), 0, 0, 2 * Math.PI);
    ctx.fill();
  }

  // Ground
  ctx.fillRect(0, ground, w, 2);
};
