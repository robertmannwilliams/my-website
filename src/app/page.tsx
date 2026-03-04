"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import ThemeToggle from "@/components/ThemeToggle";

const ParticleField = dynamic(() => import("@/components/ParticleField"), {
  ssr: false,
});

// Attempt at smoothstep easing
function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

export default function Page() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [mounted, setMounted] = useState(false);
  const targetProgressRef = useRef(0);
  const scrollProgressRef = useRef(0);
  const rafRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  // Smooth animation loop — lerps scrollProgress toward target
  useEffect(() => {
    const animate = () => {
      const current = scrollProgressRef.current;
      const target = targetProgressRef.current;
      const newVal = current + (target - current) * 0.1;

      if (Math.abs(newVal - target) < 0.001) {
        scrollProgressRef.current = target;
      } else {
        scrollProgressRef.current = newVal;
      }

      // Only trigger re-render when value meaningfully changes
      if (Math.abs(scrollProgressRef.current - scrollProgress) > 0.002) {
        setScrollProgress(scrollProgressRef.current);
      }

      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [scrollProgress]);

  // Wheel event listener (must be non-passive to preventDefault)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const sensitivity = 0.0008;
      targetProgressRef.current = Math.max(
        0,
        Math.min(1, targetProgressRef.current + e.deltaY * sensitivity)
      );
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  // Touch event handlers for mobile
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let touchStartY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const deltaY = touchStartY - e.touches[0].clientY;
      touchStartY = e.touches[0].clientY;
      targetProgressRef.current = Math.max(
        0,
        Math.min(1, targetProgressRef.current + deltaY * 0.003)
      );
    };

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  // Reset to globe view
  const handleBack = useCallback(() => {
    targetProgressRef.current = 0;
  }, []);

  // Derive UI values from scrollProgress
  const nameProgress = Math.max(0, Math.min(1, (scrollProgress - 0.5) / 0.5));
  const nameEased = smoothstep(nameProgress);
  const contentOpacity = Math.max(
    0,
    Math.min(1, (scrollProgress - 0.85) / 0.15)
  );
  const scrollHintOpacity = Math.max(
    0,
    Math.min(1, 1 - scrollProgress / 0.05)
  );
  const isFullyMorphed = scrollProgress > 0.9;

  // Name interpolation
  const nameTop = nameEased === 0
    ? "calc(100dvh - 8rem)"
    : nameEased === 1
      ? "1.5rem"
      : `calc(${(1 - nameEased) * 100}dvh - ${(1 - nameEased) * 8 - nameEased * 1.5}rem)`;
  const nameLeft = `${3 - nameEased * 0.5}rem`;
  const nameFontSize = `${2.5 - nameEased * 1.625}rem`;

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      {/* Particle field — globe or skyline */}
      <ParticleField scrollProgress={scrollProgress} />

      {/* Name — animates between bottom-left (landing) and top-left (home) */}
      <div
        style={{
          position: "fixed",
          zIndex: 10,
          top: nameTop,
          left: nameLeft,
          cursor: isFullyMorphed ? "pointer" : "default",
          ...(!mounted
            ? { opacity: 0, transform: "translateY(20px)" }
            : {
                opacity: 1,
                transform: "translateY(0)",
                transition: "opacity 1s ease-out, transform 1s ease-out",
              }),
        }}
        onClick={isFullyMorphed ? handleBack : undefined}
      >
        <h1
          style={{ fontSize: nameFontSize }}
          className="font-extrabold tracking-tight leading-[0.95]"
        >
          Robert{nameEased > 0.5 ? " " : <br />}Williams
        </h1>
      </div>

      {/* Scroll hint — fades out as you start scrolling */}
      {mounted && (
        <div
          style={{
            position: "fixed",
            bottom: "3rem",
            right: "3rem",
            zIndex: 10,
            opacity: scrollHintOpacity,
            pointerEvents: "none",
            transition: "opacity 0.3s ease",
          }}
        >
          <span className="text-xs tracking-[0.25em] uppercase opacity-50">
            Scroll to explore
          </span>
        </div>
      )}

      {/* Content — left side, visible when fully morphed */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "8%",
          transform: "translateY(-50%)",
          maxWidth: "38%",
          zIndex: 10,
          opacity: contentOpacity,
          pointerEvents: contentOpacity > 0.5 ? "auto" : "none",
        }}
      >
        <p className="text-xs md:text-sm tracking-[0.25em] uppercase opacity-60 mb-6">
          Under Construction
        </p>
        <p className="text-sm md:text-base leading-relaxed mb-4">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
          ad minim veniam, quis nostrud exercitation ullamco laboris.
        </p>
        <p className="text-sm md:text-base leading-relaxed mb-4">
          Duis aute irure dolor in reprehenderit in voluptate velit esse
          cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat
          cupidatat non proident, sunt in culpa qui officia deserunt mollit.
        </p>
        <p className="text-sm md:text-base leading-relaxed">
          Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis
          suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur.
        </p>
      </div>

      <ThemeToggle />
    </div>
  );
}
