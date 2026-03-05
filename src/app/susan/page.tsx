"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { Pacifico } from "next/font/google";

const pacifico = Pacifico({ weight: "400", subsets: ["latin"] });

// ═══════════════════════════════════
//  Floating Hearts
// ═══════════════════════════════════

const HEART_COUNT = 18;

function FloatingHearts() {
  const [hearts, setHearts] = useState<
    { id: number; left: number; size: number; duration: number; delay: number; opacity: number; color: string }[]
  >([]);

  useEffect(() => {
    setHearts(
      Array.from({ length: HEART_COUNT }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 14 + Math.random() * 22,
        duration: 8 + Math.random() * 10,
        delay: Math.random() * 18,
        opacity: 0.2 + Math.random() * 0.45,
        color: Math.random() > 0.5 ? "#FF69B4" : "#FF1493",
      }))
    );
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      {hearts.map((h) => (
        <div
          key={h.id}
          style={
            {
              position: "absolute",
              left: `${h.left}%`,
              bottom: "-40px",
              fontSize: `${h.size}px`,
              color: h.color,
              "--opacity": h.opacity,
              animation: `heartFloat ${h.duration}s linear -${h.delay}s infinite`,
              filter: "drop-shadow(0 0 6px rgba(255,105,180,0.3))",
            } as React.CSSProperties
          }
        >
          ♥
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════
//  Particle Portrait
// ═══════════════════════════════════

function Portrait() {
  const pointsRef = useRef<THREE.Points>(null!);

  const shaderMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: {
            value:
              typeof window !== "undefined"
                ? Math.min(window.devicePixelRatio, 2)
                : 1,
          },
        },
        vertexShader: /* glsl */ `
          uniform float uTime;
          uniform float uPixelRatio;
          attribute float aSize;
          attribute vec3 aColor;
          varying vec3 vColor;
          varying float vAlpha;

          void main() {
            vColor = aColor;

            vec3 pos = position;
            float seed = pos.x * 11.3 + pos.y * 7.7;
            pos.x += sin(uTime * 0.4 + seed) * 0.012;
            pos.y += cos(uTime * 0.3 + seed * 0.7) * 0.012;
            pos.z += sin(uTime * 0.35 + seed * 0.5) * 0.016;

            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_PointSize = aSize * uPixelRatio * (2.5 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;

            vAlpha = 0.7 + 0.2 * sin(uTime * 0.25 + seed * 0.15);
          }
        `,
        fragmentShader: /* glsl */ `
          varying vec3 vColor;
          varying float vAlpha;

          void main() {
            float d = length(gl_PointCoord - vec2(0.5));
            if (d > 0.5) discard;
            float a = smoothstep(0.5, 0.15, d) * vAlpha;
            gl_FragColor = vec4(vColor, a);
          }
        `,
        transparent: true,
        depthWrite: false,
      }),
    []
  );

  useEffect(() => {
    async function processImage() {
      try {
        const res = await fetch("/susan.jpeg");
        const blob = await res.blob();
        const bitmap = await createImageBitmap(blob);

        const canvas = document.createElement("canvas");
        const sampleW = 220;
        const sampleH = Math.round(
          sampleW * (bitmap.height / bitmap.width)
        );
        canvas.width = sampleW;
        canvas.height = sampleH;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(bitmap, 0, 0, sampleW, sampleH);
        const { data } = ctx.getImageData(0, 0, sampleW, sampleH);

        const positions: number[] = [];
        const colors: number[] = [];
        const sizes: number[] = [];

        const scaleY = 4.2;
        const scaleX = scaleY * (sampleW / sampleH);

        for (let y = 0; y < sampleH; y++) {
          for (let x = 0; x < sampleW; x++) {
            const i = (y * sampleW + x) * 4;
            const brightness =
              (data[i] * 0.299 +
                data[i + 1] * 0.587 +
                data[i + 2] * 0.114) /
              255;

            if (brightness > 0.82) continue;

            const darkness = 1 - brightness;
            if (Math.random() > Math.pow(darkness, 1.3) * 0.45) continue;

            // Random offset to break the grid pattern
            const ox = (Math.random() - 0.5) * 0.55;
            const oy = (Math.random() - 0.5) * 0.55;

            positions.push(
              ((x + ox) / sampleW - 0.5) * scaleX,
              -((y + oy) / sampleH - 0.5) * scaleY,
              (Math.random() - 0.5) * 0.18
            );

            // Deeper pink-to-rose gradient for contrast against pink bg
            const t = darkness;
            colors.push(0.65 + t * 0.15, 0.08 + t * 0.12, 0.25 + t * 0.15);
            sizes.push(1.2 + darkness * 2.5);
          }
        }

        if (pointsRef.current) {
          const geo = pointsRef.current.geometry;
          geo.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(positions, 3)
          );
          geo.setAttribute(
            "aColor",
            new THREE.Float32BufferAttribute(colors, 3)
          );
          geo.setAttribute(
            "aSize",
            new THREE.Float32BufferAttribute(sizes, 1)
          );
        }
      } catch (err) {
        console.error("Failed to load portrait image:", err);
      }
    }

    processImage();
  }, []);

  useFrame(({ clock }) => {
    shaderMaterial.uniforms.uTime.value = clock.getElapsedTime();
    if (pointsRef.current) {
      pointsRef.current.rotation.y =
        Math.sin(clock.getElapsedTime() * 0.15) * 0.04;
    }
  });

  return (
    <points ref={pointsRef} material={shaderMaterial}>
      <bufferGeometry />
    </points>
  );
}

// ═══════════════════════════════════
//  Page
// ═══════════════════════════════════

export default function SusanPage() {
  return (
    <div
      style={{
        background: "#FFE4EC",
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes heartFloat {
          0% {
            transform: translateY(0) translateX(0px) rotate(0deg);
            opacity: 0;
          }
          8% {
            opacity: var(--opacity, 0.4);
          }
          25% {
            transform: translateY(-30vh) translateX(15px) rotate(90deg);
          }
          50% {
            transform: translateY(-60vh) translateX(-12px) rotate(180deg);
          }
          75% {
            transform: translateY(-90vh) translateX(18px) rotate(270deg);
          }
          92% {
            opacity: var(--opacity, 0.4);
          }
          100% {
            transform: translateY(-120vh) translateX(-5px) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>

      <FloatingHearts />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
          paddingBottom: "2rem",
        }}
      >
        <div style={{ width: "100%", maxWidth: "550px", height: "65vh" }}>
          <Canvas
            camera={{ position: [0, 0, 4.5], fov: 50 }}
            style={{ background: "transparent" }}
            gl={{ alpha: true }}
          >
            <Portrait />
          </Canvas>
        </div>

        <h1
          className={pacifico.className}
          style={{
            color: "#CC3366",
            fontSize: "3rem",
            margin: "0.5rem 0 0.3rem",
            textShadow: "0 2px 12px rgba(204,51,102,0.15)",
            fontWeight: 400,
          }}
        >
          Susan Yun
        </h1>
        <p
          style={{
            color: "#CC3366",
            fontSize: "1.15rem",
            margin: 0,
            letterSpacing: "0.2em",
            opacity: 0.65,
            fontWeight: 300,
          }}
        >
          Fan Page Est. 2026
        </p>
      </div>
    </div>
  );
}
