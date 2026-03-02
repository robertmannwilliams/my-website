"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import ThemeToggle from "@/components/ThemeToggle";

const ParticleField = dynamic(() => import("@/components/ParticleField"), {
  ssr: false,
});

export default function Page() {
  const [morphing, setMorphing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  const handleEnter = () => {
    setMorphing(true);
  };

  const handleBack = () => {
    setMorphing(false);
  };

  // Entrance animation style
  const entranceStyle = {
    opacity: 0,
    transform: "translateY(20px)",
    transition: "opacity 1s ease-out, transform 1s ease-out",
    ...(mounted ? { opacity: 1, transform: "translateY(0)" } : {}),
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      {/* Particle field — globe or skyline */}
      <ParticleField morphing={morphing} />

      {/* Name — animates between bottom-left (landing) and top-left (home) */}
      <div
        style={{
          position: "fixed",
          zIndex: 10,
          top: morphing ? "1.5rem" : "calc(100vh - 6rem)",
          left: morphing ? "2.5rem" : "3rem",
          transition: mounted
            ? "top 1.2s cubic-bezier(0.4, 0, 0.2, 1), left 1.2s cubic-bezier(0.4, 0, 0.2, 1), font-size 1.2s cubic-bezier(0.4, 0, 0.2, 1)"
            : "opacity 1s ease-out, transform 1s ease-out",
          cursor: morphing ? "pointer" : "default",
          ...(!mounted
            ? { opacity: 0, transform: "translateY(20px)" }
            : { opacity: 1, transform: "translateY(0)" }),
        }}
        onClick={morphing ? handleBack : undefined}
      >
        <h1
          style={{
            fontSize: morphing ? "0.875rem" : "2.5rem",
            transition: "font-size 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
            textShadow: morphing
              ? "none"
              : "0 0 20px var(--background), 0 0 40px var(--background), 0 0 60px var(--background)",
          }}
          className="font-extrabold tracking-tight leading-[0.95]"
        >
          Robert{morphing ? " " : <br />}Williams
        </h1>
      </div>

      {/* Enter button — fades out when morphing */}
      <div
        style={{
          position: "fixed",
          bottom: "3rem",
          right: "3rem",
          zIndex: 10,
          opacity: morphing ? 0 : 1,
          pointerEvents: morphing ? "none" : "auto",
          transition: "opacity 0.6s ease",
          ...entranceStyle,
          transition: "opacity 0.6s ease",
          ...(mounted && !morphing
            ? { opacity: 1, transform: "translateY(0)" }
            : {}),
          ...(morphing ? { opacity: 0 } : {}),
        }}
      >
        <button
          onClick={handleEnter}
          className="text-xs tracking-[0.25em] uppercase opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
        >
          Enter
        </button>
      </div>

      {/* Content — left side, visible when morphed */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "8%",
          transform: "translateY(-50%)",
          maxWidth: "38%",
          zIndex: 10,
          opacity: morphing ? 1 : 0,
          pointerEvents: morphing ? "auto" : "none",
          transition: morphing
            ? "opacity 1s ease 1s"
            : "opacity 0.5s ease",
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
