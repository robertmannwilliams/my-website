"use client";

import { useRef, useMemo, useEffect, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import landTopology from "world-atlas/land-50m.json";

// --- Land mask generation ---

function createLandMask(width: number, height: number): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  const topology = landTopology as unknown as Topology;
  const land = feature(
    topology,
    topology.objects.land as GeometryCollection
  ) as FeatureCollection<MultiPolygon | Polygon>;

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "white";
  for (const feat of land.features) {
    const geom = feat.geometry;
    const polygons =
      geom.type === "MultiPolygon"
        ? geom.coordinates
        : [geom.coordinates];

    for (const polygon of polygons) {
      ctx.beginPath();
      for (const ring of polygon) {
        let prevLon: number | null = null;
        for (let i = 0; i < ring.length; i++) {
          const [lon, lat] = ring[i];
          const x = ((lon + 180) / 360) * width;
          const y = ((90 - lat) / 180) * height;
          // Break path on antimeridian crossing to avoid horizontal lines
          const jump = prevLon !== null && Math.abs(lon - prevLon) > 170;
          if (i === 0 || jump) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          prevLon = lon;
        }
        ctx.closePath();
      }
      ctx.fill();
    }
  }

  return ctx.getImageData(0, 0, width, height);
}

function isLand(
  lat: number,
  lon: number,
  mask: ImageData
): boolean {
  const { width, height, data } = mask;
  const x = Math.floor(((lon + 180) / 360) * width) % width;
  const y = Math.max(0, Math.min(height - 1, Math.floor(((90 - lat) / 180) * height)));
  const idx = (y * width + x) * 4;
  return data[idx] > 128;
}

// --- Coordinate conversion ---

function latLonToXYZ(
  lat: number,
  lon: number,
  radius: number
): [number, number, number] {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;
  return [
    radius * Math.cos(latRad) * Math.cos(lonRad),
    radius * Math.sin(latRad),
    -radius * Math.cos(latRad) * Math.sin(lonRad),
  ];
}

// --- NYC Skyline mask generation ---

