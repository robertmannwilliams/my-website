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

    // Scale to globe radius, but bias toward outer region so interior
    // is sparser and surface is denser (cube root for uniform volume,
    // but we skip that to naturally cluster near center, then add some)
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

// --- Shaders ---

const vertexShader = `
  attribute float aSize;
  attribute float aOpacity;
  attribute float aIsLand;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform vec2 uMouse;
  varying float vOpacity;
  varying float vIsLand;

  void main() {
    vec3 pos = position;

    // Subtle shimmer
    float shimmer = sin(uTime * 0.5 + pos.x * 10.0 + pos.y * 7.0 + pos.z * 13.0);

    // Project to screen space for mouse push
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    vec4 projected = projectionMatrix * mv;
    vec2 screenCoord = projected.xy / projected.w;

    // Mouse push (only when mouse is on screen)
    vec3 pushOffset = vec3(0.0);
    if (length(uMouse) < 3.0) {
      vec2 toMouse = screenCoord - uMouse;
      float mouseDist = length(toMouse);
      float pushStrength = smoothstep(0.5, 0.0, mouseDist) * 0.10;
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

// --- React components ---

// Theme color definitions
const LIGHT_LAND = new THREE.Color(0.08, 0.07, 0.06);
const LIGHT_OCEAN = new THREE.Color(0.18, 0.16, 0.14);
const DARK_LAND = new THREE.Color(0.96, 0.86, 0.78);
const DARK_OCEAN = new THREE.Color(0.80, 0.72, 0.65);

function isDarkMode() {
  return document.documentElement.classList.contains("dark");
}

function GlobeParticles() {
  const pointsRef = useRef<THREE.Points>(null!);
  const mouseRef = useRef({ x: 10, y: 10 });
  const smoothMouse = useRef({ x: 10, y: 10 });
  const { gl } = useThree();

  const { geometry, material } = useMemo(() => {
    const mask = createLandMask(1024, 512);
    const { positions, sizes, opacities, isLandArr } =
      generateGlobeParticles(mask);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute("aOpacity", new THREE.BufferAttribute(opacities, 1));
    geo.setAttribute("aIsLand", new THREE.BufferAttribute(isLandArr, 1));

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

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.getElapsedTime();

    const lerp = 0.08;
    smoothMouse.current.x += (mouseRef.current.x - smoothMouse.current.x) * lerp;
    smoothMouse.current.y += (mouseRef.current.y - smoothMouse.current.y) * lerp;
    material.uniforms.uMouse.value.set(
      smoothMouse.current.x,
      smoothMouse.current.y
    );
  });

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}

export default function ParticleField() {
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
        camera={{ position: [0, 0, 7], fov: 50 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <GlobeParticles />
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          enableRotate={true}
          enableDamping={true}
          dampingFactor={0.05}
          rotateSpeed={0.5}
          zoomSpeed={0.5}
          minDistance={1.5}
          maxDistance={12}
          autoRotate={true}
          autoRotateSpeed={0.4}
        />
      </Canvas>
    </div>
  );
}
