"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { directorySections } from "@/content/site-sections";
import { formatWritingDate, getPublishedWritings } from "@/content/writings";

const ParticleField = dynamic(() => import("@/components/ParticleField"), {
  ssr: false,
});

const latestWriting = getPublishedWritings()[0];

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
      const newVal = current + (target - current) * 0.18;

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
          left: "clamp(1rem, 8vw, 8%)",
          right: "1rem",
          transform: "translateY(-50%)",
          maxWidth: "38rem",
          maxHeight: "calc(100dvh - 8rem)",
          zIndex: 10,
          opacity: contentOpacity,
          pointerEvents: contentOpacity > 0.5 ? "auto" : "none",
          overflowY: "auto",
          paddingRight: "0.75rem",
        }}
      >
        <div className="home-directory">
          <p className="section-shell__eyebrow">Directory</p>
          <p className="home-lede">
            The landing page now points into separate rooms. Monitor stays live,
            writings are filed chronologically, and the rest of the site can
            expand without collapsing into one long block.
          </p>

          <div className="home-directory__grid">
            {directorySections.map((section, index) => (
              <Link className="directory-card" href={section.href} key={section.href}>
                <div className="directory-card__top">
                  <span className="directory-card__count">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="directory-card__status">{section.status}</span>
                </div>

                <p className="directory-card__eyebrow">{section.eyebrow}</p>
                <h2 className="directory-card__title">{section.title}</h2>
                <p className="directory-card__body">{section.description}</p>
              </Link>
            ))}
          </div>

          <p className="home-note">
            Writings are organized as a time series: essays, dispatches, and
            notebooks all live in one dated archive so the sequence stays
            visible.
          </p>

          {latestWriting ? (
            <Link className="home-latest" href={`/writings/${latestWriting.slug}`}>
              <span className="home-latest__eyebrow">Latest filing</span>
              <strong>{latestWriting.title}</strong>
              <span>
                {formatWritingDate(latestWriting.publishedAt)} ·{" "}
                {latestWriting.format}
              </span>
            </Link>
          ) : null}
        </div>
      </div>

      <ThemeToggle />
    </div>
  );
}