function createSkylineMask(width: number, height: number): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "white";
  ctx.strokeStyle = "white";

  const ground = height * 0.78; // ground / water level

  // Helper to draw a building rectangle
  const building = (x: number, w: number, h: number) => {
    ctx.fillRect(x, ground - h, w, h);
  };

  // Helper for a spire/antenna
  const spire = (cx: number, baseY: number, h: number) => {
    ctx.beginPath();
    ctx.moveTo(cx - 1.5, baseY);
    ctx.lineTo(cx, baseY - h);
    ctx.lineTo(cx + 1.5, baseY);
    ctx.closePath();
    ctx.fill();
  };

  // Helper for tapered building
  const tapered = (x: number, wBot: number, wTop: number, h: number) => {
    const cx = x + wBot / 2;
    ctx.beginPath();
    ctx.moveTo(cx - wBot / 2, ground);
    ctx.lineTo(cx - wTop / 2, ground - h);
    ctx.lineTo(cx + wTop / 2, ground - h);
    ctx.lineTo(cx + wBot / 2, ground);
    ctx.closePath();
    ctx.fill();
  };

  // ===== STATUE OF LIBERTY (far left, on island) =====
  const libertyX = 18;
  const libertyBase = ground - 10; // sits on small island
  // Pedestal
  ctx.fillRect(libertyX - 6, libertyBase - 28, 12, 28);
  ctx.fillRect(libertyX - 8, libertyBase - 8, 16, 8); // wider base step
  // Body/robe (tapered)
  ctx.beginPath();
  ctx.moveTo(libertyX - 5, libertyBase - 28);
  ctx.lineTo(libertyX - 3, libertyBase - 58);
  ctx.lineTo(libertyX + 3, libertyBase - 58);
  ctx.lineTo(libertyX + 5, libertyBase - 28);
  ctx.closePath();
  ctx.fill();
  // Head
  ctx.fillRect(libertyX - 2, libertyBase - 62, 4, 4);
  // Crown (spiky)
  for (let ci = -3; ci <= 3; ci++) {
    ctx.beginPath();
    ctx.moveTo(libertyX + ci * 1.2, libertyBase - 62);
    ctx.lineTo(libertyX + ci * 1.8, libertyBase - 68);
    ctx.lineTo(libertyX + ci * 1.2 + 0.8, libertyBase - 62);
    ctx.closePath();
    ctx.fill();
  }
  // Torch arm (raised right)
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(libertyX + 2, libertyBase - 52);
  ctx.lineTo(libertyX + 6, libertyBase - 70);
  ctx.stroke();
  // Torch flame
  ctx.beginPath();
  ctx.moveTo(libertyX + 4, libertyBase - 72);
  ctx.lineTo(libertyX + 6, libertyBase - 78);
  ctx.lineTo(libertyX + 8, libertyBase - 72);
  ctx.closePath();
  ctx.fill();
  // Small island (manual ellipse for compatibility)
  ctx.beginPath();
  ctx.save();
  ctx.translate(libertyX, libertyBase + 2);
  ctx.scale(14, 4);
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.restore();
  ctx.fill();

  // ===== BROOKLYN BRIDGE (left-center, foreground) =====
  const deckY = ground - 42;
  const deckThickness = 7;
  ctx.fillRect(48, deckY, 175, deckThickness);

  // Gothic tower 1
  const t1x = 75;
  const towerH = 108;
  building(t1x - 7, 14, towerH);
  // Double pointed Gothic top
  ctx.beginPath();
  ctx.moveTo(t1x - 7, ground - towerH);
  ctx.lineTo(t1x - 3.5, ground - towerH - 12);
  ctx.lineTo(t1x, ground - towerH);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(t1x, ground - towerH);
  ctx.lineTo(t1x + 3.5, ground - towerH - 12);
  ctx.lineTo(t1x + 7, ground - towerH);
  ctx.closePath();
  ctx.fill();
  // Gothic arch openings (two arches side by side)
  ctx.fillStyle = "black";
  ctx.beginPath();
  ctx.moveTo(t1x - 5, deckY);
  ctx.quadraticCurveTo(t1x - 2.5, deckY - 16, t1x, deckY);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(t1x, deckY);
  ctx.quadraticCurveTo(t1x + 2.5, deckY - 16, t1x + 5, deckY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "white";

  // Gothic tower 2
  const t2x = 185;
  building(t2x - 7, 14, towerH);
  ctx.beginPath();
  ctx.moveTo(t2x - 7, ground - towerH);
  ctx.lineTo(t2x - 3.5, ground - towerH - 12);
  ctx.lineTo(t2x, ground - towerH);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(t2x, ground - towerH);
  ctx.lineTo(t2x + 3.5, ground - towerH - 12);
  ctx.lineTo(t2x + 7, ground - towerH);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "black";
  ctx.beginPath();
  ctx.moveTo(t2x - 5, deckY);
  ctx.quadraticCurveTo(t2x - 2.5, deckY - 16, t2x, deckY);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(t2x, deckY);
  ctx.quadraticCurveTo(t2x + 2.5, deckY - 16, t2x + 5, deckY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "white";

  // Suspension cables
  ctx.lineWidth = 2;
  const drawCable = (startX: number, startY: number, endX: number, endY: number, sag: number) => {
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    const midX = (startX + endX) / 2;
    ctx.quadraticCurveTo(midX, Math.max(startY, endY) + sag, endX, endY);
    ctx.stroke();
  };
  const towerTopY = ground - towerH - 12;
  drawCable(t1x, towerTopY, t2x, towerTopY, 38);
  drawCable(t1x, towerTopY + 7, t2x, towerTopY + 7, 33);
  drawCable(48, deckY - 4, t1x, towerTopY, 14);
  drawCable(t2x, towerTopY, 223, deckY - 4, 14);

  // Vertical suspender cables
  ctx.lineWidth = 1;
  for (let sx = t1x + 8; sx < t2x - 5; sx += 7) {
    const t = (sx - t1x) / (t2x - t1x);
    const cableY = towerTopY + 3.5 + Math.sin(t * Math.PI) * 38;
    ctx.beginPath();
    ctx.moveTo(sx, cableY);
    ctx.lineTo(sx, deckY);
    ctx.stroke();
  }

  // ===== MANHATTAN SKYLINE (behind bridge, extending right) =====

  // Financial District buildings (behind/around bridge)
  building(90, 14, 72);
  building(106, 11, 62);
  building(120, 15, 82);
  building(138, 12, 68);
  building(155, 10, 58);

  // ===== ONE WORLD TRADE CENTER (tallest, distinctive taper + spire) =====
  const wtcX = 210;
  const wtcH = height * 0.72;
  // Main tower — tapered glass facade
  tapered(wtcX, 22, 14, wtcH);
  // Parapet at top
  ctx.fillRect(wtcX + 4, ground - wtcH - 2, 14, 4);
  // Tall antenna/spire
  spire(wtcX + 11, ground - wtcH - 2, 30);

  // Buildings around WTC
  building(195, 12, 78);
  building(234, 16, 92);
  building(252, 13, 72);

  // Mid-section filler buildings
  building(267, 18, 100);
  building(287, 14, 80);
  building(303, 12, 62);
  building(317, 16, 88);
  building(335, 11, 52);

  // ===== CHRYSLER BUILDING (distinctive art deco crown) =====
  const chryslerX = 352;
  const chryslerW = 18;
  const chryslerH = 135;
  // Main shaft
  building(chryslerX, chryslerW, chryslerH - 30);
  // Art deco crown — stacked triangular arches (sunburst pattern)
  const crownBase = ground - chryslerH + 30;
  const cx = chryslerX + chryslerW / 2;
  // Layer 1 (widest)
  ctx.beginPath();
  ctx.moveTo(cx - 10, crownBase);
  ctx.lineTo(cx - 6, crownBase - 10);
  ctx.lineTo(cx + 6, crownBase - 10);
  ctx.lineTo(cx + 10, crownBase);
  ctx.closePath();
  ctx.fill();
  // Layer 2
  ctx.beginPath();
  ctx.moveTo(cx - 6, crownBase - 10);
  ctx.lineTo(cx - 3.5, crownBase - 20);
  ctx.lineTo(cx + 3.5, crownBase - 20);
  ctx.lineTo(cx + 6, crownBase - 10);
  ctx.closePath();
  ctx.fill();
  // Layer 3 (narrowest)
  ctx.beginPath();
  ctx.moveTo(cx - 3.5, crownBase - 20);
  ctx.lineTo(cx - 1.5, crownBase - 27);
  ctx.lineTo(cx + 1.5, crownBase - 27);
  ctx.lineTo(cx + 3.5, crownBase - 20);
  ctx.closePath();
  ctx.fill();
  // Needle spire at top
  spire(cx, crownBase - 27, 14);
  // Small triangular eagle ornaments on crown edges
  for (let ei = -2; ei <= 2; ei++) {
    const ex = cx + ei * 4;
    const ey = crownBase - 2;
    ctx.beginPath();
    ctx.moveTo(ex - 1.5, ey);
    ctx.lineTo(ex, ey - 5);
    ctx.lineTo(ex + 1.5, ey);
    ctx.closePath();
    ctx.fill();
  }

  // ===== EMPIRE STATE BUILDING (stepped setbacks + antenna) =====
  const empireX = 390;
  const empireW = 24;
  // Base section (widest)
  building(empireX, empireW, 110);
  // First setback
  building(empireX + 3, empireW - 6, 128);
  // Second setback
  building(empireX + 5, empireW - 10, 142);
  // Third setback (narrow tower)
  building(empireX + 7, empireW - 14, 155);
  // Observatory bump
  ctx.fillRect(empireX + 8, ground - 155 - 4, empireW - 16, 4);
  // Antenna mast
  const empCx = empireX + empireW / 2;
  spire(empCx, ground - 159, 28);

  // Buildings flanking Empire State
  building(375, 14, 95);
  building(416, 16, 88);

  // ===== RIGHT SIDE (shorter midtown/uptown buildings) =====
  building(434, 18, 100);
  building(454, 13, 75);
  building(469, 16, 88);
  building(487, 12, 58);
  building(501, 10, 42);

  // Thin ground line (not a solid fill)
  ctx.fillRect(0, ground, width, 2);

  // Water reflections — very sparse dots below ground line
  for (let wx = 0; wx < width; wx += 4) {
    for (let wy = ground + 3; wy < Math.min(ground + 40, height); wy += 5) {
      if (Math.random() < 0.08) {
        ctx.fillRect(wx, wy, 1, 1);
      }
    }
  }

  return ctx.getImageData(0, 0, width, height);
}

// --- Globe particle generation ---

const SURFACE_LAND_COUNT = 35000;
const SURFACE_OCEAN_COUNT = 18000;
const INTERIOR_COUNT = 25000;
const RADIUS = 2.0;

function generateGlobeParticles(mask: ImageData) {
  const total = SURFACE_LAND_COUNT + SURFACE_OCEAN_COUNT + INTERIOR_COUNT;
  const positions = new Float32Array(total * 3);
  const sizes = new Float32Array(total);
  const opacities = new Float32Array(total);
  const isLandArr = new Float32Array(total);

  let landPlaced = 0;
  let oceanPlaced = 0;
  let idx = 0;
  let attempts = 0;

  // --- Surface particles (land + ocean on the sphere shell) ---
  while (
    (landPlaced < SURFACE_LAND_COUNT || oceanPlaced < SURFACE_OCEAN_COUNT) &&
    attempts < 1000000
  ) {
    attempts++;

    const lat = Math.asin(2 * Math.random() - 1) * (180 / Math.PI);
    const lon = Math.random() * 360 - 180;
    const land = isLand(lat, lon, mask);

    if (land && landPlaced >= SURFACE_LAND_COUNT) continue;
    if (!land && oceanPlaced >= SURFACE_OCEAN_COUNT) continue;

    const [x, y, z] = latLonToXYZ(lat, lon, RADIUS);
    const i3 = idx * 3;
    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;

    if (land) {
      sizes[idx] = 1.0 + Math.random() * 1.4;
      opacities[idx] = 0.6 + Math.random() * 0.4;
      isLandArr[idx] = 1.0;
      landPlaced++;
    } else {
      sizes[idx] = 0.8 + Math.random() * 1.0;
      opacities[idx] = 0.3 + Math.random() * 0.25;
      isLandArr[idx] = 0.0;
      oceanPlaced++;
    }

    idx++;
  }

  // --- Interior particles (fill the volume inside the sphere) ---
  let interiorPlaced = 0;
  while (interiorPlaced < INTERIOR_COUNT) {
    // Uniform random point inside a sphere using rejection sampling
    const rx = Math.random() * 2 - 1;
    const ry = Math.random() * 2 - 1;
    const rz = Math.random() * 2 - 1;
    const distSq = rx * rx + ry * ry + rz * rz;
    if (distSq > 1.0) continue; // reject points outside unit sphere

    const dist = Math.sqrt(distSq);

    const x = rx * RADIUS;
    const y = ry * RADIUS;
    const z = rz * RADIUS;

    const i3 = idx * 3;
    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;

    // Interior particles: visible fill, denser near surface
    const depthFactor = 0.5 + dist * 0.5;
    sizes[idx] = (0.7 + Math.random() * 0.9) * depthFactor;
    opacities[idx] = (0.18 + Math.random() * 0.2) * depthFactor;
    isLandArr[idx] = 0.0;

    idx++;
    interiorPlaced++;
  }

  return {
    positions: positions.slice(0, idx * 3),
    sizes: sizes.slice(0, idx),
    opacities: opacities.slice(0, idx),
    isLandArr: isLandArr.slice(0, idx),
  };
}

// --- Skyline position generation ---

function generateSkylinePositions(count: number, mask: ImageData): Float32Array {
  const { width, height, data } = mask;
  const positions = new Float32Array(count * 3);

  // World-space bounds for skyline (right side of viewport)
  // Camera at origin looking straight ahead, skyline on the right
  const worldMinX = 1.0;
  const worldMaxX = 4.5;
  const worldMinY = -0.4;
  const worldMaxY = 2.6;

  let placed = 0;
  let attempts = 0;

  while (placed < count && attempts < count * 20) {
    attempts++;

    const px = Math.floor(Math.random() * width);
    const py = Math.floor(Math.random() * height);
    const idx = (py * width + px) * 4;

    if (data[idx] <= 128) continue; // not part of skyline

    // Map canvas coords to world space
    const x = worldMinX + (px / width) * (worldMaxX - worldMinX);
    const y = worldMaxY - (py / height) * (worldMaxY - worldMinY); // inverted Y
    const z = (Math.random() - 0.5) * 0.3; // small depth offset

    const i3 = placed * 3;
    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;

    placed++;
  }

  // If we couldn't fill all positions (unlikely), fill remainder off-screen
  while (placed < count) {
    const i3 = placed * 3;
    positions[i3] = 100; // far off-screen
    positions[i3 + 1] = 100;
    positions[i3 + 2] = 0;
    placed++;
  }

  return positions;
}

// --- Shaders ---

const vertexShader = `
  attribute float aSize;
  attribute float aOpacity;
  attribute float aIsLand;
  attribute vec3 aSkylinePos;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform vec2 uMouse;
  uniform float uExplode;
  uniform float uScatter;
  uniform vec3 uScatterDir;
  uniform float uMorph;
  varying float vOpacity;
  varying float vIsLand;

  // Per-particle pseudo-random
  float hash(vec3 p) {
    return fract(sin(dot(p.xy, vec2(12.9898, 78.233)) + p.z * 45.164) * 43758.5453);
  }

  void main() {
    // Morph between globe and skyline positions
    vec3 pos = mix(position, aSkylinePos, uMorph);
    float rand = hash(position);
    float rand2 = hash(position.zyx);

    // Scale down effects as morph increases
    float interactionScale = 1.0 - uMorph;

    // --- Easter egg 1: Konami explosion ---
    if (uExplode > 0.001 && interactionScale > 0.01) {
      float dist = length(pos);
      vec3 explodeDir = dist > 0.001 ? normalize(pos) : vec3(0.0, 1.0, 0.0);
      vec3 tangent = normalize(cross(explodeDir, vec3(rand - 0.5, rand2 - 0.5, rand * rand2 - 0.25)));
      vec3 offset = explodeDir * (2.5 + rand * 4.0) + tangent * (rand2 - 0.5) * 2.0;
      pos += offset * uExplode * interactionScale;
    }

    // --- Easter egg 2: Speed spin scatter ---
    if (uScatter > 0.001 && interactionScale > 0.01) {
      float pDist = length(position);
      vec3 radialDir = pDist > 0.001 ? normalize(position) : vec3(0.0, 1.0, 0.0);
      vec3 tangent = normalize(cross(radialDir, vec3(rand - 0.5, rand2 - 0.5, rand * rand2 - 0.25)));
      vec3 scatterOffset = radialDir * (0.6 + rand * 1.2) + tangent * (rand2 - 0.5) * 0.8;
      pos += scatterOffset * uScatter * interactionScale;
    }

    // Subtle shimmer (reduced during morph)
    float shimmer = sin(uTime * 0.5 + pos.x * 10.0 + pos.y * 7.0 + pos.z * 13.0) * interactionScale;

    // Project to screen space for mouse push
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    vec4 projected = projectionMatrix * mv;
    vec2 screenCoord = projected.xy / projected.w;

    // Mouse push (disabled during morph)
    vec3 pushOffset = vec3(0.0);
    if (length(uMouse) < 3.0 && interactionScale > 0.01) {
      vec2 toMouse = screenCoord - uMouse;
      float mouseDist = length(toMouse);
      float pushStrength = smoothstep(0.5, 0.0, mouseDist) * 0.10 * interactionScale;
      vec2 pushDir = mouseDist > 0.001 ? toMouse / mouseDist : vec2(0.0);
      pushOffset = vec3(pushDir * pushStrength, 0.0);
    }

    vec4 finalMv = modelViewMatrix * vec4(pos, 1.0);
    finalMv.xy += pushOffset.xy;
    gl_Position = projectionMatrix * finalMv;

    float sizeMultiplier = 1.0 + shimmer * 0.08;
    gl_PointSize = aSize * sizeMultiplier * uPixelRatio * (5.0 / -finalMv.z);
    gl_PointSize = max(gl_PointSize, 0.5);

    vOpacity = aOpacity * (1.0 + shimmer * 0.05);
    vIsLand = aIsLand;
  }
`;

const fragmentShader = `
  uniform vec3 uLandColor;
  uniform vec3 uOceanColor;
  varying float vOpacity;
  varying float vIsLand;

  void main() {
    vec2 c = gl_PointCoord - vec2(0.5);
    float d = length(c);
    if (d > 0.5) discard;

    float alpha = smoothstep(0.5, 0.05, d);

    vec3 color = mix(uOceanColor, uLandColor, vIsLand);

    gl_FragColor = vec4(color, alpha * vOpacity);
  }
`;

// --- Konami code sequence ---
const KONAMI_SEQUENCE = [
  "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
  "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight",
  "b", "a",
];

// --- React components ---

// Theme color definitions
const LIGHT_LAND = new THREE.Color(0.20, 0.29, 0.20);
const LIGHT_OCEAN = new THREE.Color(0.30, 0.40, 0.30);
const DARK_LAND = new THREE.Color(0.96, 0.86, 0.78);
const DARK_OCEAN = new THREE.Color(0.80, 0.72, 0.65);

function isDarkMode() {
  return document.documentElement.classList.contains("dark");
}

// --- Camera controller for morph transition ---
// Updates the OrbitControls target directly to avoid conflicts
function CameraController({
  morphing,
  controlsRef,
}: {
  morphing: boolean;
  controlsRef: React.RefObject<any>;
}) {
  const { camera } = useThree();
  const wasMorphing = useRef(false);

  useFrame(() => {
    const controls = controlsRef.current;

    if (morphing) {
      // Target camera position and lookAt
      const tx = 0, ty = 1.0, tz = 6.0;
      const lx = 0, ly = 1.0, lz = 0;

      // Lerp camera position
      camera.position.x += (tx - camera.position.x) * 0.04;
      camera.position.y += (ty - camera.position.y) * 0.04;
      camera.position.z += (tz - camera.position.z) * 0.04;

      // Explicitly set camera lookAt (overrides OrbitControls)
      camera.lookAt(
        (controls?.target.x ?? 0) + (lx - (controls?.target.x ?? 0)) * 0.04,
        (controls?.target.y ?? 0) + (ly - (controls?.target.y ?? 0)) * 0.04,
        lz
      );

      // Update OrbitControls target to match
      if (controls) {
        controls.target.x += (lx - controls.target.x) * 0.04;
        controls.target.y += (ly - controls.target.y) * 0.04;
        controls.target.z += (lz - controls.target.z) * 0.04;
      }

      camera.updateMatrixWorld();
      wasMorphing.current = true;
    } else if (wasMorphing.current) {
      // Smoothly return camera and target to globe view
      camera.position.x += (0 - camera.position.x) * 0.04;
      camera.position.y += (0 - camera.position.y) * 0.04;
      camera.position.z += (5 - camera.position.z) * 0.04;

      // Smoothly return lookAt to origin
      camera.lookAt(
        (controls?.target.x ?? 0) * 0.96,
        (controls?.target.y ?? 0) * 0.96,
        0
      );
      camera.updateMatrixWorld();

      if (controls) {
        controls.target.x *= 0.96;
        controls.target.y *= 0.96;
        controls.target.z *= 0.96;

        if (controls.target.length() < 0.05 && Math.abs(camera.position.z - 5) < 0.1) {
          controls.target.set(0, 0, 0);
          wasMorphing.current = false;
        }
      }
    }
  });

  return null;
}

function GlobeParticles({ morphing }: { morphing: boolean }) {
  const pointsRef = useRef<THREE.Points>(null!);
  const mouseRef = useRef({ x: 10, y: 10 });
  const smoothMouse = useRef({ x: 10, y: 10 });
  const { gl, camera } = useThree();

  // Easter egg state refs
  const explodeRef = useRef({ active: false, value: 0, startTime: -1 });
  const scatterRef = useRef({ value: 0, targetValue: 0, dir: new THREE.Vector3() });
  const prevCamPos = useRef(new THREE.Vector3());
  const prevCamAngle = useRef(0);
  const konamiIdx = useRef(0);

  // Morph state
  const morphRef = useRef({ value: 0, target: 0 });

  // Update morph target when prop changes
  useEffect(() => {
    morphRef.current.target = morphing ? 1 : 0;
  }, [morphing]);

  const { geometry, material } = useMemo(() => {
    const landMask = createLandMask(1024, 512);
    const { positions, sizes, opacities, isLandArr } =
      generateGlobeParticles(landMask);

    const particleCount = sizes.length;

    // Generate skyline target positions
    const skylineMask = createSkylineMask(512, 256);
    const skylinePositions = generateSkylinePositions(particleCount, skylineMask);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute("aOpacity", new THREE.BufferAttribute(opacities, 1));
    geo.setAttribute("aIsLand", new THREE.BufferAttribute(isLandArr, 1));
    geo.setAttribute("aSkylinePos", new THREE.BufferAttribute(skylinePositions, 3));

    const dark = isDarkMode();
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: {
          value: Math.min(window.devicePixelRatio, 2),
        },
        uMouse: { value: new THREE.Vector2(10, 10) },
        uLandColor: { value: (dark ? DARK_LAND : LIGHT_LAND).clone() },
        uOceanColor: { value: (dark ? DARK_OCEAN : LIGHT_OCEAN).clone() },
        uExplode: { value: 0 },
        uScatter: { value: 0 },
        uScatterDir: { value: new THREE.Vector3(0, 0, 0) },
        uMorph: { value: 0 },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    return { geometry: geo, material: mat };
  }, []);

  // Watch for theme changes via MutationObserver
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const dark = isDarkMode();
      material.uniforms.uLandColor.value.copy(dark ? DARK_LAND : LIGHT_LAND);
      material.uniforms.uOceanColor.value.copy(dark ? DARK_OCEAN : LIGHT_OCEAN);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, [material]);

  // --- Easter egg 1: Konami code listener ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable during morph
      if (morphRef.current.value > 0.1) return;

      const expected = KONAMI_SEQUENCE[konamiIdx.current];
      if (e.key.toLowerCase() === expected.toLowerCase()) {
        konamiIdx.current++;
        if (konamiIdx.current === KONAMI_SEQUENCE.length) {
          // Trigger explosion!
          konamiIdx.current = 0;
          if (!explodeRef.current.active) {
            explodeRef.current.active = true;
            explodeRef.current.startTime = -1; // will be set in useFrame
          }
        }
      } else {
        konamiIdx.current = 0;
        // Check if the failed key is the start of the sequence
        if (e.key.toLowerCase() === KONAMI_SEQUENCE[0].toLowerCase()) {
          konamiIdx.current = 1;
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Mouse listeners
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const rect = gl.domElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    mouseRef.current.x = x;
    mouseRef.current.y = y;
  }, [gl]);

  const handleMouseLeave = useCallback(() => {
    mouseRef.current.x = 10;
    mouseRef.current.y = 10;
  }, []);

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [gl, handleMouseMove, handleMouseLeave]);

  // Initialize camera tracking
  useEffect(() => {
    prevCamPos.current.copy(camera.position);
    prevCamAngle.current = Math.atan2(camera.position.x, camera.position.z);
  }, [camera]);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    material.uniforms.uTime.value = time;

    // --- Morph animation ---
    const morph = morphRef.current;
    const morphSpeed = 0.025; // smooth lerp toward target
    morph.value += (morph.target - morph.value) * morphSpeed;
    // Snap to target when very close
    if (Math.abs(morph.value - morph.target) < 0.001) morph.value = morph.target;
    material.uniforms.uMorph.value = morph.value;

    // Reset mesh rotation when morphing to skyline (skyline should be flat, not rotated)
    if (morph.value > 0.01 && pointsRef.current) {
      pointsRef.current.rotation.y *= 0.95; // smoothly unwind any rotation
      pointsRef.current.rotation.x *= 0.95;
    }

    // Smooth mouse
    const lerpFactor = 0.08;
    smoothMouse.current.x += (mouseRef.current.x - smoothMouse.current.x) * lerpFactor;
    smoothMouse.current.y += (mouseRef.current.y - smoothMouse.current.y) * lerpFactor;
    material.uniforms.uMouse.value.set(
      smoothMouse.current.x,
      smoothMouse.current.y
    );

    // --- Easter egg 1: Konami explosion animation ---
    const ex = explodeRef.current;
    if (ex.active) {
      if (ex.startTime < 0) ex.startTime = time;
      const elapsed = time - ex.startTime;

      if (elapsed < 0.5) {
        // Explode outward (ease out)
        ex.value = Math.min(1, elapsed / 0.5);
        ex.value = 1 - Math.pow(1 - ex.value, 3); // ease out cubic
      } else if (elapsed < 1.0) {
        // Hold
        ex.value = 1;
      } else if (elapsed < 3.0) {
        // Reform (ease in-out)
        const t = (elapsed - 1.0) / 2.0;
        ex.value = 1 - (t * t * (3 - 2 * t)); // smoothstep
      } else {
        ex.value = 0;
        ex.active = false;
        ex.startTime = -1;
      }
    }
    material.uniforms.uExplode.value = ex.value;

    // --- Easter egg 2: Speed spin scatter ---
    const camPos = state.camera.position;
    const currentAngle = Math.atan2(camPos.x, camPos.z);
    let angleDelta = currentAngle - prevCamAngle.current;
    // Wrap around
    if (angleDelta > Math.PI) angleDelta -= 2 * Math.PI;
    if (angleDelta < -Math.PI) angleDelta += 2 * Math.PI;
    const angularSpeed = Math.abs(angleDelta) / Math.max(delta, 0.001);

    const sc = scatterRef.current;
    const threshold = 1.5; // radians per second
    if (angularSpeed > threshold && morph.value < 0.1) {
      sc.targetValue = Math.min((angularSpeed - threshold) * 0.3, 1.5);
      // Compute scatter direction (tangent to rotation)
      const sign = angleDelta > 0 ? 1 : -1;
      sc.dir.set(
        sign * Math.cos(currentAngle),
        0,
        -sign * Math.sin(currentAngle)
      ).normalize();
    } else {
      sc.targetValue = 0;
    }
    sc.value += (sc.targetValue - sc.value) * 0.06;
    if (sc.value < 0.001) sc.value = 0;
    material.uniforms.uScatter.value = sc.value;
    material.uniforms.uScatterDir.value.copy(sc.dir);

    prevCamAngle.current = currentAngle;
    prevCamPos.current.copy(camPos);

  });

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}

interface ParticleFieldProps {
  morphing?: boolean;
}

function SceneContents({ morphing }: { morphing: boolean }) {
  const controlsRef = useRef<any>(null);

  return (
    <>
      <GlobeParticles morphing={morphing} />
      <OrbitControls
        ref={controlsRef}
        enabled={!morphing}
        enablePan={false}
        enableZoom={!morphing}
        enableRotate={!morphing}
        enableDamping={true}
        dampingFactor={0.05}
        rotateSpeed={0.5}
        zoomSpeed={0.5}
        minDistance={1.5}
        maxDistance={12}
        autoRotate={!morphing}
        autoRotateSpeed={0.4}
      />
      <CameraController morphing={morphing} controlsRef={controlsRef} />
    </>
  );
}

export default function ParticleField({
  morphing = false,
}: ParticleFieldProps) {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <SceneContents morphing={morphing} />
      </Canvas>
    </div>
  );
}
